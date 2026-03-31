import { NextRequest, NextResponse } from "next/server";
import { clearVincentSession } from "~~/lib/vincent";

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ success: true });
  clearVincentSession(response);
  return response;
}
