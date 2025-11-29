// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/SplitHubPayments.sol";

/**
 * @notice Deploy script for SplitHubPayments contract
 * @dev Inherits ScaffoldETHDeploy for deployment utilities
 * Example:
 * yarn deploy --file DeploySplitHubPayments.s.sol  # local anvil chain
 * yarn deploy --file DeploySplitHubPayments.s.sol --network baseSepolia # live network
 */
contract DeploySplitHubPayments is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        SplitHubPayments payments = new SplitHubPayments();
        deployments.push(Deployment({ name: "SplitHubPayments", addr: address(payments) }));
    }
}
