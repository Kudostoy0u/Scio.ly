import "server-only";

const BUCKET = "docs";

export async function getEventMarkdown(slug: string): Promise<string | null> {
	const path = `2026/${slug}.md`;
	if (
		!(
			process.env.NEXT_PUBLIC_SUPABASE_URL &&
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
		)
	) {
		return null;
	}
	const { supabase } = await import("@/lib/supabase");
	const { data, error } = await supabase.storage.from(BUCKET).download(path);
	if (error || !data) {
		return null;
	}
	const text = await data.text();
	return text;
}

export async function getLocalEventMarkdown(
	slug: string,
): Promise<string | null> {
	try {
		// First try reading from the filesystem (works at build time / SSG)
		try {
			const parts = slug.split("/");
			const pathMod = await import("node:path");
			const { readFile, access } = await import("node:fs/promises");
			const { constants } = await import("node:fs");

			const candidatePaths: string[] = [];
			candidatePaths.push(
				`${pathMod.join(process.cwd(), "src", "app", "docs", "content", "2026", ...parts)}.md`,
			);
			if (parts[0] === "codebusters" && parts.length >= 2) {
				const cipher = parts[1];
				candidatePaths.push(
					pathMod.join(
						process.cwd(),
						"src",
						"app",
						"docs",
						"content",
						"2026",
						"codebusters",
						`${cipher}.md`,
					),
				);
				candidatePaths.push(
					pathMod.join(
						process.cwd(),
						"src",
						"app",
						"docs",
						"content",
						"2026",
						"codebusters",
						"ciphers",
						`${cipher}.md`,
					),
				);
				candidatePaths.push(
					pathMod.join(
						process.cwd(),
						"public",
						"codebusters",
						"ciphers",
						`${cipher}.md`,
					),
				);
			}
			for (const filePath of candidatePaths) {
				try {
					await access(filePath, constants.R_OK);
					const buf = await readFile(filePath);
					return buf.toString("utf-8");
				} catch {
					// try next candidate
				}
			}
		} catch {
			// skip to endpoint fallback
		}

		// Fallback to hitting the served file endpoint (works on serverless at runtime)
		// Prefer absolute base from env to allow static rendering without headers()
		const base = (
			process.env.NEXT_PUBLIC_SITE_URL ||
			process.env.VERCEL_URL ||
			""
		)
			.toString()
			.trim();
		const absUrl = base
			? `${base.startsWith("http") ? base : `https://${base}`}/docs/content/2026/${slug}.md`
			: `/docs/content/2026/${slug}.md`;
		const res = await fetch(absUrl, {
			cache: "force-cache" as RequestCache,
			next: { revalidate: 3600 },
		});
		if (res.ok) {
			return await res.text();
		}
		return null;
	} catch {
		return null;
	}
}

export async function getAnyEventMarkdown(
	slug: string,
): Promise<string | null> {
	// Prefer local repo content first (bundled at build time for SSG),
	// then fall back to Supabase if available.
	const local = await getLocalEventMarkdown(slug);
	if (local) {
		return local;
	}
	return getEventMarkdown(slug);
}
