import { NextRequest, NextResponse } from "next/server";
import { getUserTapLimit, setUserTapLimit } from "~~/services/userService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json({ error: "Missing walletAddress parameter" }, { status: 400 });
    }

    const tapLimitUsd = await getUserTapLimit(walletAddress);
    return NextResponse.json({ walletAddress: walletAddress.toLowerCase(), tapLimitUsd: tapLimitUsd.toFixed(2) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load tap limit" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, tapLimitUsd } = (await request.json()) as {
      walletAddress?: string;
      tapLimitUsd?: number | string;
    };

    if (!walletAddress) {
      return NextResponse.json({ error: "Missing walletAddress" }, { status: 400 });
    }

    const numericLimit =
      typeof tapLimitUsd === "string"
        ? Number.parseFloat(tapLimitUsd)
        : typeof tapLimitUsd === "number"
          ? tapLimitUsd
          : NaN;

    if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
      return NextResponse.json({ error: "tapLimitUsd must be greater than 0" }, { status: 400 });
    }

    const user = await setUserTapLimit(walletAddress, numericLimit);

    return NextResponse.json({
      walletAddress: user.wallet_address,
      tapLimitUsd: (user.tap_limit_usd ?? numericLimit).toFixed(2),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save tap limit" },
      { status: 500 },
    );
  }
}
