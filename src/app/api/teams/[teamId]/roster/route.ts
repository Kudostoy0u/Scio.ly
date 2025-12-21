import { dbPg } from "@/lib/db";
import { teamRoster } from "@/lib/db/schema";
import { getServerUser } from "@/lib/supabaseServer";
import {
	handleError,
	handleForbiddenError,
	handleUnauthorizedError,
} from "@/lib/utils/teams/errors";
import {
	getUserTeamMemberships,
	resolveTeamSlugToUnits,
} from "@/lib/utils/teams/resolver";
import { and, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
) {
	try {
		const user = await getServerUser();
		if (!user?.id) return handleUnauthorizedError();

		const { teamId } = await params;
		const { searchParams } = new URL(request.url);
		const subteamId = searchParams.get("subteamId");

		const teamInfo = await resolveTeamSlugToUnits(teamId);
		const memberships = await getUserTeamMemberships(
			user.id,
			teamInfo.subteamIds,
		);
		if (memberships.length === 0) return handleForbiddenError();

		const rosterResult = await dbPg
			.select({
				event_name: teamRoster.eventName,
				slot_index: teamRoster.slotIndex,
				student_name: teamRoster.displayName,
				user_id: teamRoster.userId,
			})
			.from(teamRoster)
			.where(
				and(
					eq(teamRoster.teamId, teamInfo.teamId),
					subteamId ? eq(teamRoster.subteamId, subteamId) : sql`TRUE`,
				),
			);

		const roster: Record<string, string[]> = {};
		for (const row of rosterResult) {
			const name = row.event_name;
			if (!roster[name]) roster[name] = [];
			roster[name][row.slot_index] = row.student_name || "";
		}

		return NextResponse.json({ roster, removedEvents: [] });
	} catch (error) {
		return handleError(error, "GET /api/teams/[teamId]/roster");
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
) {
	try {
		const user = await getServerUser();
		if (!user?.id) return handleUnauthorizedError();

		const { teamId } = await params;
		const body = await request.json();
		const { subteamId, eventName, slotIndex, studentName, userId } = body;

		const teamInfo = await resolveTeamSlugToUnits(teamId);
		const memberships = await getUserTeamMemberships(
			user.id,
			teamInfo.subteamIds,
		);
		const isCaptain = memberships.some(
			(m) => m.role === "captain" || m.role === "admin",
		);
		if (!isCaptain) return handleForbiddenError();

		await dbPg
			.insert(teamRoster)
			.values({
				teamId: teamInfo.teamId,
				subteamId: subteamId,
				eventName: eventName,
				slotIndex: slotIndex,
				displayName: studentName,
				userId: userId,
			})
			.onConflictDoUpdate({
				target: [
					teamRoster.teamId,
					teamRoster.subteamId,
					teamRoster.eventName,
					teamRoster.slotIndex,
				],
				set: {
					displayName: studentName,
					userId: userId,
					updatedAt: sql`now()`,
				},
			});

		return NextResponse.json({ message: "Roster data saved successfully" });
	} catch (error) {
		return handleError(error, "POST /api/teams/[teamId]/roster");
	}
}
