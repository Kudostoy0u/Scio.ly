"use client";

import { supabase } from "@/lib/supabase";
import logger from "@/lib/utils/logging/logger";

type CachedUserProfile = {
	id: string;
	email?: string | null;
	display_name?: string | null;
	username?: string | null;
	photo_url?: string | null;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_PREFIX = "scio_user_profile_";

const inMemoryCache = new Map<
	string,
	{ data: CachedUserProfile; timestamp: number }
>();
const inFlight = new Map<string, Promise<CachedUserProfile | null>>();

const readFromStorage = (userId: string) => {
	if (typeof window === "undefined") {
		return null;
	}
	try {
		const raw = window.localStorage.getItem(`${CACHE_PREFIX}${userId}`);
		if (!raw) {
			return null;
		}
		const parsed = JSON.parse(raw) as {
			data: CachedUserProfile;
			timestamp: number;
		};
		if (!parsed?.data || typeof parsed.timestamp !== "number") {
			return null;
		}
		if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
};

const writeToStorage = (userId: string, data: CachedUserProfile) => {
	if (typeof window === "undefined") {
		return;
	}
	try {
		const payload = JSON.stringify({ data, timestamp: Date.now() });
		window.localStorage.setItem(`${CACHE_PREFIX}${userId}`, payload);
	} catch {
		// Ignore storage errors
	}
};

export function updateUserProfileCache(
	userId: string,
	partial: Partial<CachedUserProfile>,
) {
	const existing = inMemoryCache.get(userId)?.data;
	const merged = { ...(existing ?? { id: userId }), ...partial };
	inMemoryCache.set(userId, { data: merged, timestamp: Date.now() });
	writeToStorage(userId, merged);
}

export async function getCachedUserProfile(
	userId: string,
): Promise<CachedUserProfile | null> {
	if (!userId || typeof userId !== "string") {
		return null;
	}
	const cached = inMemoryCache.get(userId);
	if (cached && Date.now() - cached.timestamp <= CACHE_TTL_MS) {
		return cached.data;
	}

	const stored = readFromStorage(userId);
	if (stored) {
		inMemoryCache.set(userId, stored);
		return stored.data;
	}

	const existingRequest = inFlight.get(userId);
	if (existingRequest) {
		return existingRequest;
	}

	const request = Promise.resolve(
		supabase
			.from("users")
			.select("id, email, display_name, username, photo_url")
			.eq("id", userId)
			.maybeSingle()
			.then(({ data, error }) => {
				if (error) {
					logger.warn("Failed to fetch cached user profile:", error);
					return null;
				}
				if (!data) {
					return null;
				}
				const profile = data as CachedUserProfile;
				inMemoryCache.set(userId, { data: profile, timestamp: Date.now() });
				writeToStorage(userId, profile);
				return profile;
			}),
	).finally(() => {
		inFlight.delete(userId);
	});

	inFlight.set(userId, request);
	return request;
}
