// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Test, console } from "forge-std/Test.sol";
import { SplitHubRegistry } from "../contracts/SplitHubRegistry.sol";

contract SplitHubRegistryTest is Test {
    SplitHubRegistry public registry;

    // Real keystore addresses
    address constant DEPLOYER = 0xB2b6B516Df4B159c0E4Eb1d6D7D65a5f2F04C30E; // Also the owner
    address constant BRAVO_KEY = 0x59d4C5BE20B41139494b3F1ba2A745ad9e71B00B; // NFC chip (signer)

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

        // Step 1: NFC chip signs the EIP-712 ChipRegistration struct
        // Using contract's getDigest helper for the EIP-712 digest
        bytes32 digest = registry.getDigest(DEPLOYER, BRAVO_KEY);

        console.log("EIP-712 digest:", vm.toString(digest));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(bravoKeyPk, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        console.log("EIP-712 signature created by NFC chip (bravoKey)");

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

    function _sign(uint256 chipPk, address owner) internal view returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(chipPk, registry.getDigest(owner, vm.addr(chipPk)));
        return abi.encodePacked(r, s, v);
    }

    /// A chip signature alone must not bind a key to someone else's wallet (it could then authorize their payments).
    function test_RevertWhen_RegisteringForAnotherOwner() public {
        uint256 attackerKey = 0xA77AC;
        address victim = address(0xBEEF);
        bytes memory signature = _sign(attackerKey, victim);

        vm.expectRevert(SplitHubRegistry.NotOwner.selector);
        registry.register(vm.addr(attackerKey), victim, signature);

        vm.prank(address(0xBAD));
        vm.expectRevert(SplitHubRegistry.NotOwner.selector);
        registry.register(vm.addr(attackerKey), victim, signature);

        assertEq(registry.ownerOf(vm.addr(attackerKey)), address(0));
        assertEq(registry.signerOf(victim), address(0));
    }

    function test_NewChipRevokesPreviousChip() public {
        address owner = address(0xA11CE);
        uint256 oldChip = 0xC1;
        uint256 newChip = 0xC2;

        bytes memory oldSig = _sign(oldChip, owner);
        bytes memory newSig = _sign(newChip, owner);
        vm.startPrank(owner);
        registry.register(vm.addr(oldChip), owner, oldSig);
        registry.register(vm.addr(newChip), owner, newSig);
        vm.stopPrank();

        assertEq(registry.ownerOf(vm.addr(oldChip)), address(0), "old chip still authorizes the owner");
        assertEq(registry.ownerOf(vm.addr(newChip)), owner);
        assertEq(registry.signerOf(owner), vm.addr(newChip));
    }

    function test_MovingChipUnlinksPreviousOwner() public {
        address first = address(0xA11CE);
        address second = address(0xB0B);
        uint256 chip = 0xC3;

        bytes memory firstSig = _sign(chip, first);
        bytes memory secondSig = _sign(chip, second);
        vm.prank(first);
        registry.register(vm.addr(chip), first, firstSig);
        vm.prank(second);
        registry.register(vm.addr(chip), second, secondSig);

        assertEq(registry.ownerOf(vm.addr(chip)), second);
        assertEq(registry.signerOf(first), address(0));
        assertEq(registry.signerOf(second), vm.addr(chip));
    }
}
