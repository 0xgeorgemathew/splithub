// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/// @title SplitHubRegistry
/// @notice A generalized registry with bidirectional mapping between signers and owners
/// @dev Registration needs both sides: the owner sends the transaction, and the signer (chip) proves key
///      ownership with an EIP-712 signature (compatible with HaloChips). Registering a new signer for an owner
///      revokes the owner's previous signer, and a signer moved to a new owner is unlinked from the old one.
contract SplitHubRegistry is EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant CHIP_REGISTRATION_TYPEHASH =
        keccak256("ChipRegistration(address owner,address chipAddress)");

    mapping(address signer => address owner) public ownerOf;
    mapping(address owner => address signer) public signerOf;

    event Registered(address indexed signer, address indexed owner);

    error InvalidSignature();
    error NotOwner();

    constructor() EIP712("SplitHubRegistry", "1") { }

    /// @notice Register a signer address to the caller
    /// @dev The owner must send the transaction: a chip signature alone must not bind a key to someone else's
    ///      wallet, or that key could authorize payments from it.
    /// @param signer The address being registered (e.g., NFC chip address)
    /// @param owner The address that will own this signer; must be msg.sender
    /// @param signature EIP-712 signature of ChipRegistration struct by signer
    function register(address signer, address owner, bytes calldata signature) external {
        if (msg.sender != owner) {
            revert NotOwner();
        }

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(
                CHIP_REGISTRATION_TYPEHASH,
                owner,
                signer // chipAddress in the struct
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = digest.recover(signature);

        if (recovered != signer) {
            revert InvalidSignature();
        }

        // Revoke the owner's previous signer and the signer's previous owner so no stale link keeps working.
        address previousSigner = signerOf[owner];
        if (previousSigner != address(0) && previousSigner != signer) {
            ownerOf[previousSigner] = address(0);
        }
        address previousOwner = ownerOf[signer];
        if (previousOwner != address(0) && previousOwner != owner) {
            signerOf[previousOwner] = address(0);
        }

        ownerOf[signer] = owner;
        signerOf[owner] = signer;

        emit Registered(signer, owner);
    }

    /// @notice Get the EIP-712 domain separator
    /// @return The domain separator hash
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /// @notice Helper to compute the digest for off-chain signing
    /// @param owner The owner address
    /// @param chipAddress The chip address
    /// @return The EIP-712 typed data hash to sign
    function getDigest(address owner, address chipAddress) external view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(CHIP_REGISTRATION_TYPEHASH, owner, chipAddress));
        return _hashTypedDataV4(structHash);
    }
}
