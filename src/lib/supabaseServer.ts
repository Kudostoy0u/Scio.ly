import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types/database";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
	throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
	throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable");
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function createSupabaseServerClient() {
	const cookieStore = await cookies();

	return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
		cookies: {
			get(name: string) {
				return cookieStore.get(name)?.value;
			},
			set(name: string, value: string, options: CookieOptions) {
				try {
					cookieStore.set({ name, value, ...options });
				} catch {
					// Ignore errors in read-only contexts (e.g., Server Components)
				}
			},
			remove(name: string, options: CookieOptions) {
				try {
					cookieStore.set({ name, value: "", ...options, maxAge: 0 });
				} catch {
					// Ignore errors in read-only contexts
				}
			},
		},
	});
}

export async function getServerUser() {
	const supabase = await createSupabaseServerClient();
	const { data } = await supabase.auth.getUser();
	return data.user ?? null;
}
