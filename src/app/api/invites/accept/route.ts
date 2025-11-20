import { acceptInvite } from "@/lib/db/teamExtras";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { inviteId } = await req.json();
    if (!inviteId) {
      return NextResponse.json({ success: false, error: "Missing inviteId" }, { status: 400 });
    }
    const inv = await acceptInvite(Number(inviteId));
    if (!inv) {
      return NextResponse.json({ success: false, error: "Invalid invite" }, { status: 400 });
    }
    const teamCode = `${inv.school}::${inv.division}::${inv.team_id}`;
    await supabase.from("users").update({ team_code: teamCode }).eq("id", user.id);
    return NextResponse.json({ success: true, data: { teamCode } });
  } catch {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
