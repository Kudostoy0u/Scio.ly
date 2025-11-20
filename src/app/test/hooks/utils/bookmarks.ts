import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchUserBookmarks(
  supabase: SupabaseClient<any, any, any>,
  loadBookmarksFromSupabase: (userId: string) => Promise<Array<{ source?: string; question: any }>>
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
      const key = "imageData" in bookmark.question && bookmark.question.imageData
        ? `id:${String(bookmark.question.imageData)}`
        : bookmark.question.question;
      map[key] = true;
    }
  });
  return map;
}
