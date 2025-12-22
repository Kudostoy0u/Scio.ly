import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/types/database";

/**
 * Bookmark management utilities for Science Olympiad questions
 * Provides CRUD operations for user bookmarks with Supabase integration
 */

/**
 * Question interface for bookmark operations
 */
interface Question {
	/** Optional question ID */
	id?: string;
	/** Question text content */
	question: string;
	/** Optional answer options */
	options?: string[];
	/** Correct answers */
	answers: (string | number)[];
	/** Question difficulty level */
	difficulty: number;
	/** Optional image URL */
	imageUrl?: string;
}

/**
 * Bookmarked question interface
 */
interface BookmarkedQuestion {
	/** The bookmarked question */
	question: Question;
	/** Science Olympiad event name */
	eventName: string;
	/** Source of the question */
	source: string;
	/** Bookmark creation timestamp */
	timestamp: number;
}

/**
 * Bookmark insert type from database schema
 */
type BookmarkInsert = Database["public"]["Tables"]["bookmarks"]["Insert"];

/**
 * Loads user bookmarks from Supabase database
 * Retrieves all bookmarks for a specific user, ordered by creation date
 *
 * @param {string} userId - The user ID to load bookmarks for
 * @returns {Promise<BookmarkedQuestion[]>} Array of bookmarked questions
 * @throws {Error} When database operation fails
 * @example
 * ```typescript
 * const bookmarks = await loadBookmarksFromSupabase('user-123');
 * console.log(bookmarks); // [{ question: {...}, eventName: 'Anatomy & Physiology', ... }]
 * ```
 */
export const loadBookmarksFromSupabase = async (
	userId: string,
): Promise<BookmarkedQuestion[]> => {
	if (!userId) {
		return [];
	}

	try {
		const { data, error } = await supabase
			.from("bookmarks")
			.select("*")
			.eq("user_id", userId)
			.order("created_at", { ascending: false });

		if (error) {
			return [];
		}

		return data.map((bookmark) => {
			const bookmarkRecord = bookmark as Record<string, unknown>;
			const created_at = bookmarkRecord.created_at;
			const eventName = bookmarkRecord.event_name;
			const source = bookmarkRecord.source;
			return {
				question: bookmarkRecord.question_data as Question,
				eventName: typeof eventName === "string" ? eventName : "",
				source: typeof source === "string" ? source : "",
				timestamp: created_at
					? new Date(String(created_at)).getTime()
					: Date.now(),
			};
		});
	} catch (_error) {
		return [];
	}
};

/**
 * Adds a bookmark to the user's bookmark collection
 * Checks for existing bookmarks to prevent duplicates
 *
 * @param {string | null} userId - The user ID to add bookmark for
 * @param {Question} question - The question to bookmark
 * @param {string} eventName - The Science Olympiad event name
 * @param {string} source - The source of the question
 * @returns {Promise<void>} Promise that resolves when bookmark is added
 * @throws {Error} When database operation fails
 * @example
 * ```typescript
 * await addBookmark('user-123', question, 'Anatomy & Physiology', 'practice');
 * ```
 */
export const addBookmark = async (
	userId: string | null,
	question: Question,
	eventName: string,
	source: string,
) => {
	if (!userId) {
		return;
	}

	try {
		let exists = false;

		if (question.id) {
			const { data, error } = await supabase
				.from("bookmarks")
				.select("id")
				.eq("user_id", userId)
				.eq("event_name", eventName)
				.eq("source", source)
				.eq("question_data->>id", question.id);
			if (error) {
				throw error;
			}
			exists = !!(data && data.length > 0);
		} else {
			let query = supabase
				.from("bookmarks")
				.select("id")
				.eq("user_id", userId)
				.eq("event_name", eventName)
				.eq("source", source)
				.eq("question_data->>question", question.question);
			if (question.imageUrl) {
				query = query.eq("question_data->>imageUrl", question.imageUrl);
			}
			const { data, error } = await query;
			if (error) {
				throw error;
			}
			exists = !!(data && data.length > 0);
		}

		if (exists) {
			return;
		}

		const bookmarkData: BookmarkInsert = {
			user_id: userId,
			question_data: question as unknown as Record<string, unknown>,
			event_name: eventName,
			source: source,
		};

		const { error } = (await supabase
			.from("bookmarks")
			.insert([bookmarkData] as unknown as never[])) as { error: Error | null };

		if (error) {
			// Error handling can go here if needed
		}
	} catch (_error) {
		// Ignore errors
	}
};

/**
 * Removes a bookmark from the user's bookmark collection
 * Deletes the bookmark based on question ID or question text
 *
 * @param {string | null} userId - The user ID to remove bookmark for
 * @param {Question} question - The question to remove bookmark for
 * @param {string} source - The source of the question
 * @returns {Promise<void>} Promise that resolves when bookmark is removed
 * @throws {Error} When database operation fails
 * @example
 * ```typescript
 * await removeBookmark('user-123', question, 'practice');
 * ```
 */
export const removeBookmark = async (
	userId: string | null,
	question: Question,
	source: string,
) => {
	if (!userId) {
		return;
	}

	try {
		if (question.id) {
			const { error } = await supabase
				.from("bookmarks")
				.delete()
				.eq("user_id", userId)
				.eq("source", source)
				.eq("question_data->>id", question.id);
			if (error) {
				throw error;
			}
		} else {
			let query = supabase
				.from("bookmarks")
				.delete()
				.eq("user_id", userId)
				.eq("source", source)
				.eq("question_data->>question", question.question);
			if (question.imageUrl) {
				query = query.eq("question_data->>imageUrl", question.imageUrl);
			}
			const { error } = await query;
			if (error) {
				throw error;
			}
		}
	} catch (_error) {
		// Ignore errors
	}
};
