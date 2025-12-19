import { dbPg } from "@/lib/db";
import {
	teamMemberships,
	teamRoster,
	teamSubteams,
	teams,
} from "@/lib/db/schema";
import { bumpTeamVersion } from "@/lib/server/teams/shared";
import { getServerUser } from "@/lib/supabaseServer";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

type BlockOverrides = {
	added?: string[];
	removed?: string[];
};

type SubteamRosterConfigV1 = {
	v: 1;
	description?: string | null;
	blocks?: Record<string, BlockOverrides>;
};

function isObject(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeEventName(value: string) {
	return value.trim().replace(/\s+/g, " ");
}

function dedupeNonEmpty(values: string[]) {
	const out: string[] = [];
	const seen = new Set<string>();
	for (const raw of values) {
		const normalized = normalizeEventName(raw);
		if (!normalized) continue;
		const key = normalized.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(normalized);
	}
	return out;
}

function parseSubteamConfig(
	rawDescription: string | null,
): SubteamRosterConfigV1 {
	if (!rawDescription) {
		return { v: 1, description: null, blocks: {} };
	}
	try {
		const parsed = JSON.parse(rawDescription) as unknown;
		if (!isObject(parsed) || parsed.v !== 1) {
			return { v: 1, description: rawDescription, blocks: {} };
		}
		const blocksRaw = isObject(parsed.blocks) ? parsed.blocks : {};
		const blocks: Record<string, BlockOverrides> = {};
		for (const [label, value] of Object.entries(blocksRaw)) {
			if (!isObject(value)) continue;
			const added = Array.isArray(value.added)
				? dedupeNonEmpty(value.added.filter((x) => typeof x === "string"))
				: [];
			const removed = Array.isArray(value.removed)
				? dedupeNonEmpty(value.removed.filter((x) => typeof x === "string"))
				: [];
			if (added.length || removed.length) {
				blocks[label] = { added, removed };
			}
		}

		return {
			v: 1,
			description:
				typeof parsed.description === "string" ? parsed.description : null,
			blocks,
		};
	} catch {
		return { v: 1, description: rawDescription, blocks: {} };
	}
}

function stringifySubteamConfig(config: SubteamRosterConfigV1) {
	return JSON.stringify({
		v: 1,
		description: config.description ?? null,
		blocks: config.blocks ?? {},
	} satisfies SubteamRosterConfigV1);
}

async function requireUserId() {
	const user = await getServerUser();
	return user?.id ?? null;
}

async function getTeamBySlug(teamSlug: string) {
	const [team] = await dbPg
		.select({ id: teams.id })
		.from(teams)
		.where(eq(teams.slug, teamSlug))
		.limit(1);
	return team ?? null;
}

async function getMembership(teamId: string, userId: string) {
	const [membership] = await dbPg
		.select({ role: teamMemberships.role, status: teamMemberships.status })
		.from(teamMemberships)
		.where(
			and(
				eq(teamMemberships.teamId, teamId),
				eq(teamMemberships.userId, userId),
			),
		)
		.limit(1);
	return membership ?? null;
}

async function assertSubteamBelongsToTeam(teamId: string, subteamId: string) {
	const [subteam] = await dbPg
		.select({
			id: teamSubteams.id,
			description: teamSubteams.description,
		})
		.from(teamSubteams)
		.where(and(eq(teamSubteams.teamId, teamId), eq(teamSubteams.id, subteamId)))
		.limit(1);
	return subteam ?? null;
}

const uuidSchema = z.uuid();

// GET /api/teams/[teamId]/removed-events?subteamId=...
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
) {
	const userId = await requireUserId();
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { teamId: teamSlug } = await params;
	const { searchParams } = new URL(request.url);
	const subteamId = searchParams.get("subteamId");
	if (!subteamId) {
		return NextResponse.json(
			{ error: "subteamId is required" },
			{ status: 400 },
		);
	}

	const parsed = uuidSchema.safeParse(subteamId);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid subteamId" }, { status: 400 });
	}

	const team = await getTeamBySlug(teamSlug);
	if (!team) {
		return NextResponse.json({ error: "Team not found" }, { status: 404 });
	}

	const membership = await getMembership(team.id, userId);
	if (!membership || membership.status !== "active") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const subteam = await assertSubteamBelongsToTeam(team.id, subteamId);
	if (!subteam) {
		return NextResponse.json({ error: "Subteam not found" }, { status: 404 });
	}

	const config = parseSubteamConfig(subteam.description ?? null);
	return NextResponse.json({ blocks: config.blocks ?? {} });
}

const postSchema = z.object({
	subteamId: uuidSchema,
	eventName: z.string().min(1).max(100),
	conflictBlock: z.string().min(1).max(50),
	mode: z.enum(["remove", "add"]).optional(),
});

