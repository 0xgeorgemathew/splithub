import { NextRequest, NextResponse } from "next/server";
import { getEvidenceResponse } from "~~/services/store/evidenceStore";

export const dynamic = "force-dynamic";

/** Validation response documents are only served from their R2 snapshot: they are not reconstructible. */
export async function GET(request: NextRequest) {
  const stored = await getEvidenceResponse("validation-response", request.nextUrl.searchParams.get("validationId"));
  return (
    stored ??
    NextResponse.json({ type: "splithub-erc8004-validation-response/v1", status: "not_found" }, { status: 404 })
  );
}
