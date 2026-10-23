// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ISplitHubRegistry } from "./ISplitHubRegistry.sol";

/// @title VenueCredits
/// @notice Closed-loop stored value for venues. Guests top up a venue's credits with USDC and spend them at
///         that venue's stalls, each step authorized by a tap of their NFC chip.
/// @dev Credits are scoped to one venue and cannot be transferred: they only leave a guest's balance by being
///      spent at the venue or refunded by the venue owner. The USDC from top-ups is held per venue; the owner
///      can withdraw what guests have spent, while unspent credits stay backed so they can always be refunded.
///      Anyone (the device wallet on the terminal) may submit a chip-signed authorization.
contract VenueCredits is EIP712 {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    struct CreditPurchase {
        uint256 venueId;
        address buyer; // Chip owner; pays USDC and receives credits
        uint256 usdcAmount;
        uint256 nonce;
        uint256 deadline;
    }

    struct CreditSpend {
        uint256 venueId;
        address spender; // Chip owner; credits are taken from this balance
        uint256 amount; // Credits, in credit base units (6 decimals)
        uint256 stallId; // Venue stall the credits were spent at (app-level id)
        uint256 nonce;
        uint256 deadline;
    }

    struct Venue {
        address owner;
        bool open;
        uint256 usdcBalance; // USDC collected from top-ups and not yet withdrawn or refunded
        uint256 creditsOutstanding; // Credits held by guests
    }

    bytes32 public constant CREDIT_PURCHASE_TYPEHASH =
        keccak256("CreditPurchase(uint256 venueId,address buyer,uint256 usdcAmount,uint256 nonce,uint256 deadline)");

    bytes32 public constant CREDIT_SPEND_TYPEHASH = keccak256(
        "CreditSpend(uint256 venueId,address spender,uint256 amount,uint256 stallId,uint256 nonce,uint256 deadline)"
    );

    /// @notice 1 USDC buys 10 credits. Credits use the same 6 decimals as USDC.
    uint256 public constant CREDITS_PER_USDC = 10;

    IERC20 public immutable usdc;
    ISplitHubRegistry public immutable registry;

    uint256 public venueCount;
    mapping(uint256 venueId => Venue) public venues;
    mapping(uint256 venueId => mapping(address guest => uint256 credits)) public creditsOf;
    /// @notice Per-guest nonce shared by purchases and spends
    mapping(address guest => uint256 nonce) public nonces;

    event VenueCreated(uint256 indexed venueId, address indexed owner);
    event VenueOpenChanged(uint256 indexed venueId, bool open);
    event VenueOwnershipTransferred(uint256 indexed venueId, address indexed previousOwner, address indexed newOwner);
    event CreditsPurchased(
        uint256 indexed venueId, address indexed buyer, uint256 usdcAmount, uint256 credits, address signer
    );
    event CreditsSpent(
        uint256 indexed venueId, address indexed spender, uint256 amount, uint256 indexed stallId, address signer
    );
    event CreditsRefunded(uint256 indexed venueId, address indexed guest, uint256 credits, uint256 usdcAmount);
    event Withdrawn(uint256 indexed venueId, address indexed to, uint256 usdcAmount);

    error UnknownVenue();
    error VenueClosed();
    error NotVenueOwner();
    error ExpiredSignature();
    error InvalidNonce();
    error UnauthorizedSigner();
    error InsufficientCredits();
    error ZeroAmount();
    error ZeroAddress();

    constructor(address _usdc, address _registry) EIP712("VenueCredits", "1") {
        usdc = IERC20(_usdc);
        registry = ISplitHubRegistry(_registry);
    }

    modifier onlyVenueOwner(uint256 venueId) {
        if (venues[venueId].owner == address(0)) revert UnknownVenue();
        if (venues[venueId].owner != msg.sender) revert NotVenueOwner();
        _;
    }

    /// @notice Register a venue owned by the caller. Venues start open.
    function createVenue() external returns (uint256 venueId) {
        venueId = ++venueCount;
        venues[venueId] = Venue({ owner: msg.sender, open: true, usdcBalance: 0, creditsOutstanding: 0 });
        emit VenueCreated(venueId, msg.sender);
    }

    /// @notice Open or close a venue. A closed venue accepts no top-ups or spends; refunds still work.
    function setVenueOpen(uint256 venueId, bool open) external onlyVenueOwner(venueId) {
        venues[venueId].open = open;
        emit VenueOpenChanged(venueId, open);
    }

    function transferVenueOwnership(uint256 venueId, address newOwner) external onlyVenueOwner(venueId) {
        if (newOwner == address(0)) revert ZeroAddress();
        emit VenueOwnershipTransferred(venueId, venues[venueId].owner, newOwner);
        venues[venueId].owner = newOwner;
    }

    /// @notice Top up a guest's credits at a venue; USDC is pulled from the guest (approved during onboarding).
    function purchaseCredits(CreditPurchase calldata purchase, bytes calldata signature) external {
        Venue storage venue = _openVenue(purchase.venueId);
        if (purchase.usdcAmount == 0) revert ZeroAmount();
        _useNonce(purchase.buyer, purchase.nonce, purchase.deadline);

        address signer = _hashTypedDataV4(_purchaseStructHash(purchase)).recover(signature);
        if (registry.ownerOf(signer) != purchase.buyer) revert UnauthorizedSigner();

        uint256 credits = purchase.usdcAmount * CREDITS_PER_USDC;
        venue.usdcBalance += purchase.usdcAmount;
        venue.creditsOutstanding += credits;
        creditsOf[purchase.venueId][purchase.buyer] += credits;

        usdc.safeTransferFrom(purchase.buyer, address(this), purchase.usdcAmount);

        emit CreditsPurchased(purchase.venueId, purchase.buyer, purchase.usdcAmount, credits, signer);
    }

    /// @notice Spend a guest's credits at one of the venue's stalls.
    function spendCredits(CreditSpend calldata spend, bytes calldata signature) external {
        Venue storage venue = _openVenue(spend.venueId);
        if (spend.amount == 0) revert ZeroAmount();
        _useNonce(spend.spender, spend.nonce, spend.deadline);

        address signer = _hashTypedDataV4(_spendStructHash(spend)).recover(signature);
        if (registry.ownerOf(signer) != spend.spender) revert UnauthorizedSigner();

        uint256 balance = creditsOf[spend.venueId][spend.spender];
        if (balance < spend.amount) revert InsufficientCredits();
        creditsOf[spend.venueId][spend.spender] = balance - spend.amount;
        venue.creditsOutstanding -= spend.amount;

        emit CreditsSpent(spend.venueId, spend.spender, spend.amount, spend.stallId, signer);
    }

    /// @notice Refund all of a guest's unspent credits at the venue, in USDC (owner only).
    function refundCredits(uint256 venueId, address guest) external onlyVenueOwner(venueId) {
        uint256 credits = creditsOf[venueId][guest];
        if (credits == 0) revert ZeroAmount();
        uint256 usdcAmount = credits / CREDITS_PER_USDC;

        Venue storage venue = venues[venueId];
        creditsOf[venueId][guest] = 0;
        venue.creditsOutstanding -= credits;
        venue.usdcBalance -= usdcAmount;

        usdc.safeTransfer(guest, usdcAmount);
        emit CreditsRefunded(venueId, guest, credits, usdcAmount);
    }

    /// @notice Withdraw the USDC guests have spent at the venue (owner only).
    function withdraw(uint256 venueId, address to) external onlyVenueOwner(venueId) {
        if (to == address(0)) revert ZeroAddress();
        uint256 amount = withdrawable(venueId);
        if (amount == 0) revert ZeroAmount();
        venues[venueId].usdcBalance -= amount;

        usdc.safeTransfer(to, amount);
        emit Withdrawn(venueId, to, amount);
    }

    /// @notice USDC the owner can withdraw: everything except the backing for guests' unspent credits.
    function withdrawable(uint256 venueId) public view returns (uint256) {
        Venue storage venue = venues[venueId];
        uint256 backing = (venue.creditsOutstanding + CREDITS_PER_USDC - 1) / CREDITS_PER_USDC;
        return venue.usdcBalance > backing ? venue.usdcBalance - backing : 0;
    }

    function getNonce(address guest) external view returns (uint256) {
        return nonces[guest];
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function getPurchaseDigest(CreditPurchase calldata purchase) external view returns (bytes32) {
        return _hashTypedDataV4(_purchaseStructHash(purchase));
    }

    function getSpendDigest(CreditSpend calldata spend) external view returns (bytes32) {
        return _hashTypedDataV4(_spendStructHash(spend));
    }

    function _openVenue(uint256 venueId) private view returns (Venue storage venue) {
        venue = venues[venueId];
        if (venue.owner == address(0)) revert UnknownVenue();
        if (!venue.open) revert VenueClosed();
    }

    function _useNonce(address guest, uint256 nonce, uint256 deadline) private {
        if (block.timestamp > deadline) revert ExpiredSignature();
        if (nonce != nonces[guest]) revert InvalidNonce();
        nonces[guest]++;
    }

    function _purchaseStructHash(CreditPurchase calldata purchase) private pure returns (bytes32) {
        return keccak256(
            abi.encode(
                CREDIT_PURCHASE_TYPEHASH,
                purchase.venueId,
                purchase.buyer,
                purchase.usdcAmount,
                purchase.nonce,
                purchase.deadline
            )
        );
    }

    function _spendStructHash(CreditSpend calldata spend) private pure returns (bytes32) {
        return keccak256(
            abi.encode(
                CREDIT_SPEND_TYPEHASH,
                spend.venueId,
                spend.spender,
                spend.amount,
                spend.stallId,
                spend.nonce,
                spend.deadline
            )
        );
    }
}
