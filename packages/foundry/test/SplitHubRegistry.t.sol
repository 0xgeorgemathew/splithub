// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Test, console } from "forge-std/Test.sol";
import { SplitHubRegistry } from "../contracts/SplitHubRegistry.sol";

contract SplitHubRegistryTest is Test {
    SplitHubRegistry public registry;

    // Real keystore addresses
    address constant DEPLOYER = 0xB2b6B516Df4B159c0E4Eb1d6D7D65a5f2F04C30E;  // Also the owner
    address constant BRAVO_KEY = 0x59d4C5BE20B41139494b3F1ba2A745ad9e71B00B;  // NFC chip (signer)

    // Loaded from environment
    uint256 bravoKeyPk;

    function setUp() public {
        // Load bravoKey private key from environment for signing
        bravoKeyPk = vm.envUint("BRAVO_KEY_PK");

        // Verify the private key matches the expected address
        require(vm.addr(bravoKeyPk) == BRAVO_KEY, "BRAVO_KEY_PK does not match expected address");

        console.log("=== Setup ===");
        console.log("Deployer (also Owner):", DEPLOYER);
        console.log("NFC Chip (bravoKey):", BRAVO_KEY);

        // Fund deployer for local testing (keystore has no local balance)
        vm.deal(DEPLOYER, 10 ether);

        // Deploy as deployer
        vm.prank(DEPLOYER);
        registry = new SplitHubRegistry();
        console.log("Registry deployed at:", address(registry));
    }

    function test_RegisterChipToOwner() public {
        console.log("\n=== Test: Register NFC Chip to Owner ===");

        // Step 1: NFC chip signs the owner's address (DEPLOYER is the owner)
        bytes32 messageHash = keccak256(abi.encodePacked(DEPLOYER));
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        console.log("Message hash (owner address):", vm.toString(messageHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(bravoKeyPk, ethSignedHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        console.log("Signature created by NFC chip (bravoKey)");

        // Step 2: Deployer calls register to link chip to themselves
        console.log("Deployer calling register...");
        vm.prank(DEPLOYER);
        registry.register(BRAVO_KEY, DEPLOYER, signature);

        console.log("Registration successful!");

        // Step 3: Verify mappings
        address registeredOwner = registry.ownerOf(BRAVO_KEY);
        address registeredSigner = registry.signerOf(DEPLOYER);

        console.log("\n=== Verification ===");
        console.log("ownerOf[BRAVO_KEY]:", registeredOwner);
        console.log("signerOf[DEPLOYER]:", registeredSigner);

        assertEq(registeredOwner, DEPLOYER, "Owner mapping incorrect");
        assertEq(registeredSigner, BRAVO_KEY, "Signer mapping incorrect");

        console.log("\nAll assertions passed!");
    }
}
