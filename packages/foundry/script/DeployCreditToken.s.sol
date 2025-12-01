// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/console.sol";
import "./DeployHelpers.s.sol";
import "../contracts/CreditToken.sol";

/**
 * @notice Deploy script for CreditToken contract
 * @dev Inherits ScaffoldETHDeploy for deployment utilities
 * @dev Requires SplitHubRegistry to be deployed first
 * Example:
 * yarn deploy:credittoken:base  # Deploy to Base Sepolia
 *
 * Override addresses with env vars:
 * REGISTRY_ADDRESS=0x... TOKEN_ADDRESS=0x... yarn deploy --file DeployCreditToken.s.sol
 */
contract DeployCreditToken is ScaffoldETHDeploy {
    error RegistryNotDeployed();

    // Known USDT address (same token used in settle page)
    address constant BASE_SEPOLIA_USDT = 0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a;

    function run() external ScaffoldEthDeployerRunner {
        address registryAddress = getRegistryAddress();
        address tokenAddress = getTokenAddress();

        console.log("Using SplitHubRegistry at:", registryAddress);
        console.log("Using token at:", tokenAddress);
        console.log("Deploying CreditToken...");

        CreditToken creditToken = new CreditToken(tokenAddress, registryAddress);

        console.log("CreditToken deployed at:", address(creditToken));
        console.log("Credit rate: 1 token = 10 CREDIT");

        deployments.push(Deployment({ name: "CreditToken", addr: address(creditToken) }));
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

    function getTokenAddress() internal view returns (address) {
        // First check for env override
        address envToken = vm.envOr("TOKEN_ADDRESS", address(0));
        if (envToken != address(0)) {
            return envToken;
        }

        // Use known addresses per chain
        if (block.chainid == 84532) {
            // Base Sepolia - use same USDT as settle page
            return BASE_SEPOLIA_USDT;
        }

        revert("Token address not configured for this chain. Set TOKEN_ADDRESS env var.");
    }
}
