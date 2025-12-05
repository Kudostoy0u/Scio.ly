import { supabase } from "@/lib/supabase";

const BUCKET = "docs";

export async function getEventMarkdown(slug: string): Promise<string | null> {
	try {
		const path = `2026/${slug}.md`;
		const { data, error } = await supabase.storage.from(BUCKET).download(path);
		if (error || !data) {
			return null;
		}
		const text = await data.text();
		return text;
	} catch {
		return null;
	}
}

export async function saveEventMarkdown(
	slug: string,
	content: string,
): Promise<{ ok: boolean; message?: string }> {
	try {
		const path = `2026/${slug}.md`;
		const blob = new Blob([content], { type: "text/markdown" });
		const { error } = await supabase.storage
			.from(BUCKET)
			.upload(path, blob, { upsert: true, contentType: "text/markdown" });
		if (error) {
			return { ok: false, message: error.message };
		}
		return { ok: true };
	} catch (e) {
		return {
			ok: false,
			message: e instanceof Error ? e.message : "Unknown error",
		};
	}
}
