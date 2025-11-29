// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/// @title SplitHubRegistry
/// @notice A generalized registry with bidirectional mapping between signers and owners
/// @dev Registration requires EIP-712 signature proof of signer key ownership (compatible with HaloChips)
contract SplitHubRegistry is EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant CHIP_REGISTRATION_TYPEHASH = keccak256(
        "ChipRegistration(address owner,address chipAddress)"
    );

    mapping(address signer => address owner) public ownerOf;
    mapping(address owner => address signer) public signerOf;

    event Registered(address indexed signer, address indexed owner);

    error InvalidSignature();

    constructor() EIP712("SplitHubRegistry", "1") {}

    /// @notice Register a signer address to an owner (gasless - can be called by relayer)
    /// @param signer The address being registered (e.g., NFC chip address)
    /// @param owner The address that will own this signer
    /// @param signature EIP-712 signature of ChipRegistration struct by signer
    function register(address signer, address owner, bytes calldata signature) external {
        // Verify EIP-712 signature
        bytes32 structHash = keccak256(abi.encode(
            CHIP_REGISTRATION_TYPEHASH,
            owner,
            signer  // chipAddress in the struct
        ));
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = digest.recover(signature);

        if (recovered != signer) {
            revert InvalidSignature();
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
        bytes32 structHash = keccak256(abi.encode(
            CHIP_REGISTRATION_TYPEHASH,
            owner,
            chipAddress
        ));
        return _hashTypedDataV4(structHash);
    }
}
