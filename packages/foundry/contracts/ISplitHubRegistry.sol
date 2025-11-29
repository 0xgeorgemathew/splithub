// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title ISplitHubRegistry
/// @notice Interface for the SplitHubRegistry contract
interface ISplitHubRegistry {
    function ownerOf(address signer) external view returns (address);
    function signerOf(address owner) external view returns (address);
}
