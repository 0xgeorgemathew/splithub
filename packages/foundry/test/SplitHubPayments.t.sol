// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Test, console } from "forge-std/Test.sol";
import { SplitHubPayments } from "../contracts/SplitHubPayments.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock ERC20 token for testing
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1_000_000 * 10 ** 18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract SplitHubPaymentsTest is Test {
    SplitHubPayments public payments;
    MockERC20 public token;

    // Test addresses
    address constant PAYER = 0xB2b6B516Df4B159c0E4Eb1d6D7D65a5f2F04C30E;
    address constant RECIPIENT = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    // Signer (NFC chip) - loaded from environment or use test key
    uint256 signerPk;
    address signer;

    // EIP-712 domain
    bytes32 constant PAYMENT_AUTH_TYPEHASH = keccak256(
        "PaymentAuth(address payer,address recipient,address token,uint256 amount,uint256 nonce,uint256 deadline)"
    );

    function setUp() public {
        // Use a test private key (in real tests, load from env)
        signerPk = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        signer = vm.addr(signerPk);

        console.log("=== Setup ===");
        console.log("Payer:", PAYER);
        console.log("Recipient:", RECIPIENT);
        console.log("Signer (NFC chip):", signer);

        // Deploy contracts
        payments = new SplitHubPayments();
        token = new MockERC20();

        // Fund payer with tokens
        token.mint(PAYER, 10_000 * 10 ** 18);

        // Payer approves payments contract to spend tokens
        vm.prank(PAYER);
        token.approve(address(payments), type(uint256).max);

        console.log("Payments contract:", address(payments));
        console.log("Token:", address(token));
    }

    function test_AuthorizeSigner() public {
        console.log("\n=== Test: Authorize Signer ===");

        vm.prank(PAYER);
        payments.authorize(signer);

        assertTrue(payments.isAuthorizedSigner(PAYER, signer), "Signer should be authorized");
        console.log("Signer authorized successfully");
    }

    function test_RevokeSigner() public {
        console.log("\n=== Test: Revoke Signer ===");

        vm.startPrank(PAYER);
        payments.authorize(signer);
        assertTrue(payments.isAuthorizedSigner(PAYER, signer), "Signer should be authorized");

        payments.revoke(signer);
        assertFalse(payments.isAuthorizedSigner(PAYER, signer), "Signer should be revoked");
        vm.stopPrank();

        console.log("Signer revoked successfully");
    }

    function test_ExecutePayment() public {
        console.log("\n=== Test: Execute Payment ===");

        // Authorize signer
        vm.prank(PAYER);
        payments.authorize(signer);

        // Create payment auth
        uint256 amount = 100 * 10 ** 18;
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = payments.getNonce(PAYER);

        SplitHubPayments.PaymentAuth memory auth = SplitHubPayments.PaymentAuth({
            payer: PAYER,
            recipient: RECIPIENT,
            token: address(token),
            amount: amount,
            nonce: nonce,
            deadline: deadline
        });

        // Sign the payment auth
        bytes32 digest = payments.getDigest(auth);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        console.log("Payment amount:", amount / 10 ** 18, "tokens");
        console.log("Payer balance before:", token.balanceOf(PAYER) / 10 ** 18);
        console.log("Recipient balance before:", token.balanceOf(RECIPIENT) / 10 ** 18);

        // Execute payment (as relayer)
        payments.executePayment(auth, signature);

        console.log("Payer balance after:", token.balanceOf(PAYER) / 10 ** 18);
        console.log("Recipient balance after:", token.balanceOf(RECIPIENT) / 10 ** 18);

        assertEq(token.balanceOf(RECIPIENT), amount, "Recipient should receive tokens");
        assertEq(payments.getNonce(PAYER), nonce + 1, "Nonce should increment");

        console.log("Payment executed successfully!");
    }

    function test_RevertUnauthorizedSigner() public {
        console.log("\n=== Test: Reject Unauthorized Signer ===");

        // Do NOT authorize signer

        SplitHubPayments.PaymentAuth memory auth = SplitHubPayments.PaymentAuth({
            payer: PAYER,
            recipient: RECIPIENT,
            token: address(token),
            amount: 100 * 10 ** 18,
            nonce: 0,
            deadline: block.timestamp + 1 hours
        });

        bytes32 digest = payments.getDigest(auth);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(SplitHubPayments.UnauthorizedSigner.selector);
        payments.executePayment(auth, signature);

        console.log("Unauthorized signer rejected as expected");
    }

    function test_RevertExpiredSignature() public {
        console.log("\n=== Test: Reject Expired Signature ===");

        vm.prank(PAYER);
        payments.authorize(signer);

        SplitHubPayments.PaymentAuth memory auth = SplitHubPayments.PaymentAuth({
            payer: PAYER,
            recipient: RECIPIENT,
            token: address(token),
            amount: 100 * 10 ** 18,
            nonce: 0,
            deadline: block.timestamp - 1 // Already expired
        });

        bytes32 digest = payments.getDigest(auth);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(SplitHubPayments.ExpiredSignature.selector);
        payments.executePayment(auth, signature);

        console.log("Expired signature rejected as expected");
    }

    function test_RevertInvalidNonce() public {
        console.log("\n=== Test: Reject Invalid Nonce ===");

        vm.prank(PAYER);
        payments.authorize(signer);

        SplitHubPayments.PaymentAuth memory auth = SplitHubPayments.PaymentAuth({
            payer: PAYER,
            recipient: RECIPIENT,
            token: address(token),
            amount: 100 * 10 ** 18,
            nonce: 999, // Wrong nonce
            deadline: block.timestamp + 1 hours
        });

        bytes32 digest = payments.getDigest(auth);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(SplitHubPayments.InvalidNonce.selector);
        payments.executePayment(auth, signature);

        console.log("Invalid nonce rejected as expected");
    }

    function test_ReplayProtection() public {
        console.log("\n=== Test: Replay Protection ===");

        vm.prank(PAYER);
        payments.authorize(signer);

        SplitHubPayments.PaymentAuth memory auth = SplitHubPayments.PaymentAuth({
            payer: PAYER,
            recipient: RECIPIENT,
            token: address(token),
            amount: 100 * 10 ** 18,
            nonce: 0,
            deadline: block.timestamp + 1 hours
        });

        bytes32 digest = payments.getDigest(auth);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // First execution succeeds
        payments.executePayment(auth, signature);
        console.log("First payment succeeded");

        // Replay attempt should fail (nonce already used)
        vm.expectRevert(SplitHubPayments.InvalidNonce.selector);
        payments.executePayment(auth, signature);

        console.log("Replay attack prevented!");
    }
}
