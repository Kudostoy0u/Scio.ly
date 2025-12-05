import { getAnyEventMarkdown } from "@/app/docs/utils/storage";
import { NextResponse } from "next/server";

export const revalidate = 600;

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ cipher: string }> },
) {
	const { cipher } = await params;
	const slug = `codebusters/${cipher}`;
	const md = await getAnyEventMarkdown(slug);
	if (!md) {
		return new NextResponse("Not found", { status: 404 });
	}
	return new NextResponse(md, {
		status: 200,
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"Cache-Control": "s-maxage=600, stale-while-revalidate=300",
		},
	});
}
