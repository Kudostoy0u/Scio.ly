import { redirect } from "next/navigation";

export default async function TeamStreamPage({
	params,
}: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	redirect(`/teams/${slug}`);
}
