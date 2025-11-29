// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/console.sol";
import "./DeployHelpers.s.sol";
import "../contracts/SplitHubRegistry.sol";

/**
 * @notice Deploy script for SplitHubRegistry contract
 * @dev Inherits ScaffoldETHDeploy which:
 *      - Includes forge-std/Script.sol for deployment
 *      - Includes ScaffoldEthDeployerRunner modifier
 *      - Provides `deployer` variable
 * Example:
 * yarn deploy --file DeploySplitHubRegistry.s.sol  # local anvil chain
 * yarn deploy --file DeploySplitHubRegistry.s.sol --network baseSepolia # live network (requires keystore)
 */
contract DeploySplitHubRegistry is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        console.log("Deploying SplitHubRegistry...");
        SplitHubRegistry registry = new SplitHubRegistry();
        console.log("SplitHubRegistry deployed at:", address(registry));
        deployments.push(Deployment({ name: "SplitHubRegistry", addr: address(registry) }));
    }
}
