// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ISplitHubRegistry } from "./ISplitHubRegistry.sol";

/// @title CreditToken
/// @notice ERC20 token for Activity Zone credits - purchase with USDC, spend at activities
/// @dev Supports gasless operations via EIP-712 signatures from NFC chips
contract CreditToken is ERC20, EIP712 {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    /// @notice EIP-712 type for purchasing credits with USDC
    struct CreditPurchase {
        address buyer; // Chip owner (receives credits)
        uint256 usdcAmount; // USDC amount to spend
        uint256 nonce; // Replay protection
        uint256 deadline; // Signature expiration
    }

    /// @notice EIP-712 type for spending credits at activities
    struct CreditSpend {
        address spender; // Chip owner (spends credits)
        uint256 amount; // Credits to burn
        uint256 activityId; // Activity identifier
        uint256 nonce; // Replay protection
        uint256 deadline; // Signature expiration
    }

    bytes32 public constant CREDIT_PURCHASE_TYPEHASH =
        keccak256("CreditPurchase(address buyer,uint256 usdcAmount,uint256 nonce,uint256 deadline)");

    bytes32 public constant CREDIT_SPEND_TYPEHASH =
        keccak256("CreditSpend(address spender,uint256 amount,uint256 activityId,uint256 nonce,uint256 deadline)");

    /// @notice USDC token used for purchases
    IERC20 public immutable usdc;

    /// @notice Registry for chip ownership verification
    ISplitHubRegistry public immutable registry;

    /// @notice Contract owner (can withdraw USDC)
    address public owner;

    /// @notice Credit conversion rate: 1 USDC = 10 credits
    uint256 public constant CREDIT_RATE = 10;

    /// @notice Nonces for replay protection (per user)
    mapping(address user => uint256 nonce) public nonces;

    event CreditsPurchased(address indexed buyer, uint256 usdcAmount, uint256 creditAmount, address signer);
    event CreditsSpent(address indexed spender, uint256 amount, uint256 activityId, address signer);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error ExpiredSignature();
    error InvalidNonce();
    error UnauthorizedSigner();
    error NotOwner();
    error InsufficientBalance();

    constructor(address _usdc, address _registry) ERC20("Activity Credits", "CREDIT") EIP712("CreditToken", "1") {
        usdc = IERC20(_usdc);
        registry = ISplitHubRegistry(_registry);
        owner = msg.sender;
    }

    /// @notice Purchase credits with USDC (gasless via NFC signature)
    /// @dev Relayer calls this with signed authorization from NFC chip
    /// @param purchase The purchase details
    /// @param signature EIP-712 signature from authorized NFC chip
    function purchaseCredits(CreditPurchase calldata purchase, bytes calldata signature) external {
        // 1. Verify deadline
        if (block.timestamp > purchase.deadline) {
            revert ExpiredSignature();
        }

        // 2. Verify and increment nonce
        if (purchase.nonce != nonces[purchase.buyer]) {
            revert InvalidNonce();
        }
        nonces[purchase.buyer]++;

        // 3. Verify signature (chip must be registered to buyer)
        bytes32 structHash = keccak256(
            abi.encode(CREDIT_PURCHASE_TYPEHASH, purchase.buyer, purchase.usdcAmount, purchase.nonce, purchase.deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);

        if (registry.ownerOf(signer) != purchase.buyer) {
            revert UnauthorizedSigner();
        }

        // 4. Transfer USDC from buyer to this contract
        usdc.safeTransferFrom(purchase.buyer, address(this), purchase.usdcAmount);

        // 5. Mint credits to buyer
        // USDC has 6 decimals, credits have 18 decimals
        // 1 USDC (1e6) = 10 credits (10e18)
        uint256 creditAmount = (purchase.usdcAmount * CREDIT_RATE * 1e18) / 1e6;
        _mint(purchase.buyer, creditAmount);

        emit CreditsPurchased(purchase.buyer, purchase.usdcAmount, creditAmount, signer);
    }

    /// @notice Spend (burn) credits for an activity (gasless via NFC signature)
    /// @dev Relayer calls this with signed authorization from NFC chip
    /// @param spend The spend details
    /// @param signature EIP-712 signature from authorized NFC chip
    function spendCredits(CreditSpend calldata spend, bytes calldata signature) external {
        // 1. Verify deadline
        if (block.timestamp > spend.deadline) {
            revert ExpiredSignature();
        }

        // 2. Verify and increment nonce
        if (spend.nonce != nonces[spend.spender]) {
            revert InvalidNonce();
        }
        nonces[spend.spender]++;

        // 3. Verify signature (chip must be registered to spender)
        bytes32 structHash = keccak256(
            abi.encode(
                CREDIT_SPEND_TYPEHASH, spend.spender, spend.amount, spend.activityId, spend.nonce, spend.deadline
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);

        if (registry.ownerOf(signer) != spend.spender) {
            revert UnauthorizedSigner();
        }

        // 4. Check balance and burn credits
        if (balanceOf(spend.spender) < spend.amount) {
            revert InsufficientBalance();
        }
        _burn(spend.spender, spend.amount);

        emit CreditsSpent(spend.spender, spend.amount, spend.activityId, signer);
    }

    /// @notice Withdraw collected USDC (owner only)
    /// @param to Address to send USDC to
    function withdrawUSDC(address to) external {
        if (msg.sender != owner) {
            revert NotOwner();
        }
        usdc.safeTransfer(to, usdc.balanceOf(address(this)));
    }

    /// @notice Transfer ownership
    /// @param newOwner New owner address
    function transferOwnership(address newOwner) external {
        if (msg.sender != owner) {
            revert NotOwner();
        }
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    /// @notice Get the current nonce for a user
    /// @param user The user's address
    /// @return The current nonce
    function getNonce(address user) external view returns (uint256) {
        return nonces[user];
    }

    /// @notice Get the EIP-712 domain separator
    /// @return The domain separator hash
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /// @notice Helper to compute the digest for off-chain signing (purchase)
    /// @param purchase The purchase authorization to sign
    /// @return The EIP-712 typed data hash to sign
    function getPurchaseDigest(CreditPurchase calldata purchase) external view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(CREDIT_PURCHASE_TYPEHASH, purchase.buyer, purchase.usdcAmount, purchase.nonce, purchase.deadline)
        );
        return _hashTypedDataV4(structHash);
    }

    /// @notice Helper to compute the digest for off-chain signing (spend)
    /// @param spend The spend authorization to sign
    /// @return The EIP-712 typed data hash to sign
    function getSpendDigest(CreditSpend calldata spend) external view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                CREDIT_SPEND_TYPEHASH, spend.spender, spend.amount, spend.activityId, spend.nonce, spend.deadline
            )
        );
        return _hashTypedDataV4(structHash);
    }

    /// @notice Override decimals to match standard ERC20
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
