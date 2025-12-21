import { eq } from "drizzle-orm";
import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import logger from "@/lib/utils/logging/logger";
import { type NextRequest, NextResponse } from "next/server";

/**
 * DELETE /api/account/delete - Permanently delete user account
 *
 * This endpoint:
 * 1. Deletes the user from CockroachDB users table (Drizzle)
 * 2. Calls a Supabase RPC function that deletes from public.users and auth.users
 *
 * The RPC function runs with SECURITY DEFINER, so no service role key is needed.
 *
 * WARNING: This action is irreversible.
 */
export async function DELETE(_request: NextRequest) {
	try {
		const supabase = await createSupabaseServerClient();
		const { data: { user } } = await supabase.auth.getUser();
		
		if (!user?.id) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		// 1. Delete from CockroachDB users table (Drizzle)
		try {
			await dbPg.delete(users).where(eq(users.id, user.id));
			logger.info("Deleted user from CockroachDB", { userId: user.id });
		} catch (dbError) {
			// Log but continue - the user might not exist in CockroachDB
			logger.warn("Failed to delete from CockroachDB (may not exist):", dbError);
		}

		// 2. Call the RPC function - it handles both public.users and auth.users deletion
		const { data, error } = await supabase.rpc("delete_own_account");

		if (error) {
			logger.error("Failed to delete account:", error);
			return NextResponse.json(
				{ error: "Failed to delete account. Please try again." },
				{ status: 500 },
			);
		}

		// Check the response from the function
		const result = data as { success: boolean; error?: string } | null;
		if (!result?.success) {
			logger.error("Account deletion failed:", result?.error);
			return NextResponse.json(
				{ error: result?.error || "Failed to delete account." },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			message: "Account deleted successfully",
		});
	} catch (error) {
		logger.error(
			"Failed to delete account:",
			error instanceof Error ? error : new Error(String(error)),
		);
		return NextResponse.json(
			{ error: "Failed to delete account. Please try again." },
			{ status: 500 },
		);
	}
}

