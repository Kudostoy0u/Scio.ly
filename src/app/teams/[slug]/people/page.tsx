import { redirect } from "next/navigation";

export default async function TeamPeoplePage({
	params,
}: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	return redirect(`/teams/${slug}#people`);
}
