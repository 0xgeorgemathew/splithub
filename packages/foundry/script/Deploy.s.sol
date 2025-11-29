//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/console.sol";
import "./DeployHelpers.s.sol";
import "../contracts/SplitHubRegistry.sol";
import "../contracts/SplitHubPayments.sol";

/**
 * @notice Main deployment script for all SplitHub contracts
 * @dev Run this when you want to deploy all contracts at once
 *
 * Example: yarn deploy # runs this script (without `--file` flag)
 */
contract DeployScript is ScaffoldETHDeploy {
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

        console.log("All contracts deployed successfully!");
    }
}
