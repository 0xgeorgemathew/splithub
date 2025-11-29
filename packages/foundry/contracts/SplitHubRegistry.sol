// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title SplitHubRegistry
/// @notice A generalized registry with bidirectional mapping between signers and owners
/// @dev Registration requires signature proof of signer key ownership
contract SplitHubRegistry {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    mapping(address signer => address owner) public ownerOf;
    mapping(address owner => address signer) public signerOf;

    event Registered(address indexed signer, address indexed owner);

    error InvalidSignature();

    /// @notice Register a signer address to an owner (gasless - can be called by relayer)
    /// @param signer The address being registered (e.g., NFC chip address)
    /// @param owner The address that will own this signer
    /// @param signature Signature of keccak256(abi.encodePacked(owner)) by signer
    function register(address signer, address owner, bytes calldata signature) external {
        // Verify chip signed the owner's address
        bytes32 messageHash = keccak256(abi.encodePacked(owner));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recovered = ethSignedHash.recover(signature);

        if (recovered != signer) {
            revert InvalidSignature();
        }

        ownerOf[signer] = owner;
        signerOf[owner] = signer;

        emit Registered(signer, owner);
    }
}
