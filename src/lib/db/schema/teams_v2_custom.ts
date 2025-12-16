/**
 * Custom schema extensions for teams_v2
 * This file adds indexes that are not auto-generated
 */

import {
	cockroachTable,
	index,
	string,
	timestamp,
	uuid,
} from "drizzle-orm/cockroach-core";

// Re-define teams_link_invitation with indexes
export const teamsLinkInvitationWithIndexes = cockroachTable(
	"teams_link_invitation",
	{
		id: uuid().defaultRandom().primaryKey(),
		teamId: uuid("team_id").notNull(),
		rosterDisplayName: string("roster_display_name").notNull(),
		invitedUsername: string("invited_username").notNull(),
		invitedBy: uuid("invited_by").notNull(),
		status: string().default("pending").notNull(),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		})
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		})
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		statusUsernameIdx: index("idx_teams_link_invitation_status_username").on(
			table.status,
			table.invitedUsername,
		),
		teamStatusIdx: index("idx_teams_link_invitation_team_status").on(
			table.teamId,
			table.status,
			table.rosterDisplayName,
		),
	}),
);
