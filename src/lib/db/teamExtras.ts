import { and, desc, eq, sql } from "drizzle-orm";
import { dbPg } from "./index";
import { pool } from "./pool";
import {
	assignmentResults,
	assignments,
	invitesV2,
} from "./schema/assignments";

export async function initExtrasDatabase() {
	const client = await pool.connect();
	try {
		// Ensure extras tables exist (do not drop unrelated tables)

		await client.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        school VARCHAR(255) NOT NULL,
        division CHAR(1) NOT NULL CHECK (division IN ('B','C')),
        team_id VARCHAR(10) NOT NULL,
        event_name VARCHAR(255) NOT NULL,
        assignees JSONB NOT NULL,
        params JSONB NOT NULL,
        questions JSONB NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_assignments_team ON assignments(school, division, team_id);
    `);

		await client.query(`
      CREATE TABLE IF NOT EXISTS assignment_results (
        id SERIAL PRIMARY KEY,
        assignment_id INT NOT NULL,
        user_id VARCHAR(255),
        name VARCHAR(255),
        event_name VARCHAR(255),
        score NUMERIC,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        detail JSONB,
        CONSTRAINT fk_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
      );
    `);

		// New invites v2 table
		await client.query(`
      CREATE TABLE IF NOT EXISTS invites_v2 (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        inviter_user_id VARCHAR(255) NOT NULL,
        invitee_username VARCHAR(255) NOT NULL,
        invitee_user_id VARCHAR(255),
        school VARCHAR(255) NOT NULL,
        division CHAR(1) NOT NULL CHECK (division IN ('B','C')),
        team_id VARCHAR(10) NOT NULL,
        code UUID NOT NULL DEFAULT gen_random_uuid(),
        status VARCHAR(16) NOT NULL DEFAULT 'pending',
        CONSTRAINT uq_pending_invite UNIQUE (invitee_username, school, division, team_id, status)
      );
      CREATE INDEX IF NOT EXISTS idx_invites_v2_invitee ON invites_v2(invitee_username, status);
      CREATE INDEX IF NOT EXISTS idx_invites_v2_team ON invites_v2(school, division, team_id);
    `);
	} finally {
		client.release();
	}
}

// Purged legacy notifications/linking helpers

export async function createAssignment(data: {
	school: string;
	division: "B" | "C";
	teamId: string;
	eventName: string;
	assignees: Array<{ name: string; userId?: string }>;
	params: unknown;
	questions: unknown;
	createdBy: string;
}) {
	await initExtrasDatabase();
	const [assignment] = await dbPg
		.insert(assignments)
		.values({
			school: data.school,
			division: data.division,
			teamId: data.teamId,
			eventName: data.eventName,
			assignees: data.assignees,
			params: data.params,
			questions: data.questions,
			createdBy: data.createdBy,
		})
		.returning();

	// Notification dispatch removed in new architecture

	return assignment;
}

export async function listRecentAssignments(
	school: string,
	division: "B" | "C",
) {
	await initExtrasDatabase();
	const rows = await dbPg
		.select({
			id: assignments.id,
			event_name: assignments.eventName,
			created_at: assignments.createdAt,
			assignees: assignments.assignees,
		})
		.from(assignments)
		.where(
			and(eq(assignments.school, school), eq(assignments.division, division)),
		)
		.orderBy(desc(assignments.createdAt))
		.limit(50);
	return rows;
}

export async function listRecentResults(school: string, division: "B" | "C") {
	await initExtrasDatabase();
	const rows = await dbPg
		.select({
			id: assignmentResults.id,
			assignment_id: assignmentResults.assignmentId,
			user_id: assignmentResults.userId,
			name: assignmentResults.name,
			event_name: assignments.eventName,
			score: assignmentResults.score,
			submitted_at: assignmentResults.submittedAt,
			detail: assignmentResults.detail,
		})
		.from(assignmentResults)
		.innerJoin(assignments, eq(assignmentResults.assignmentId, assignments.id))
		.where(
			and(eq(assignments.school, school), eq(assignments.division, division)),
		)
		.orderBy(desc(assignmentResults.submittedAt))
		.limit(100);
	return rows;
}

export async function deleteAssignmentResult(id: number | string) {
	await initExtrasDatabase();
	await dbPg
		.delete(assignmentResults)
		.where(eq(assignmentResults.id, Number(id)));
	return true;
}

export async function deleteAssignment(id: number | string) {
	await initExtrasDatabase();
	await dbPg.delete(assignments).where(eq(assignments.id, Number(id)));
	return true;
}

export async function getAssignmentById(id: number | string) {
	await initExtrasDatabase();
	const [assignment] = await dbPg
		.select()
		.from(assignments)
		.where(eq(assignments.id, Number(id)))
		.limit(1);
	return assignment || null;
}

// Invites v2 helpers
export async function createInvite(
	inviterUserId: string,
	inviteeUsername: string,
	school: string,
	division: "B" | "C",
	teamId: string,
) {
	await initExtrasDatabase();
	// If a pending exists, return it; else insert
	const [existing] = await dbPg
		.select()
		.from(invitesV2)
		.where(
			and(
				eq(invitesV2.inviteeUsername, inviteeUsername),
				eq(invitesV2.school, school),
				eq(invitesV2.division, division),
				eq(invitesV2.teamId, teamId),
				eq(invitesV2.status, "pending"),
			),
		)
		.limit(1);
	if (existing) {
		return existing;
	}
	const [invite] = await dbPg
		.insert(invitesV2)
		.values({
			inviterUserId,
			inviteeUsername,
			school,
			division,
			teamId,
		})
		.returning();
	return invite;
}

export async function listInvitesByUsername(inviteeUsername: string) {
	await initExtrasDatabase();
	const rows = await dbPg
		.select()
		.from(invitesV2)
		.where(
			and(
				eq(invitesV2.inviteeUsername, inviteeUsername),
				eq(invitesV2.status, "pending"),
			),
		)
		.orderBy(desc(invitesV2.createdAt));
	return rows;
}

export async function acceptInvite(inviteId: number) {
	await initExtrasDatabase();
	return await dbPg.transaction(async (tx) => {
		// Use FOR UPDATE to lock the row - using raw SQL for FOR UPDATE clause
		const result = await tx.execute(
			sql`SELECT * FROM invites_v2 WHERE id = ${inviteId} FOR UPDATE LIMIT 1`,
		);
		const rows = result.rows as Array<{
			id: number;
			created_at: Date;
			inviter_user_id: string;
			invitee_username: string;
			invitee_user_id: string | null;
			school: string;
			division: string;
			team_id: string;
			code: string;
			status: string;
		}>;
		if (!rows || rows.length === 0) {
			return null;
		}
		const inv = rows[0];
		if (!inv || inv.status !== "pending") {
			return null;
		}
		// Update the invite to accepted
		await tx
			.update(invitesV2)
			.set({ status: "accepted" })
			.where(eq(invitesV2.id, inviteId));
		// Decline duplicates for same user+team
		await tx
			.update(invitesV2)
			.set({ status: "declined" })
			.where(
				and(
					eq(invitesV2.inviteeUsername, inv.invitee_username),
					eq(invitesV2.school, inv.school),
					eq(invitesV2.division, inv.division),
					eq(invitesV2.teamId, inv.team_id),
					eq(invitesV2.status, "pending"),
					sql`${invitesV2.id} <> ${inviteId}`,
				),
			);
		return {
			id: inv.id,
			createdAt: inv.created_at,
			inviterUserId: inv.inviter_user_id,
			inviteeUsername: inv.invitee_username,
			inviteeUserId: inv.invitee_user_id,
			school: inv.school,
			division: inv.division,
			teamId: inv.team_id,
			code: inv.code,
			status: inv.status,
		};
	});
}

export async function declineInvite(inviteId: number) {
	await initExtrasDatabase();
	await dbPg
		.update(invitesV2)
		.set({ status: "declined" })
		.where(and(eq(invitesV2.id, inviteId), eq(invitesV2.status, "pending")));
}
