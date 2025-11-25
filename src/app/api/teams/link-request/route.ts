import { getServerUser } from "@/lib/supabaseServer";
// Notifications removed from new architecture
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { targetUsername, school, division, teamId, memberName } = await req.json();
    if (!(targetUsername && school && division && teamId && memberName)) {
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
    }
    const supabase = await createSupabaseServerClient();
    const { data: target } = await supabase
      .from("users")
      .select("id, username")
      .ilike("username", targetUsername)
      .maybeSingle();
    if (!(target as { id?: string } | null)?.id) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    // no-op: linking notifications removed
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
