//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/console.sol";
import "./DeployHelpers.s.sol";
import "../contracts/SplitHubRegistry.sol";
import "../contracts/SplitHubPayments.sol";
import "../contracts/CreditToken.sol";

/**
 * @notice Main deployment script for all SplitHub contracts
 * @dev Run this when you want to deploy all contracts at once
 *
 * Example: yarn deploy:base # deploys all contracts to Base Sepolia
 */
contract DeployScript is ScaffoldETHDeploy {
    // Known token address (same as settle page uses)
    address constant BASE_SEPOLIA_TOKEN = 0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a;

    function run() external ScaffoldEthDeployerRunner {
        // Deploy SplitHubRegistry first
        console.log("Deploying SplitHubRegistry...");
        SplitHubRegistry registry = new SplitHubRegistry();
        console.log("SplitHubRegistry deployed at:", address(registry));
        deployments.push(Deployment({ name: "SplitHubRegistry", addr: address(registry) }));

        // Deploy SplitHubPayments with registry address
        console.log("Deploying SplitHubPayments...");
        SplitHubPayments payments = new SplitHubPayments(address(registry));
        console.log("SplitHubPayments deployed at:", address(payments));
        deployments.push(Deployment({ name: "SplitHubPayments", addr: address(payments) }));

        // Deploy CreditToken with token and registry addresses
        address tokenAddress = getTokenAddress();
        console.log("Deploying CreditToken with token:", tokenAddress);
        CreditToken creditToken = new CreditToken(tokenAddress, address(registry));
        console.log("CreditToken deployed at:", address(creditToken));
        console.log("Credit rate: 1 token = 10 CREDIT");
        deployments.push(Deployment({ name: "CreditToken", addr: address(creditToken) }));

        console.log("All contracts deployed successfully!");
    }

    function getTokenAddress() internal view returns (address) {
        // Check for env override
        address envToken = vm.envOr("TOKEN_ADDRESS", address(0));
        if (envToken != address(0)) {
            return envToken;
        }

        // Use known addresses per chain
        if (block.chainid == 84532) {
            return BASE_SEPOLIA_TOKEN;
        }

        revert("Token address not configured for this chain. Set TOKEN_ADDRESS env var.");
    }
}
