// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/console.sol";
import "./DeployHelpers.s.sol";
import "../contracts/SplitHubPayments.sol";

/**
 * @notice Deploy script for SplitHubPayments contract
 * @dev Inherits ScaffoldETHDeploy for deployment utilities
 * @dev Requires SplitHubRegistry to be deployed first
 * Example:
 * yarn deploy --file DeploySplitHubPayments.s.sol  # local anvil chain
 * yarn deploy --file DeploySplitHubPayments.s.sol --network baseSepolia # live network
 *
 * Override registry address with env var:
 * REGISTRY_ADDRESS=0x... yarn deploy --file DeploySplitHubPayments.s.sol
 */
contract DeploySplitHubPayments is ScaffoldETHDeploy {
    error RegistryNotDeployed();

    function run() external ScaffoldEthDeployerRunner {
        address registryAddress = getRegistryAddress();
        console.log("Using SplitHubRegistry at:", registryAddress);
        console.log("Deploying SplitHubPayments...");
        SplitHubPayments payments = new SplitHubPayments(registryAddress);
        console.log("SplitHubPayments deployed at:", address(payments));
        deployments.push(Deployment({ name: "SplitHubPayments", addr: address(payments) }));
    }

    function getRegistryAddress() internal view returns (address) {
        // First check for env override
        address envRegistry = vm.envOr("REGISTRY_ADDRESS", address(0));
        if (envRegistry != address(0)) {
            return envRegistry;
        }

        // Read from deployment JSON
        string memory root = vm.projectRoot();
        string memory chainIdStr = vm.toString(block.chainid);
        string memory path = string.concat(root, "/deployments/", chainIdStr, ".json");

        try vm.readFile(path) returns (string memory json) {
            // Parse JSON and find SplitHubRegistry address
            // The JSON format is: {"0xAddress": "ContractName", ...}
            // We need to find the key where value == "SplitHubRegistry"
            string[] memory keys = vm.parseJsonKeys(json, "$");
            for (uint256 i = 0; i < keys.length; i++) {
                if (keccak256(bytes(keys[i])) == keccak256(bytes("networkName"))) continue;
                string memory value = vm.parseJsonString(json, string.concat("$.", keys[i]));
                if (keccak256(bytes(value)) == keccak256(bytes("SplitHubRegistry"))) {
                    return vm.parseAddress(keys[i]);
                }
            }
        } catch { }

        revert RegistryNotDeployed();
    }
}
