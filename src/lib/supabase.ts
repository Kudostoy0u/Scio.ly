import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types/database";

/**
 * Supabase client configuration for Science Olympiad platform
 * Provides centralized Supabase client management with proper SSR support
 */

declare const process: {
	env: {
		NEXT_PUBLIC_SUPABASE_URL?: string;
		NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
	};
};

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const supabaseAnonKey = (
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
).trim();

/** Cached Supabase browser client instance */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null =
	null;

/**
 * Get or create the Supabase browser client
 * Creates a new client if one doesn't exist, otherwise returns the cached client
 *
 * @returns {ReturnType<typeof createBrowserClient<Database>>} Supabase browser client
 * @throws {Error} When Supabase environment variables are missing
 * @example
 * ```typescript
 * const client = getClient();
 * const { data } = await client.from('users').select('*');
 * ```
 */
function getClient() {
	if (browserClient) {
		return browserClient;
	}
	if (!(supabaseUrl && supabaseAnonKey)) {
		throw new Error(
			"@supabase/ssr: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
		);
	}
	browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
		auth: {
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: true,
			flowType: "pkce",
		},
		db: { schema: "public" },
	});
	return browserClient;
}

/** Default Supabase client instance */
export const supabase = getClient();
