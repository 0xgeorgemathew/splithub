// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Test, console } from "forge-std/Test.sol";
import { CreditToken } from "../contracts/CreditToken.sol";
import { SplitHubRegistry } from "../contracts/SplitHubRegistry.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock USDC token for testing (6 decimals like real USDC)
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {
        _mint(msg.sender, 1_000_000 * 10 ** 6);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract CreditTokenTest is Test {
    SplitHubRegistry public registry;
    CreditToken public creditToken;
    MockUSDC public usdc;

    // Test addresses
    address constant USER = 0xB2b6B516Df4B159c0E4Eb1d6D7D65a5f2F04C30E;
    address constant OWNER = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    // Signer (NFC chip) - test private key
    uint256 signerPk;
    address signer;

    function setUp() public {
        // Use a test private key
        signerPk = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        signer = vm.addr(signerPk);

        console.log("=== Setup ===");
        console.log("User:", USER);
        console.log("Owner:", OWNER);
        console.log("Signer (NFC chip):", signer);

        // Deploy contracts
        registry = new SplitHubRegistry();
        usdc = new MockUSDC();

        vm.prank(OWNER);
        creditToken = new CreditToken(address(usdc), address(registry));

        // Fund user with USDC
        usdc.mint(USER, 1000 * 10 ** 6); // 1000 USDC

        // User approves CreditToken contract to spend USDC
        vm.prank(USER);
        usdc.approve(address(creditToken), type(uint256).max);

        console.log("Registry contract:", address(registry));
        console.log("CreditToken contract:", address(creditToken));
        console.log("USDC:", address(usdc));
    }

    /// @dev Helper to register a chip to a user in the registry using EIP-712 signature
    function _registerChip(uint256 chipPk, address owner) internal {
        address chip = vm.addr(chipPk);
        bytes32 digest = registry.getDigest(owner, chip);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(chipPk, digest);
        bytes memory signature = abi.encodePacked(r, s, v);
        registry.register(chip, owner, signature);
    }

    function test_PurchaseCredits() public {
        console.log("\n=== Test: Purchase Credits ===");

        // Register chip to user via registry
        _registerChip(signerPk, USER);

        // Create purchase auth
        uint256 usdcAmount = 10 * 10 ** 6; // 10 USDC
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = creditToken.getNonce(USER);

        CreditToken.CreditPurchase memory purchase =
            CreditToken.CreditPurchase({ buyer: USER, usdcAmount: usdcAmount, nonce: nonce, deadline: deadline });

        // Sign the purchase auth
        bytes32 digest = creditToken.getPurchaseDigest(purchase);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        console.log("USDC amount:", usdcAmount / 10 ** 6, "USDC");
        console.log("User USDC balance before:", usdc.balanceOf(USER) / 10 ** 6);
        console.log("User credit balance before:", creditToken.balanceOf(USER) / 10 ** 18);

        // Execute purchase (as relayer)
        creditToken.purchaseCredits(purchase, signature);

        // 10 USDC = 100 credits (with 18 decimals)
        uint256 expectedCredits = 100 * 10 ** 18;

        console.log("User USDC balance after:", usdc.balanceOf(USER) / 10 ** 6);
        console.log("User credit balance after:", creditToken.balanceOf(USER) / 10 ** 18);

        assertEq(creditToken.balanceOf(USER), expectedCredits, "User should receive 100 credits");
        assertEq(usdc.balanceOf(USER), 990 * 10 ** 6, "User should have 990 USDC remaining");
        assertEq(usdc.balanceOf(address(creditToken)), usdcAmount, "Contract should hold USDC");
        assertEq(creditToken.getNonce(USER), nonce + 1, "Nonce should increment");

        console.log("Purchase successful!");
    }

    function test_SpendCredits() public {
        console.log("\n=== Test: Spend Credits ===");

        // Register chip to user via registry
        _registerChip(signerPk, USER);

        // First, purchase some credits
        uint256 usdcAmount = 10 * 10 ** 6; // 10 USDC = 100 credits
        CreditToken.CreditPurchase memory purchase = CreditToken.CreditPurchase({
            buyer: USER, usdcAmount: usdcAmount, nonce: 0, deadline: block.timestamp + 1 hours
        });

        bytes32 purchaseDigest = creditToken.getPurchaseDigest(purchase);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(signerPk, purchaseDigest);
        creditToken.purchaseCredits(purchase, abi.encodePacked(r1, s1, v1));

        console.log("Credits after purchase:", creditToken.balanceOf(USER) / 10 ** 18);

        // Now spend credits
        uint256 spendAmount = 25 * 10 ** 18; // 25 credits
        uint256 activityId = 1; // Bowling

        CreditToken.CreditSpend memory spend = CreditToken.CreditSpend({
            spender: USER,
            amount: spendAmount,
            activityId: activityId,
            nonce: 1, // Nonce is now 1 after purchase
            deadline: block.timestamp + 1 hours
        });

        bytes32 spendDigest = creditToken.getSpendDigest(spend);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(signerPk, spendDigest);
        bytes memory spendSig = abi.encodePacked(r2, s2, v2);

        // Execute spend (as relayer)
        creditToken.spendCredits(spend, spendSig);

        uint256 expectedBalance = 75 * 10 ** 18; // 100 - 25 = 75 credits

        console.log("Credits after spend:", creditToken.balanceOf(USER) / 10 ** 18);

        assertEq(creditToken.balanceOf(USER), expectedBalance, "User should have 75 credits remaining");
        assertEq(creditToken.getNonce(USER), 2, "Nonce should be 2");

        console.log("Spend successful!");
    }

    function test_RevertUnregisteredChip() public {
        console.log("\n=== Test: Reject Unregistered Chip ===");

        // Do NOT register chip in registry

        CreditToken.CreditPurchase memory purchase = CreditToken.CreditPurchase({
            buyer: USER, usdcAmount: 10 * 10 ** 6, nonce: 0, deadline: block.timestamp + 1 hours
        });

        bytes32 digest = creditToken.getPurchaseDigest(purchase);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(CreditToken.UnauthorizedSigner.selector);
        creditToken.purchaseCredits(purchase, signature);

        console.log("Unregistered chip rejected as expected");
    }

    function test_RevertExpiredSignature() public {
        console.log("\n=== Test: Reject Expired Signature ===");

        _registerChip(signerPk, USER);

        CreditToken.CreditPurchase memory purchase = CreditToken.CreditPurchase({
            buyer: USER,
            usdcAmount: 10 * 10 ** 6,
            nonce: 0,
            deadline: block.timestamp - 1 // Already expired
        });

        bytes32 digest = creditToken.getPurchaseDigest(purchase);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(CreditToken.ExpiredSignature.selector);
        creditToken.purchaseCredits(purchase, signature);

        console.log("Expired signature rejected as expected");
    }

    function test_RevertInvalidNonce() public {
        console.log("\n=== Test: Reject Invalid Nonce ===");

        _registerChip(signerPk, USER);

        CreditToken.CreditPurchase memory purchase = CreditToken.CreditPurchase({
            buyer: USER,
            usdcAmount: 10 * 10 ** 6,
            nonce: 999, // Wrong nonce
            deadline: block.timestamp + 1 hours
        });

        bytes32 digest = creditToken.getPurchaseDigest(purchase);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(CreditToken.InvalidNonce.selector);
        creditToken.purchaseCredits(purchase, signature);

        console.log("Invalid nonce rejected as expected");
    }

    function test_RevertInsufficientBalance() public {
        console.log("\n=== Test: Reject Insufficient Balance ===");

        _registerChip(signerPk, USER);

        // Purchase 10 USDC = 100 credits
        CreditToken.CreditPurchase memory purchase = CreditToken.CreditPurchase({
            buyer: USER, usdcAmount: 10 * 10 ** 6, nonce: 0, deadline: block.timestamp + 1 hours
        });

        bytes32 purchaseDigest = creditToken.getPurchaseDigest(purchase);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(signerPk, purchaseDigest);
        creditToken.purchaseCredits(purchase, abi.encodePacked(r1, s1, v1));

        // Try to spend 150 credits (more than 100)
        CreditToken.CreditSpend memory spend = CreditToken.CreditSpend({
            spender: USER,
            amount: 150 * 10 ** 18, // Too many credits
            activityId: 1,
            nonce: 1,
            deadline: block.timestamp + 1 hours
        });

        bytes32 spendDigest = creditToken.getSpendDigest(spend);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(signerPk, spendDigest);

        vm.expectRevert(CreditToken.InsufficientBalance.selector);
        creditToken.spendCredits(spend, abi.encodePacked(r2, s2, v2));

        console.log("Insufficient balance rejected as expected");
    }

    function test_WithdrawUSDC() public {
        console.log("\n=== Test: Withdraw USDC ===");

        _registerChip(signerPk, USER);

        // User purchases credits
        CreditToken.CreditPurchase memory purchase = CreditToken.CreditPurchase({
            buyer: USER, usdcAmount: 100 * 10 ** 6, nonce: 0, deadline: block.timestamp + 1 hours
        });

        bytes32 digest = creditToken.getPurchaseDigest(purchase);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        creditToken.purchaseCredits(purchase, abi.encodePacked(r, s, v));

        console.log("Contract USDC balance:", usdc.balanceOf(address(creditToken)) / 10 ** 6);

        // Owner withdraws USDC
        vm.prank(OWNER);
        creditToken.withdrawUSDC(OWNER);

        assertEq(usdc.balanceOf(OWNER), 100 * 10 ** 6, "Owner should receive USDC");
        assertEq(usdc.balanceOf(address(creditToken)), 0, "Contract should have 0 USDC");

        console.log("Withdrawal successful!");
    }

    function test_RevertWithdrawNotOwner() public {
        console.log("\n=== Test: Reject Non-Owner Withdrawal ===");

        vm.prank(USER);
        vm.expectRevert(CreditToken.NotOwner.selector);
        creditToken.withdrawUSDC(USER);

        console.log("Non-owner withdrawal rejected as expected");
    }

    function test_ReplayProtection() public {
        console.log("\n=== Test: Replay Protection ===");

        _registerChip(signerPk, USER);

        CreditToken.CreditPurchase memory purchase = CreditToken.CreditPurchase({
            buyer: USER, usdcAmount: 10 * 10 ** 6, nonce: 0, deadline: block.timestamp + 1 hours
        });

        bytes32 digest = creditToken.getPurchaseDigest(purchase);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // First execution succeeds
        creditToken.purchaseCredits(purchase, signature);
        console.log("First purchase succeeded");

        // Replay attempt should fail
        vm.expectRevert(CreditToken.InvalidNonce.selector);
        creditToken.purchaseCredits(purchase, signature);

        console.log("Replay attack prevented!");
    }
}
