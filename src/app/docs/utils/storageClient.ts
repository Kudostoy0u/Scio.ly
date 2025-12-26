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
