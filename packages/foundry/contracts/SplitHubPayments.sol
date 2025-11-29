// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ISplitHubRegistry } from "./ISplitHubRegistry.sol";

/// @title SplitHubPayments
/// @notice Gasless ERC-20 payments via EIP-712 signatures
/// @dev Allows authorized signers (e.g., NFC chips) to authorize payments on behalf of payers
contract SplitHubPayments is EIP712 {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    struct PaymentAuth {
        address payer;      // Token owner (funds come from here)
        address recipient;  // Payment receiver
        address token;      // ERC20 token address
        uint256 amount;     // Amount to transfer
        uint256 nonce;      // Replay protection (auto-increment per payer)
        uint256 deadline;   // Signature expiration timestamp
    }

    bytes32 public constant PAYMENT_AUTH_TYPEHASH = keccak256(
        "PaymentAuth(address payer,address recipient,address token,uint256 amount,uint256 nonce,uint256 deadline)"
    );

    /// @notice Reference to the SplitHubRegistry for chip ownership verification
    ISplitHubRegistry public immutable registry;

    /// @notice Nonce for each payer (increments with each payment)
    mapping(address payer => uint256 nonce) public nonces;

    event PaymentExecuted(
        address indexed payer,
        address indexed recipient,
        address indexed token,
        uint256 amount,
        address signer,
        uint256 nonce
    );

    error InvalidSignature();
    error UnauthorizedSigner();
    error ExpiredSignature();
    error InvalidNonce();

    constructor(address _registry) EIP712("SplitHubPayments", "1") {
        registry = ISplitHubRegistry(_registry);
    }

    /// @notice Execute a payment using a signed authorization
    /// @dev Can be called by anyone (relayer). Transfers tokens from payer to recipient.
    /// @param auth The payment authorization details
    /// @param signature EIP-712 signature from an authorized signer
    function executePayment(PaymentAuth calldata auth, bytes calldata signature) external {
        // Check deadline
        if (block.timestamp > auth.deadline) {
            revert ExpiredSignature();
        }

        // Check and increment nonce
        if (auth.nonce != nonces[auth.payer]) {
            revert InvalidNonce();
        }
        nonces[auth.payer]++;

        // Verify signature
        bytes32 structHash = keccak256(abi.encode(
            PAYMENT_AUTH_TYPEHASH,
            auth.payer,
            auth.recipient,
            auth.token,
            auth.amount,
            auth.nonce,
            auth.deadline
        ));
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);

        // Check signer (chip) is registered to this payer
        if (registry.ownerOf(signer) != auth.payer) {
            revert UnauthorizedSigner();
        }

        // Transfer tokens from payer to recipient
        IERC20(auth.token).safeTransferFrom(auth.payer, auth.recipient, auth.amount);

        emit PaymentExecuted(
            auth.payer,
            auth.recipient,
            auth.token,
            auth.amount,
            signer,
            auth.nonce
        );
    }

    /// @notice Get the current nonce for a payer
    /// @param payer The payer's address
    /// @return The current nonce
    function getNonce(address payer) external view returns (uint256) {
        return nonces[payer];
    }

    /// @notice Get the EIP-712 domain separator
    /// @return The domain separator hash
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /// @notice Helper to compute the digest for off-chain signing
    /// @param auth The payment authorization to sign
    /// @return The EIP-712 typed data hash to sign
    function getDigest(PaymentAuth calldata auth) external view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(
            PAYMENT_AUTH_TYPEHASH,
            auth.payer,
            auth.recipient,
            auth.token,
            auth.amount,
            auth.nonce,
            auth.deadline
        ));
        return _hashTypedDataV4(structHash);
    }
}
