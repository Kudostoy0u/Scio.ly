/**
 * Utility functions for team operations
 */

import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema";
import logger from "@/lib/utils/logging/logger";
import { and, eq, ne } from "drizzle-orm";

// Removed unused function: generateCode

// Removed unused exports: generateRandomCode, closePool

/**
 * Ensure a Cockroach `users` row exists for a Supabase user
 * @param {object} params - Parameters for user profile
 * @returns {Promise<void>}
 */
export async function upsertUserProfile(params: {
	id?: string;
	userId?: string;
	email: string;
	username?: string | null;
	displayName?: string | null;
	photoUrl?: string | null;
}): Promise<void> {
	logger.debug("upsertUserProfile", params);
	const startedAt = Date.now();
	try {
		const id = params.id || params.userId || "";
		if (!id || typeof id !== "string") {
			throw new Error("upsertUserProfile: missing or invalid id");
		}
		if (!params.email || typeof params.email !== "string") {
			throw new Error("upsertUserProfile: missing or invalid email");
		}

		const resolvedDisplayName = params.displayName;

		// Ensure username (non-nullable in Drizzle schema). Fallback from email local part.
		let fallbackUsername = ((): string => {
			if (typeof params.username === "string" && params.username.trim()) {
				return params.username.trim();
			}
			const local = params.email.split("@")[0] || "user";
			return local;
		})();

		// Check if username is already taken by another user
		const existingWithUsername = await dbPg
			.select({ id: users.id })
			.from(users)
			.where(and(eq(users.username, fallbackUsername), ne(users.id, id)))
			.limit(1);

		// If username is taken by another user, generate a unique one
		if (existingWithUsername.length > 0) {
			const baseUsername = fallbackUsername;
			let counter = 1;
			let isUnique = false;
			while (!isUnique && counter < 100) {
				const candidateUsername = `${baseUsername}${counter}`;
				const check = await dbPg
					.select({ id: users.id })
					.from(users)
					.where(and(eq(users.username, candidateUsername), ne(users.id, id)))
					.limit(1);
				if (check.length === 0) {
					fallbackUsername = candidateUsername;
					isUnique = true;
				}
				counter++;
			}
		}

		// Prepare insert values
		const insertValues: typeof users.$inferInsert = {
			id,
			email: params.email,
			username: fallbackUsername,
			// Use undefined for optional columns when not provided to avoid TS null issues
			displayName:
				resolvedDisplayName !== undefined ? resolvedDisplayName : undefined,
			photoUrl: params.photoUrl !== undefined ? params.photoUrl : undefined,
		};

		// Prepare update set only for provided (non-undefined) fields to avoid overwriting with nulls
		const updateSet: Partial<typeof users.$inferInsert> & {
			updatedAt?: string;
		} = {
			email: params.email,
			updatedAt: new Date().toISOString(),
		};
		// Only update username if it's explicitly provided and doesn't conflict
		if (
			params.username !== undefined &&
			typeof params.username === "string" &&
			params.username.trim()
		) {
			// Check if the provided username would conflict
			const wouldConflict = await dbPg
				.select({ id: users.id })
				.from(users)
				.where(
					and(eq(users.username, params.username.trim()), ne(users.id, id)),
				)
				.limit(1);
			if (wouldConflict.length === 0) {
				updateSet.username = params.username.trim();
			}
		}
		if (resolvedDisplayName !== undefined) {
			updateSet.displayName = resolvedDisplayName;
		}
		if (params.photoUrl !== undefined) {
			updateSet.photoUrl = params.photoUrl;
		}

		logger.dev.db(
			"UPSERT",
			"users (drizzle)",
			"insert ... onConflictDoUpdate(id)",
			[{ insertValues }, { updateSet }],
		);

		await dbPg
			.insert(users)
			.values(insertValues)
			.onConflictDoUpdate({
				target: users.id,
				set: updateSet as Record<string, unknown>,
			});

		logger.dev.timing("upsertUserProfile", startedAt, { id });
	} catch (err: unknown) {
		logger.error("upsertUserProfile failed", err);
		logger.dev.error(
			"upsertUserProfile failed",
			err instanceof Error ? err : new Error(String(err)),
			{
				id: params.id || params.userId,
				hasEmail: !!params.email,
				hasUsername: !!params.username,
				hasDisplayName: !!params.displayName,
			},
		);
		throw err;
	}
}
