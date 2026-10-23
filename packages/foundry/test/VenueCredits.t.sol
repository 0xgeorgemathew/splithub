// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Test } from "forge-std/Test.sol";
import { VenueCredits } from "../contracts/VenueCredits.sol";
import { SplitHubRegistry } from "../contracts/SplitHubRegistry.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC6 is ERC20 {
    constructor() ERC20("USD Coin", "USDC") { }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract VenueCreditsTest is Test {
    SplitHubRegistry registry;
    VenueCredits credits;
    MockUSDC6 usdc;

    address constant GUEST = address(0xBEEF);
    address constant VENUE_OWNER = address(0xA11CE);
    address constant OTHER_OWNER = address(0xB0B);
    address constant TERMINAL = address(0x7E57);

    uint256 constant CHIP_PK = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 constant OTHER_CHIP_PK = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;

    uint256 venueId;

    function setUp() public {
        registry = new SplitHubRegistry();
        usdc = new MockUSDC6();
        credits = new VenueCredits(address(usdc), address(registry));

        _registerChip(CHIP_PK, GUEST);
        usdc.mint(GUEST, 1000e6);
        vm.prank(GUEST);
        usdc.approve(address(credits), type(uint256).max);

        vm.prank(VENUE_OWNER);
        venueId = credits.createVenue();
    }

    function _registerChip(uint256 chipPk, address owner) internal {
        address chip = vm.addr(chipPk);
        bytes32 digest = registry.getDigest(owner, chip);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(chipPk, digest);
        registry.register(chip, owner, abi.encodePacked(r, s, v));
    }

    function _purchase(uint256 venue, uint256 usdcAmount) internal view returns (VenueCredits.CreditPurchase memory) {
        return VenueCredits.CreditPurchase({
            venueId: venue,
            buyer: GUEST,
            usdcAmount: usdcAmount,
            nonce: credits.nonces(GUEST),
            deadline: block.timestamp + 1 hours
        });
    }

    function _spend(uint256 venue, uint256 amount, uint256 stallId)
        internal
        view
        returns (VenueCredits.CreditSpend memory)
    {
        return VenueCredits.CreditSpend({
            venueId: venue,
            spender: GUEST,
            amount: amount,
            stallId: stallId,
            nonce: credits.nonces(GUEST),
            deadline: block.timestamp + 1 hours
        });
    }

    function _sign(uint256 pk, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function _topUp(uint256 venue, uint256 usdcAmount) internal {
        VenueCredits.CreditPurchase memory p = _purchase(venue, usdcAmount);
        bytes memory sig = _sign(CHIP_PK, credits.getPurchaseDigest(p));
        vm.prank(TERMINAL);
        credits.purchaseCredits(p, sig);
    }

    function _spendAt(uint256 venue, uint256 amount, uint256 stallId) internal {
        VenueCredits.CreditSpend memory sp = _spend(venue, amount, stallId);
        bytes memory sig = _sign(CHIP_PK, credits.getSpendDigest(sp));
        vm.prank(TERMINAL);
        credits.spendCredits(sp, sig);
    }

    function test_CreateVenue() public view {
        (address owner, bool open, uint256 usdcBalance, uint256 outstanding) = credits.venues(venueId);
        assertEq(owner, VENUE_OWNER);
        assertTrue(open);
        assertEq(usdcBalance, 0);
        assertEq(outstanding, 0);
        assertEq(credits.venueCount(), 1);
    }

    function test_TopUpMintsVenueCredits() public {
        _topUp(venueId, 25e6);

        assertEq(credits.creditsOf(venueId, GUEST), 250e6);
        assertEq(usdc.balanceOf(address(credits)), 25e6);
        assertEq(usdc.balanceOf(GUEST), 975e6);
        assertEq(credits.nonces(GUEST), 1);
    }

    function test_SpendBurnsCredits() public {
        _topUp(venueId, 10e6);

        vm.expectEmit(true, true, true, true);
        emit VenueCredits.CreditsSpent(venueId, GUEST, 30e6, 7, vm.addr(CHIP_PK));
        _spendAt(venueId, 30e6, 7);

        assertEq(credits.creditsOf(venueId, GUEST), 70e6);
        (,,, uint256 outstanding) = credits.venues(venueId);
        assertEq(outstanding, 70e6);
    }

    function test_CreditsAreScopedToTheirVenue() public {
        vm.prank(OTHER_OWNER);
        uint256 otherVenue = credits.createVenue();

        _topUp(venueId, 10e6);
        assertEq(credits.creditsOf(otherVenue, GUEST), 0);

        VenueCredits.CreditSpend memory sp = _spend(otherVenue, 1e6, 1);
        bytes memory sig = _sign(CHIP_PK, credits.getSpendDigest(sp));
        vm.expectRevert(VenueCredits.InsufficientCredits.selector);
        credits.spendCredits(sp, sig);
    }

    function test_RevertWhen_SpendingMoreThanBalance() public {
        _topUp(venueId, 1e6);
        VenueCredits.CreditSpend memory sp = _spend(venueId, 11e6, 1);
        bytes memory sig = _sign(CHIP_PK, credits.getSpendDigest(sp));
        vm.expectRevert(VenueCredits.InsufficientCredits.selector);
        credits.spendCredits(sp, sig);
    }

    function test_RevertWhen_ChipNotRegisteredToGuest() public {
        VenueCredits.CreditPurchase memory p = _purchase(venueId, 1e6);
        bytes memory sig = _sign(OTHER_CHIP_PK, credits.getPurchaseDigest(p));
        vm.expectRevert(VenueCredits.UnauthorizedSigner.selector);
        credits.purchaseCredits(p, sig);
    }

    function test_RevertWhen_SignatureReplayed() public {
        VenueCredits.CreditPurchase memory p = _purchase(venueId, 1e6);
        bytes memory sig = _sign(CHIP_PK, credits.getPurchaseDigest(p));
        credits.purchaseCredits(p, sig);
        vm.expectRevert(VenueCredits.InvalidNonce.selector);
        credits.purchaseCredits(p, sig);
    }

    function test_RevertWhen_Expired() public {
        VenueCredits.CreditPurchase memory p = _purchase(venueId, 1e6);
        bytes memory sig = _sign(CHIP_PK, credits.getPurchaseDigest(p));
        vm.warp(block.timestamp + 2 hours);
        vm.expectRevert(VenueCredits.ExpiredSignature.selector);
        credits.purchaseCredits(p, sig);
    }

    function test_RevertWhen_VenueClosedOrUnknown() public {
        vm.prank(VENUE_OWNER);
        credits.setVenueOpen(venueId, false);

        VenueCredits.CreditPurchase memory p = _purchase(venueId, 1e6);
        bytes memory sig = _sign(CHIP_PK, credits.getPurchaseDigest(p));
        vm.expectRevert(VenueCredits.VenueClosed.selector);
        credits.purchaseCredits(p, sig);

        p = _purchase(99, 1e6);
        sig = _sign(CHIP_PK, credits.getPurchaseDigest(p));
        vm.expectRevert(VenueCredits.UnknownVenue.selector);
        credits.purchaseCredits(p, sig);
    }

    function test_OwnerWithdrawsOnlySpentUsdc() public {
        _topUp(venueId, 10e6); // 100 credits
        assertEq(credits.withdrawable(venueId), 0);

        _spendAt(venueId, 40e6, 1); // 4 USDC earned
        assertEq(credits.withdrawable(venueId), 4e6);

        vm.prank(VENUE_OWNER);
        credits.withdraw(venueId, VENUE_OWNER);
        assertEq(usdc.balanceOf(VENUE_OWNER), 4e6);
        assertEq(credits.withdrawable(venueId), 0);

        vm.prank(VENUE_OWNER);
        vm.expectRevert(VenueCredits.ZeroAmount.selector);
        credits.withdraw(venueId, VENUE_OWNER);
    }

    function test_RevertWhen_NonOwnerManagesVenue() public {
        _topUp(venueId, 10e6);
        _spendAt(venueId, 100e6, 1);

        vm.startPrank(OTHER_OWNER);
        vm.expectRevert(VenueCredits.NotVenueOwner.selector);
        credits.withdraw(venueId, OTHER_OWNER);
        vm.expectRevert(VenueCredits.NotVenueOwner.selector);
        credits.setVenueOpen(venueId, false);
        vm.expectRevert(VenueCredits.NotVenueOwner.selector);
        credits.refundCredits(venueId, GUEST);
        vm.stopPrank();
    }

    function test_RefundReturnsUnspentCreditsAsUsdc() public {
        _topUp(venueId, 10e6); // 100 credits
        _spendAt(venueId, 35e6, 1); // 65 left

        vm.prank(VENUE_OWNER);
        credits.refundCredits(venueId, GUEST);

        assertEq(credits.creditsOf(venueId, GUEST), 0);
        assertEq(usdc.balanceOf(GUEST), 990e6 + 6.5e6);

        // Everything the guest spent is now withdrawable, and nothing more.
        assertEq(credits.withdrawable(venueId), 3.5e6);
        vm.prank(VENUE_OWNER);
        credits.withdraw(venueId, VENUE_OWNER);
        assertEq(usdc.balanceOf(address(credits)), 0);
    }

    function test_RefundStillWorksWhenClosedAndAfterWithdraw() public {
        _topUp(venueId, 10e6);
        _spendAt(venueId, 33e6, 1);

        vm.startPrank(VENUE_OWNER);
        credits.withdraw(venueId, VENUE_OWNER);
        credits.setVenueOpen(venueId, false);
        credits.refundCredits(venueId, GUEST);
        vm.stopPrank();

        assertEq(credits.creditsOf(venueId, GUEST), 0);
        assertEq(usdc.balanceOf(GUEST) + usdc.balanceOf(VENUE_OWNER) + usdc.balanceOf(address(credits)), 1000e6);
    }

    function testFuzz_UnspentCreditsStayBacked(uint96 topUp, uint96 spend) public {
        uint256 usdcAmount = bound(uint256(topUp), 1, 1000e6);
        _topUp(venueId, usdcAmount);
        uint256 spent = bound(uint256(spend), 1, usdcAmount * 10);
        _spendAt(venueId, spent, 1);

        vm.startPrank(VENUE_OWNER);
        if (credits.withdrawable(venueId) > 0) credits.withdraw(venueId, VENUE_OWNER);
        if (credits.creditsOf(venueId, GUEST) > 0) credits.refundCredits(venueId, GUEST);
        vm.stopPrank();

        (,, uint256 usdcBalance, uint256 outstanding) = credits.venues(venueId);
        assertEq(outstanding, 0);
        assertEq(usdc.balanceOf(address(credits)), usdcBalance);
    }

    function test_TransferVenueOwnership() public {
        vm.prank(VENUE_OWNER);
        credits.transferVenueOwnership(venueId, OTHER_OWNER);
        (address owner,,,) = credits.venues(venueId);
        assertEq(owner, OTHER_OWNER);
    }
}
