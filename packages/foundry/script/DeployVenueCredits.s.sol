// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/console.sol";
import "./DeployHelpers.s.sol";
import "../contracts/VenueCredits.sol";

/**
 * @notice Deploys VenueCredits, the closed-loop credits contract for venues
 * @dev Uses the SplitHubRegistry already deployed on the chain and the USDC used by every tap payment.
 * Example: bun run deploy --file DeployVenueCredits.s.sol --network baseSepolia
 * Override with REGISTRY_ADDRESS=0x... TOKEN_ADDRESS=0x...
 */
contract DeployVenueCredits is ScaffoldETHDeploy {
    address constant BASE_SEPOLIA_USDC = 0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a;
    address constant BASE_SEPOLIA_REGISTRY = 0xEABdE4D7b969bdAF524C9E7A55082A51c5Eee513;

    function run() external ScaffoldEthDeployerRunner {
        address registry = vm.envOr("REGISTRY_ADDRESS", block.chainid == 84532 ? BASE_SEPOLIA_REGISTRY : address(0));
        address token = vm.envOr("TOKEN_ADDRESS", block.chainid == 84532 ? BASE_SEPOLIA_USDC : address(0));
        require(registry != address(0) && token != address(0), "Set REGISTRY_ADDRESS and TOKEN_ADDRESS");

        VenueCredits venueCredits = new VenueCredits(token, registry);
        console.log("VenueCredits deployed at:", address(venueCredits));
        deployments.push(Deployment({ name: "VenueCredits", addr: address(venueCredits) }));
    }
}
