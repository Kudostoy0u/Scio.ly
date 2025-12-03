import { dbPg } from "@/lib/db";
import { newTeamGroups } from "@/lib/db/schema/teams";
import { eq } from "drizzle-orm";

export async function generateUniqueSlug(baseSlug: string): Promise<string> {
	const existingSlug = await dbPg
		.select()
		.from(newTeamGroups)
		.where(eq(newTeamGroups.slug, baseSlug))
		.limit(1);

	if (existingSlug.length === 0) {
		return baseSlug;
	}

	const timestamp = Date.now().toString(36);
	return `${baseSlug}-${timestamp}`;
}
