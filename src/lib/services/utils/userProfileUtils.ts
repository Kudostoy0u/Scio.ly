import { createSupabaseServerClient } from "@/lib/supabaseServer";
import logger from "@/lib/utils/logging/logger";

export interface UserProfile {
	id: string;
	email: string;
	display_name: string | null;
	username: string | null;
}

export async function getUserProfile(
	userId: string,
): Promise<UserProfile | null> {
	try {
		const supabase = await createSupabaseServerClient();
		const { data, error } = await supabase
			.from("users")
			.select("id, email, display_name, username")
			.eq("id", userId)
			.single();

		if (error || !data) {
			return null;
		}

		return data as UserProfile;
	} catch (error) {
		logger.error(
			"Failed to getUserProfile",
			error instanceof Error ? error : new Error(String(error)),
			{
				userId,
			},
		);
		return null;
	}
}
