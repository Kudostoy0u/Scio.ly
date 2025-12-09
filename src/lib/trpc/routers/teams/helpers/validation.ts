import { dbPg } from "@/lib/db";
import { newTeamMemberships, newTeamUnits } from "@/lib/db/schema/teams";
import { upsertUserProfile } from "@/lib/db/teams/utils";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import logger from "@/lib/utils/logging/logger";
import {
	getTeamAccess,
	getTeamAccessCockroach,
} from "@/lib/utils/teams/access";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { getTeamMembersForGroup } from "./data-access";
import { findMatchingTeamMember } from "./data-processing";

export async function checkTeamAccessOrThrow(userId: string, groupId: string) {
	const teamAccess = await getTeamAccess(userId, groupId);
	if (!teamAccess.hasAccess) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Not authorized to access this team",
		});
	}
}

export async function checkTeamGroupAccessOrThrow(
	userId: string,
	groupId: string,
) {
	const access = await getTeamAccessCockroach(userId, groupId);
	if (!access.hasAccess) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Not authorized to access this team",
		});
	}
}

export async function validateSubteamBelongsToGroup(
	subteamId: string,
	groupId: string,
) {
	const subteamResult = await dbPg
		.select({ id: newTeamUnits.id })
		.from(newTeamUnits)
		.where(
			and(
				eq(newTeamUnits.id, subteamId),
				eq(newTeamUnits.groupId, groupId),
				eq(newTeamUnits.status, "active"),
			),
		);

	if (subteamResult.length === 0) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Subteam not found",
		});
	}
}

export async function determineUserIdToLink(
	providedUserId: string | undefined,
	studentName: string | undefined,
	groupId: string,
): Promise<string | null> {
	if (providedUserId) {
		return providedUserId;
	}

	if (!studentName?.trim()) {
		return null;
	}

	const teamMembers = await getTeamMembersForGroup(groupId);
	return findMatchingTeamMember(teamMembers, studentName);
}

export function buildSubteamWhereCondition(
	groupId: string,
	subteamId?: string,
) {
	const baseConditions = [
		eq(newTeamUnits.groupId, groupId),
		eq(newTeamUnits.status, "active"),
		eq(newTeamMemberships.status, "active"),
	];

	if (subteamId && subteamId !== "all") {
		return and(...baseConditions, eq(newTeamMemberships.teamId, subteamId));
	}

	return and(...baseConditions);
}

export async function ensureUserDisplayName(
	userId: string,
	userEmail?: string,
) {
	try {
		const supabase = await createSupabaseServerClient();
		const { data: existingProfile } = await supabase
			.from("users")
			.select("id, email, display_name, first_name, last_name, username")
			.eq("id", userId)
			.maybeSingle();

		const existingProfileTyped = existingProfile as {
			email?: string;
			display_name?: string;
			first_name?: string;
			last_name?: string;
			username?: string;
		} | null;
		const email = existingProfileTyped?.email || userEmail;
		const currentDisplay = existingProfileTyped?.display_name;
		const firstName = existingProfileTyped?.first_name;
		const lastName = existingProfileTyped?.last_name;
		const username = existingProfileTyped?.username;

		const emailLocal = email?.includes("@") ? email.split("@")[0] : undefined;
		const derivedDisplayName = (() => {
			if (currentDisplay?.trim()) {
				return undefined;
			}
			if (firstName && lastName) {
				return `${firstName.trim()} ${lastName.trim()}`;
			}
			if (firstName?.trim()) {
				return firstName.trim();
			}
			if (lastName?.trim()) {
				return lastName.trim();
			}
			if (username?.trim()) {
				return username.trim();
			}
			if (emailLocal?.trim()) {
				return emailLocal.trim();
			}
			return undefined;
		})();

		if (derivedDisplayName && email) {
			logger.dev.structured("info", "Auto-filling display_name", {
				userId,
				derivedDisplayName,
			});
			await (
				supabase.from("users") as unknown as {
					upsert: (
						values: Record<string, unknown>,
						options?: { onConflict?: string },
					) => Promise<{ error: unknown }>;
				}
			).upsert(
				{
					id: userId,
					email,
					display_name: derivedDisplayName,
				} as Record<string, unknown>,
				{ onConflict: "id" },
			);
			await upsertUserProfile({
				id: userId,
				email,
				displayName: derivedDisplayName,
				username: username || emailLocal || undefined,
			});
		}
	} catch (error) {
		logger.warn("Failed to auto-fill display_name", error);
	}
}
