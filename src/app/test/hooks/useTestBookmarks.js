let __assign =
	(this && this.__assign) ||
	function () {
		__assign =
			Object.assign ||
			((t) => {
				for (let s, i = 1, n = arguments.length; i < n; i++) {
					s = arguments[i];
					for (const p in s)
						if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
				}
				return t;
			});
		return __assign.apply(this, arguments);
	};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTestBookmarks = useTestBookmarks;
const bookmarks_1 = require("@/app/utils/bookmarks");
const supabase_1 = require("@/lib/supabase");
const react_1 = require("react");
/**
 * Hook for managing bookmarked questions
 * Handles loading bookmarks from Supabase and managing bookmark state
 *
 * @returns Bookmark state and handlers
 */
function useTestBookmarks() {
	const [bookmarkedQuestions, setBookmarkedQuestions] = (0, react_1.useState)(
		{},
	);
	// Load bookmarks on mount
	(0, react_1.useEffect)(() => {
		Promise.resolve()
			.then(() => require("./utils/bookmarks"))
			.then(async ({ fetchUserBookmarks }) => {
				try {
					const map = await fetchUserBookmarks(
						supabase_1.supabase,
						bookmarks_1.loadBookmarksFromSupabase,
					);
					setBookmarkedQuestions(map);
				} catch (_a) {
					// Ignore errors - bookmarks are non-critical
				}
			})
			.catch(() => {
				// Ignore errors - fallback handling is already in place
			});
	}, []);
	/**
	 * Handle bookmark state changes
	 */
	const handleBookmarkChange = (questionText, isBookmarked) => {
		setBookmarkedQuestions((prev) =>
			__assign(__assign({}, prev), { [questionText]: isBookmarked }),
		);
	};
	/**
	 * Generate bookmark key for a question
	 */
	const getBookmarkKey = (q) => {
		return q.question;
	};
	/**
	 * Check if a question is bookmarked
	 */
	const isQuestionBookmarked = (question) => {
		const key = getBookmarkKey(question);
		return bookmarkedQuestions[key] === true;
	};
	return {
		bookmarkedQuestions,
		handleBookmarkChange,
		isQuestionBookmarked,
		getBookmarkKey,
	};
}
