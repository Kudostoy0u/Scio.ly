import { dbPg } from "@/lib/db";
import { teamRoster } from "@/lib/db/schema";
import { and, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";

export const RosterMemberSchema = z.union([
	z.string().min(1),
	z.object({
		user_id: z.string().uuid().optional().nullable(),
		student_name: z.string().optional(),
		display_name: z.string().optional(),
	}),
]);

export const CodebustersParamsSchema = z.object({
	questionCount: z.number().int().min(1).max(50),
	cipherTypes: z.array(z.string()).optional().default([]),
	division: z.enum(["B", "C", "any"]).optional().default("any"),
	charLengthMin: z.number().int().min(1).optional(),
	charLengthMax: z.number().int().min(1).optional(),
});

const CodebustersQuestionSchema = z
	.object({
		author: z.string(),
		quote: z.string(),
		cipherType: z.string(),
		division: z.string().optional(),
		charLength: z.number().int().optional(),
		encrypted: z.string(),
		key: z.string().optional().nullable(),
		kShift: z.number().int().optional(),
		plainAlphabet: z.string().optional(),
		cipherAlphabet: z.string().optional(),
		matrix: z.array(z.array(z.number())).optional(),
		decryptionMatrix: z.array(z.array(z.number())).optional(),
		portaKeyword: z.string().optional(),
		nihilistPolybiusKey: z.string().optional(),
		nihilistCipherKey: z.string().optional(),
		checkerboardRowKey: z.string().optional(),
		checkerboardColKey: z.string().optional(),
		checkerboardPolybiusKey: z.string().optional(),
		checkerboardUsesIJ: z.boolean().optional(),
		blockSize: z.number().int().optional(),
		columnarKey: z.string().optional(),
		fractionationTable: z.record(z.string(), z.string()).optional(),
		caesarShift: z.number().int().optional(),
		affineA: z.number().int().optional(),
		affineB: z.number().int().optional(),
		baconianBinaryType: z.string().optional(),
		cryptarithmData: z
			.object({
				equation: z.string(),
				numericExample: z.string().nullable().optional(),
				digitGroups: z.array(
					z.object({
						digits: z.string(),
						word: z.string(),
					}),
				),
			})
			.optional(),
		askForKeyword: z.boolean().optional(),
		points: z.number().optional(),
		difficulty: z.number().optional(),
	})
	.passthrough();

export const CodebustersAssignmentSchema = z.object({
	title: z.string().min(1),
	description: z.string().optional().nullable(),
	assignment_type: z.string().optional().nullable(),
	due_date: z.string().optional().nullable(),
	points: z.number().int().optional().nullable(),
	time_limit_minutes: z.number().int().optional().nullable(),
	event_name: z.string().optional().nullable(),
	roster_members: z.array(RosterMemberSchema).optional().default([]),
	codebusters_params: CodebustersParamsSchema,
	codebusters_questions: z.array(CodebustersQuestionSchema).optional(),
});

export type CodebustersAssignmentInput = z.infer<
	typeof CodebustersAssignmentSchema
>;

type RosterMemberPayload = {
	userId: string;
	displayName: string;
	studentName: string;
};

export const resolveRosterMembers = async (
	teamId: string,
	subteamId: string | null,
	eventName: string,
	rosterMembers: Array<z.infer<typeof RosterMemberSchema>>,
): Promise<RosterMemberPayload[]> => {
	if (rosterMembers.length === 0) {
		return [];
	}

	const entries = rosterMembers.map((member) => {
		if (typeof member === "string") {
			return {
				userId: null,
				displayName: member,
				studentName: member,
			};
		}
		const displayName = member.display_name || member.student_name || "";
		const studentName = member.student_name || member.display_name || "";
		return {
			userId: member.user_id || null,
			displayName,
			studentName,
		};
	});

	const unresolvedNames = entries
		.filter((entry) => !entry.userId && entry.displayName)
		.map((entry) => entry.displayName);

	if (unresolvedNames.length > 0) {
		const baseConditions = [
			eq(teamRoster.teamId, teamId),
			or(
				inArray(teamRoster.displayName, unresolvedNames),
				inArray(teamRoster.studentName, unresolvedNames),
			),
		];
		const conditions = [...baseConditions, eq(teamRoster.eventName, eventName)];
		if (subteamId) {
			conditions.push(eq(teamRoster.subteamId, subteamId));
		}

		let rosterRows = await dbPg
			.select({
				userId: teamRoster.userId,
				displayName: teamRoster.displayName,
				studentName: teamRoster.studentName,
			})
			.from(teamRoster)
			.where(and(...conditions));

		if (rosterRows.length === 0) {
			const fallbackConditions = [...baseConditions];
			if (subteamId) {
				fallbackConditions.push(eq(teamRoster.subteamId, subteamId));
			}
			rosterRows = await dbPg
				.select({
					userId: teamRoster.userId,
					displayName: teamRoster.displayName,
					studentName: teamRoster.studentName,
				})
				.from(teamRoster)
				.where(and(...fallbackConditions));
		}

		const nameToUserId = new Map<string, string>();
		for (const row of rosterRows) {
			if (row.userId && row.displayName) {
				nameToUserId.set(row.displayName, row.userId);
			}
			if (row.userId && row.studentName) {
				nameToUserId.set(row.studentName, row.userId);
			}
		}

		for (const entry of entries) {
			if (!entry.userId && entry.displayName) {
				entry.userId = nameToUserId.get(entry.displayName) || null;
			}
		}
	}

	return entries
		.filter((entry): entry is RosterMemberPayload => Boolean(entry.userId))
		.map((entry) => ({
			userId: entry.userId as string,
			displayName: entry.displayName || entry.studentName,
			studentName: entry.studentName || entry.displayName,
		}));
};

export const buildCodebustersOptions = (quote: {
	author: string;
	cipherType: string;
	division?: string;
	charLength?: number;
	encrypted: string;
	key?: string;
	kShift?: number;
	plainAlphabet?: string;
	cipherAlphabet?: string;
	matrix?: number[][];
	decryptionMatrix?: number[][];
	portaKeyword?: string;
	nihilistPolybiusKey?: string;
	nihilistCipherKey?: string;
	checkerboardRowKey?: string;
	checkerboardColKey?: string;
	checkerboardPolybiusKey?: string;
	checkerboardUsesIJ?: boolean;
	blockSize?: number;
	columnarKey?: string;
	fractionationTable?: { [key: string]: string };
	caesarShift?: number;
	affineA?: number;
	affineB?: number;
	baconianBinaryType?: string;
	cryptarithmData?: unknown;
	askForKeyword?: boolean;
	points?: number;
	difficulty?: number;
}) => {
	return {
		author: quote.author,
		cipherType: quote.cipherType,
		division: quote.division,
		charLength: quote.charLength,
		encrypted: quote.encrypted,
		key: quote.key,
		kShift: quote.kShift,
		plainAlphabet: quote.plainAlphabet,
		cipherAlphabet: quote.cipherAlphabet,
		matrix: quote.matrix,
		decryptionMatrix: quote.decryptionMatrix,
		portaKeyword: quote.portaKeyword,
		nihilistPolybiusKey: quote.nihilistPolybiusKey,
		nihilistCipherKey: quote.nihilistCipherKey,
		checkerboardRowKey: quote.checkerboardRowKey,
		checkerboardColKey: quote.checkerboardColKey,
		checkerboardPolybiusKey: quote.checkerboardPolybiusKey,
		checkerboardUsesIJ: quote.checkerboardUsesIJ,
		blockSize: quote.blockSize,
		columnarKey: quote.columnarKey,
		fractionationTable: quote.fractionationTable,
		caesarShift: quote.caesarShift,
		affineA: quote.affineA,
		affineB: quote.affineB,
		baconianBinaryType: quote.baconianBinaryType,
		cryptarithmData: quote.cryptarithmData,
		askForKeyword: quote.askForKeyword,
		points: quote.points,
		difficulty: quote.difficulty,
	};
};
