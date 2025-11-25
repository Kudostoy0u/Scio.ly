import type { Question } from "@/app/utils/geminiService";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchUserBookmarks(
  supabase: SupabaseClient,
  loadBookmarksFromSupabase: (
    userId: string
  ) => Promise<Array<{ source?: string; question: Question }>>
): Promise<Record<string, boolean>> {
  const map: Record<string, boolean> = {};
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return map;
  }
  const bookmarks = await loadBookmarksFromSupabase(user.id);
  bookmarks.forEach((bookmark) => {
    if (bookmark.source === "test") {
      const question = bookmark.question as { imageData?: string; question?: string };
      const key = question.imageData
        ? `id:${String(question.imageData)}`
        : (question.question ?? "");
      map[key] = true;
    }
  });
  return map;
}
