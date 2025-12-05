Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchUserBookmarks = fetchUserBookmarks;
async function fetchUserBookmarks(supabase, loadBookmarksFromSupabase) {
	let _a;
	const map = {};
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		return map;
	}
	const bookmarks = await loadBookmarksFromSupabase(user.id);
	for (const bookmark of bookmarks) {
		if (bookmark.source === "test") {
			const question = bookmark.question;
			const key = question.imageData
				? `id:${String(question.imageData)}`
				: (_a = question.question) !== null && _a !== void 0
					? _a
					: "";
			map[key] = true;
		}
	}
	return map;
}