// POST /api/teams/[teamId]/removed-events
// - {subteamId,eventName,conflictBlock} => remove (hide) event
// - {subteamId,eventName,conflictBlock,mode:"add"} => add custom event to block
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
) {
	const userId = await requireUserId();
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { teamId: teamSlug } = await params;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const parsed = postSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid request" }, { status: 400 });
	}

	const team = await getTeamBySlug(teamSlug);
	if (!team) {
		return NextResponse.json({ error: "Team not found" }, { status: 404 });
	}

	const membership = await getMembership(team.id, userId);
	if (!membership || membership.status !== "active") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
	if (
		(membership.role as string) !== "captain" &&
		(membership.role as string) !== "admin"
	) {
		return NextResponse.json(
			{ error: "Only captains can modify events" },
			{ status: 403 },
		);
	}

	const { subteamId, conflictBlock } = parsed.data;
	const eventName = normalizeEventName(parsed.data.eventName);
	const mode = parsed.data.mode ?? "remove";

	const subteam = await assertSubteamBelongsToTeam(team.id, subteamId);
	if (!subteam) {
		return NextResponse.json({ error: "Subteam not found" }, { status: 404 });
	}

	const config = parseSubteamConfig(subteam.description ?? null);
	const blocks = config.blocks ?? {};
	const current = blocks[conflictBlock] ?? {};
	const added = dedupeNonEmpty(current.added ?? []);
	const removed = dedupeNonEmpty(current.removed ?? []);

	if (mode === "add") {
		const nextAdded = dedupeNonEmpty([...added, eventName]);
		const nextRemoved = removed.filter(
			(e) => e.toLowerCase() !== eventName.toLowerCase(),
		);
		blocks[conflictBlock] = { added: nextAdded, removed: nextRemoved };
	} else {
		const nextRemoved = dedupeNonEmpty([...removed, eventName]);
		const nextAdded = added.filter(
			(e) => e.toLowerCase() !== eventName.toLowerCase(),
		);
		blocks[conflictBlock] = { added: nextAdded, removed: nextRemoved };
	}

	await dbPg.transaction(async (tx) => {
		await tx
			.update(teamSubteams)
			.set({
				description: stringifySubteamConfig({ ...config, blocks }),
				updatedAt: new Date().toISOString(),
			})
			.where(eq(teamSubteams.id, subteamId));

		if (mode === "remove") {
			await tx
				.delete(teamRoster)
				.where(
					and(
						eq(teamRoster.teamId, team.id),
						eq(teamRoster.subteamId, subteamId),
						eq(teamRoster.eventName, eventName),
					),
				);
		}

		await bumpTeamVersion(team.id, tx);
	});

	return NextResponse.json({ ok: true });
}

const deleteSchema = z.object({
	subteamId: uuidSchema,
	conflictBlock: z.string().min(1).max(50),
	mode: z.enum(["restore", "reset"]).optional(),
});

// DELETE /api/teams/[teamId]/removed-events
// - {subteamId,conflictBlock} => restore removed events only
// - {subteamId,conflictBlock,mode:"reset"} => clear both removed + added for block
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
) {
	const userId = await requireUserId();
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { teamId: teamSlug } = await params;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const parsed = deleteSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid request" }, { status: 400 });
	}

	const team = await getTeamBySlug(teamSlug);
	if (!team) {
		return NextResponse.json({ error: "Team not found" }, { status: 404 });
	}

	const membership = await getMembership(team.id, userId);
	if (!membership || membership.status !== "active") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
	if (
		(membership.role as string) !== "captain" &&
		(membership.role as string) !== "admin"
	) {
		return NextResponse.json(
			{ error: "Only captains and admins can modify events" },
			{ status: 403 },
		);
	}

	const { subteamId, conflictBlock } = parsed.data;
	const mode = parsed.data.mode ?? "restore";

	const subteam = await assertSubteamBelongsToTeam(team.id, subteamId);
	if (!subteam) {
		return NextResponse.json({ error: "Subteam not found" }, { status: 404 });
	}

	const config = parseSubteamConfig(subteam.description ?? null);
	const blocks = config.blocks ?? {};
	const current = blocks[conflictBlock] ?? {};

	const added = dedupeNonEmpty(current.added ?? []);

	let rosterCleanupEvents: string[] = [];
	if (mode === "reset") {
		rosterCleanupEvents = added;
		delete blocks[conflictBlock];
	} else {
		blocks[conflictBlock] = { added, removed: [] };
	}

	await dbPg.transaction(async (tx) => {
		await tx
			.update(teamSubteams)
			.set({
				description: stringifySubteamConfig({ ...config, blocks }),
				updatedAt: new Date().toISOString(),
			})
			.where(eq(teamSubteams.id, subteamId));

		if (rosterCleanupEvents.length) {
			for (const eventName of rosterCleanupEvents) {
				await tx
					.delete(teamRoster)
					.where(
						and(
							eq(teamRoster.teamId, team.id),
							eq(teamRoster.subteamId, subteamId),
							eq(teamRoster.eventName, eventName),
						),
					);
			}
		}

		await bumpTeamVersion(team.id, tx);
	});

	return NextResponse.json({ ok: true });
}
