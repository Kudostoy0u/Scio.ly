'use client';
import logger from '@/lib/utils/logger';


import React from 'react';
import { FaBookmark, FaRegBookmark } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase';
import { addBookmark, removeBookmark } from '@/app/utils/bookmarks';

export interface Question {
  question: string;
  options?: string[];
  answers: (number | string)[];
  difficulty: number;
  tournament?: string;
  division?: string;
  subject?: string;
  subtopic?: string;
  id?: string;
  imageUrl?: string;
  imageData?: string;
}

interface BookmarkManagerProps {
  question: Question;
  isBookmarked: boolean;
  eventName: string;
  source: 'test' | 'unlimited' | 'practice';
  onBookmarkChange: (questionText: string, isBookmarked: boolean) => void;
  darkMode?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const BookmarkManager: React.FC<BookmarkManagerProps> = ({
  question,
  isBookmarked,
  eventName,
  source,
  onBookmarkChange,
  darkMode = false,
  size = 'md',
  showLabel = false
}) => {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleBookmark = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.info('Please sign in to bookmark questions');
      return;
    }

    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const key = question.imageData ? `id:${question.imageData}` : question.question;
      if (isBookmarked) {
        await removeBookmark(user.id, question, source);
        onBookmarkChange(key, false);
        toast.success('Bookmark removed!');
      } else {
        await addBookmark(user.id, question, eventName, source);
        onBookmarkChange(key, true);
        toast.success('Question bookmarked!');
      }
    } catch (error) {
      logger.error('Error managing bookmark:', error);
      toast.error(isBookmarked ? 'Failed to remove bookmark' : 'Failed to bookmark question');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button
      onClick={handleBookmark}
      disabled={isProcessing}
      className={`flex items-center space-x-1 p-2 rounded-md transition-all duration-200 ${
        isProcessing 
          ? 'opacity-50 cursor-not-allowed' 
          : darkMode
            ? 'hover:bg-gray-700 text-gray-300 hover:text-yellow-400'
            : 'hover:bg-gray-100 text-gray-600 hover:text-yellow-600'
      }`}
      title={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
    >
      {isProcessing ? (
        <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${sizeClasses[size]}`} />
      ) : isBookmarked ? (
        <FaBookmark className={`${sizeClasses[size]} text-yellow-500`} />
      ) : (
        <FaRegBookmark className={sizeClasses[size]} />
      )}
      {showLabel && (
        <span className="text-sm">
          {isBookmarked ? 'Bookmarked' : 'Bookmark'}
        </span>
      )}
    </button>
  );
};

export default BookmarkManager;