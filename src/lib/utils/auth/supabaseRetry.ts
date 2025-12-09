/**
 * Utility for handling Supabase auth errors with automatic retry
 * Eliminates duplicate auth refresh logic across the codebase
 */

import { supabase } from "@/lib/supabase";
import logger from "../logging/logger";

/**
 * Auth error status codes that trigger a session refresh
 */
const AUTH_ERROR_CODES = [401, 403] as const;

/**
 * Check if error is an auth error that should trigger retry
 */
function isAuthError(error: unknown): boolean {
	if (!error || typeof error !== "object") {
		return false;
	}
	const status =
		"status" in error && typeof error.status === "number"
			? error.status
			: undefined;
	return (
		status !== undefined &&
		(AUTH_ERROR_CODES as readonly number[]).includes(status)
	);
}

/**
 * Clear all Supabase-related cookies
 * Used when session refresh fails
 */
function clearSupabaseCookies(): void {
	if (typeof window === "undefined") {
		return;
	}

	const cookieNames = [
		"sb-access-token",
		"sb-refresh-token",
		"supabase-auth-token",
		"supabase-auth-refresh-token",
		"supabase-auth-token-expires",
		"supabase-auth-refresh-token-expires",
		"supabase-auth-token-type",
		"supabase-auth-token-user-id",
		"supabase-auth-token-session-id",
		"supabase-auth-token-provider-token",
		"supabase-auth-token-provider-refresh-token",
	];

	const domains = [
		"",
		`domain=${window.location.hostname}`,
		`domain=.${window.location.hostname}`,
	];

	for (const name of cookieNames) {
		for (const domain of domains) {
			const cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;${domain ? ` ${domain};` : ""}`;
			document.cookie = cookie;
		}
	}

	logger.warn("Cleared Supabase cookies after session refresh failure");
}

/**
 * Execute a Supabase query with automatic auth retry
 *
 * @param operation - Function that executes the Supabase query
 * @param operationName - Name for logging purposes
 * @returns Query result or null on error
 *
 * @example
 * const data = await withAuthRetry(
 *   () => supabase.from('users').select('*').eq('id', userId),
 *   'fetchUser'
 * );
 */
export async function withAuthRetry<T = unknown>(
	operation: () => Promise<{ data: T | null; error: unknown }>,
	operationName = "query",
): Promise<{ data: T | null; error: unknown }> {
	// First attempt
	let result = await operation();

	// If auth error, refresh session and retry
	if (result.error && isAuthError(result.error)) {
		logger.warn(`Auth error in ${operationName}, refreshing session`);

		try {
			const { error: refreshError } = await supabase.auth.refreshSession();

			if (refreshError) {
				logger.error(
					`Session refresh failed for ${operationName}:`,
					refreshError,
				);
				clearSupabaseCookies();
				return result; // Return original error
			}

			logger.info(`Session refreshed, retrying ${operationName}`);
			result = await operation();

			if (result.error) {
				logger.error(
					`${operationName} failed after session refresh:`,
					result.error,
				);
			}
		} catch (refreshError) {
			logger.error(
				`Session refresh threw error for ${operationName}:`,
				refreshError,
			);
			clearSupabaseCookies();
		}
	} else if (result.error) {
		logger.error(`${operationName} error:`, result.error);
	}

	return result;
}

/**
 * Execute a Supabase query with auth retry, extracting only the data
 * Returns null on any error
 *
 * @example
 * const user = await withAuthRetryData(
 *   () => supabase.from('users').select('*').eq('id', userId).single()
 * );
 */
export async function withAuthRetryData<T = unknown>(
	operation: () => Promise<{ data: T | null; error: unknown }>,
	operationName = "query",
): Promise<T | null> {
	const { data, error } = await withAuthRetry(operation, operationName);
	return error ? null : data;
}
