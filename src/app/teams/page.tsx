import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import TeamsPageClient from "./components/TeamsPageClient";

export const metadata: Metadata = {
	title: "Scio.ly | Teams",
	description: "Join and coordinate with your Science Olympiad team.",
};

async function getAutoLinkSelection() {
	try {
		const supa = await (
			await import("@/lib/supabaseServer")
		).createSupabaseServerClient();
		const {
			data: { user },
		} = await supa.auth.getUser();
		if (!user?.id) {
			return null;
		}

		const { dbPg } = await import("@/lib/db");
		const { teamMemberships, teams } = await import("@/lib/db/schema");
		const { and, desc, eq } = await import("drizzle-orm");

		const primaryMembership = await dbPg
			.select({
				teamId: teams.id,
				school: teams.school,
				division: teams.division,
				slug: teams.slug,
			})
			.from(teamMemberships)
			.innerJoin(teams, eq(teamMemberships.teamId, teams.id))
			.where(
				and(
					eq(teamMemberships.userId, user.id),
					eq(teamMemberships.status, "active"),
				),
			)
			.orderBy(desc(teamMemberships.joinedAt))
			.limit(1);

		return primaryMembership[0] ?? null;
	} catch {
		return null;
	}
}

export default async function TeamsPage(ctx: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const cookieStore = await cookies();
	const justUnlinked = cookieStore.get("teamsJustUnlinked");
	const auto = await getAutoLinkSelection();
	const searchParams = await ctx.searchParams;
	const viewAll = searchParams.view === "all";
	const tab = searchParams.tab;

	// Only redirect if we have a valid team slug, user hasn't just unlinked, and user doesn't explicitly want to view all teams or settings tab
	if (!(justUnlinked || viewAll || tab === "settings") && auto?.slug) {
		redirect(`/teams/${auto.slug}`);
	}

	return <TeamsPageClient />;
}
