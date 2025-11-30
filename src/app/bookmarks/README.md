# Bookmarks Directory

This directory contains the bookmark system for the Scio.ly platform. Allows users to save and organize questions for easy access and review.

## Files

### `page.tsx`
Server component wrapper that renders the bookmarks content.

**Example:**
```1:5:src/app/bookmarks/page.tsx
import Content from "@/app/bookmarks/Content";

export default function BookmarksPage() {
  return <Content />;
}
```

### `Content.tsx`
Main client component that displays and manages user bookmarks.

**Key Features:**
- Loads bookmarks from Supabase
- Displays bookmarked questions
- Remove bookmark functionality
- Navigate to bookmarked questions
- Theme-aware styling

**Example:**
```1:50:src/app/bookmarks/Content.tsx
"use client";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import logger from "@/lib/utils/logger";

import { useAuth } from "@/app/contexts/authContext";
import { useTheme } from "@/app/contexts/themeContext";
import { loadBookmarksFromSupabase, removeBookmark } from "@/app/utils/bookmarks";
import { clearTestSession } from "@/app/utils/timeManagement";
import { supabase } from "@/lib/supabase";
import Header from "@components/Header";
import { ArrowRight, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

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
```

**Important Notes:**
- Requires user authentication
- Bookmarks stored in Supabase database
- Each bookmark includes question data, event name, source, and timestamp
- Supports removing bookmarks
- Can navigate to test with bookmarked question

## Important Notes

1. **Authentication Required**: Users must be logged in to view bookmarks
2. **Supabase Storage**: Bookmarks are stored in Supabase database
3. **Question Data**: Bookmarks include full question data for offline access
4. **Event Context**: Each bookmark is associated with an event name
5. **Source Tracking**: Bookmarks track the source (test/practice) where they were saved
6. **Theme Support**: Full dark/light mode support
7. **Navigation**: Can navigate directly to tests containing bookmarked questions
