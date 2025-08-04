import { supabase } from '@/lib/supabase';

interface Question {
  question: string;
  options?: string[];
  answers: (string | number)[];
  difficulty: number;
}

interface BookmarkedQuestion {
  question: Question;
  eventName: string;
  source: string;
  timestamp: number;
}

export const loadBookmarksFromSupabase = async (userId: string): Promise<BookmarkedQuestion[]> => {
  if (!userId) return [];
  
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading bookmarks:', error);
      return [];
    }

    return data.map(bookmark => ({
      question: bookmark.question_data,
      eventName: bookmark.event_name,
      source: bookmark.source,
      timestamp: new Date(bookmark.created_at).getTime()
    }));
  } catch (error) {
    console.error('Error loading bookmarks:', error);
    return [];
  }
};

// Keep the old function name for backward compatibility
export const loadBookmarksFromFirebase = loadBookmarksFromSupabase;

export const addBookmark = async (
  userId: string | null,
  question: Question,
  eventName: string,
  source: string
) => {
  if (!userId) return;

  try {
    // Check if bookmark already exists
    const { data: existingBookmarks, error: fetchError } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('event_name', eventName)
      .eq('source', source)
      .eq('question_data->>question', question.question);

    if (fetchError) {
      console.error('Error checking existing bookmarks:', fetchError);
      return;
    }

    if (existingBookmarks && existingBookmarks.length > 0) {
      console.log('Bookmark already exists');
      return;
    }

    // Add new bookmark
    const { error } = await supabase
      .from('bookmarks')
      .insert({
        user_id: userId,
        question_data: question,
        event_name: eventName,
        source: source
      });

    if (error) {
      console.error('Error adding bookmark:', error);
    }
  } catch (error) {
    console.error('Error adding bookmark:', error);
  }
};

export const removeBookmark = async (
  userId: string | null,
  question: Question,
  source: string
) => {
  if (!userId) return;

  try {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('source', source)
      .eq('question_data->>question', question.question);

    if (error) {
      console.error('Error removing bookmark:', error);
    }
  } catch (error) {
    console.error('Error removing bookmark:', error);
  }
};