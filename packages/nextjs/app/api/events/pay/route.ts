import { NextRequest, NextResponse } from "next/server";
import { TOKEN_DECIMALS } from "~~/config/tokens";
import { createStallPayment, updatePaymentStatus } from "~~/services/eventsService";
import { safeProcessCircleAutoSplit } from "~~/services/circleAutoSplitService";

export const dynamic = "force-dynamic";

interface CreateStallPaymentRequest {
  action: "create";
  stallId: number;
  eventId: number;
  payerWallet: string;
  tokenAddress: string;
  splitPercentage: number;
  amount: string;
}

interface CompleteStallPaymentRequest {
  action: "complete";
  paymentId: number;
  txHash: string;
  authAmountWei?: string;
  tokenDecimals?: number;
}

interface FailStallPaymentRequest {
  action: "fail";
  paymentId: number;
}

type StallPaymentRequest = CreateStallPaymentRequest | CompleteStallPaymentRequest | FailStallPaymentRequest;

function isCreateRequest(body: StallPaymentRequest): body is CreateStallPaymentRequest {
  return body.action === "create";
}

function isCompleteRequest(body: StallPaymentRequest): body is CompleteStallPaymentRequest {
  return body.action === "complete";
}

function isFailRequest(body: StallPaymentRequest): body is FailStallPaymentRequest {
  return body.action === "fail";
}

export async function POST(request: NextRequest) {
  try {
    const body: StallPaymentRequest = await request.json();

    if (isCreateRequest(body)) {
      const totalAmount = parseFloat(body.amount);
      const operatorAmount = (totalAmount * body.splitPercentage) / 100;
      const ownerAmount = totalAmount - operatorAmount;

      const payment = await createStallPayment({
        stall_id: body.stallId,
        event_id: body.eventId,
        payer_wallet: body.payerWallet.toLowerCase(),
        amount: totalAmount,
        token_address: body.tokenAddress.toLowerCase(),
        operator_amount: operatorAmount,
        owner_amount: ownerAmount,
      });

      return NextResponse.json({
        success: true,
        paymentId: payment.id,
      });
    }

    if (isCompleteRequest(body)) {
      const updatedPayment = await updatePaymentStatus(body.paymentId, "completed", body.txHash);

      const circleSplit = await safeProcessCircleAutoSplit({
        userWallet: updatedPayment.payer_wallet,
        amount:
          body.authAmountWei ??
          Math.round(updatedPayment.amount * 10 ** (body.tokenDecimals ?? TOKEN_DECIMALS.USDC)).toString(),
        tokenAddress: updatedPayment.token_address,
        decimals: body.tokenDecimals ?? TOKEN_DECIMALS.USDC,
      });

      return NextResponse.json({
        success: true,
        paymentId: updatedPayment.id,
        txHash: body.txHash,
        circleSplit,
      });
    }

    if (isFailRequest(body)) {
      const updatedPayment = await updatePaymentStatus(body.paymentId, "failed");

      return NextResponse.json({
        success: true,
        paymentId: updatedPayment.id,
      });
    }

    return NextResponse.json({ error: "Unsupported stall payment action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Stall payment error:", error);
    const message = error instanceof Error ? error.message : "Payment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
