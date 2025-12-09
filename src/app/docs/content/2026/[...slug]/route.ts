import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export async function GET(
	_req: Request,
	ctx: { params: Promise<{ slug: string[] }> },
) {
	try {
		const { slug } = await ctx.params;
		const parts = Array.isArray(slug) ? slug : [];
		if (parts.length === 0) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		const last = parts[parts.length - 1];
		if (!last) {
			return NextResponse.json({ error: "Invalid path" }, { status: 400 });
		}
		const fsParts = parts.slice(0, -1);
		const filename = last.endsWith(".md") ? last : `${last}.md`;
		const baseDir = path.join(
			process.cwd(),
			"src",
			"app",
			"docs",
			"content",
			"2026",
		);
		const candidates: string[] = [];
		// Exact path based on requested segments
		candidates.push(path.join(baseDir, ...fsParts, filename));
		// Codebusters cipher fallback: /codebusters/ciphers/<name>.md
		if (parts[0] === "codebusters") {
			candidates.push(path.join(baseDir, "codebusters", "ciphers", filename));
		}

		let buf: Buffer | null = null;
		for (const p of candidates) {
			try {
				buf = await fs.readFile(p);
				break;
			} catch {
				// Continue to next candidate if file doesn't exist
			}
		}
		if (!buf) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
		const text = buf.toString("utf-8");
		return new NextResponse(text, {
			status: 200,
			headers: {
				"Content-Type": "text/markdown; charset=utf-8",
				"Cache-Control": "public, max-age=300, s-maxage=300",
			},
		});
	} catch {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
}
