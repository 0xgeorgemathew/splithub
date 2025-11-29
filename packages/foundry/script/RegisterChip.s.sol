// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Script, console } from "forge-std/Script.sol";
import { SplitHubRegistry } from "../contracts/SplitHubRegistry.sol";
import { stdJson } from "forge-std/StdJson.sol";

/**
 * @notice Script to register an NFC chip to an owner on-chain
 * @dev Requires environment variable:
 *      - BRAVO_KEY_PK: Private key of the NFC chip (signer)
 *
 * Registry address is loaded from deployments/{chainId}.json
 *
 * Example:
 *   export BRAVO_KEY_PK=0x...
 *   forge script script/RegisterChip.s.sol --rpc-url baseSepolia --broadcast -vvv
 */
contract RegisterChip is Script {
    using stdJson for string;

    function run() external {
        // Load chip private key from environment
        uint256 chipPrivateKey = vm.envUint("BRAVO_KEY_PK");

        // Load registry address from deployments JSON
        address registryAddress = _getDeployedAddress("SplitHubRegistry");

        // Derive addresses
        address chipAddress = vm.addr(chipPrivateKey);

        // Start broadcast to get the owner (deployer) address
        vm.startBroadcast();
        (, address owner,) = vm.readCallers();

        console.log("=== Registration Script ===");
        console.log("Registry:", registryAddress);
        console.log("NFC Chip (signer):", chipAddress);
        console.log("Owner:", owner);

        // Create the registry instance
        SplitHubRegistry registry = SplitHubRegistry(registryAddress);

        // Create signature: chip signs the owner's address
        bytes32 messageHash = keccak256(abi.encodePacked(owner));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(chipPrivateKey, ethSignedHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        console.log("Signature created, calling register...");

        // Register the chip to the owner
        registry.register(chipAddress, owner, signature);

        vm.stopBroadcast();

        console.log("Registration successful!");
        console.log("ownerOf[chip] =", registry.ownerOf(chipAddress));
        console.log("signerOf[owner] =", registry.signerOf(owner));
    }

    /// @notice Load a deployed contract address from deployments/{chainId}.json
    function _getDeployedAddress(string memory contractName) internal view returns (address) {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/deployments/", vm.toString(block.chainid), ".json");
        string memory json = vm.readFile(path);

        // The JSON format is {"0xAddress": "ContractName", ...}
        // We need to find the key (address) whose value matches contractName
        string[] memory keys = vm.parseJsonKeys(json, "$");

        for (uint256 i = 0; i < keys.length; i++) {
            string memory key = keys[i];
            // Skip non-address keys like "networkName"
            if (bytes(key).length != 42) continue;

            string memory value = json.readString(string.concat(".", key));
            if (keccak256(bytes(value)) == keccak256(bytes(contractName))) {
                return vm.parseAddress(key);
            }
        }

        revert(string.concat("Contract not found in deployments: ", contractName));
    }
}
