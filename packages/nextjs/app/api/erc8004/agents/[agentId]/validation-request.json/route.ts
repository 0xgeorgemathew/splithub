import { NextRequest, NextResponse } from "next/server";
import { getEvidenceResponse } from "~~/services/store/evidenceStore";
import { buildLatestValidationRequestPayload } from "~~/services/storeService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const { agentId } = await params;
    const validationId = request.nextUrl.searchParams.get("validationId");
    // The exact document whose hash was committed onchain, when one was recorded.
    const stored = await getEvidenceResponse("validation-request", validationId);
    if (stored) return stored;

    const payload = await buildLatestValidationRequestPayload(agentId, validationId);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("ERC-8004 validation request payload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build validation request payload" },
      { status: 500 },
    );
  }
}
