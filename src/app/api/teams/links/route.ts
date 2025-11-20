import { type NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  // Purged legacy links endpoint; use team_code on user profile instead
  return NextResponse.json({ success: true, data: null });
}
