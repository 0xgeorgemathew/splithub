// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

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
 * yarn deploy --file DeploySplitHubRegistry.s.sol --network optimism # live network (requires keystore)
 */
contract DeploySplitHubRegistry is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        SplitHubRegistry registry = new SplitHubRegistry();
        deployments.push(Deployment({ name: "SplitHubRegistry", addr: address(registry) }));
    }
}
