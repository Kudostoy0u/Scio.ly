import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { bookmarks, gamePoints, userStats } from './schema';

// Infer types from schema
export type Bookmark = InferSelectModel<typeof bookmarks>;
export type NewBookmark = InferInsertModel<typeof bookmarks>;

export type GamePoint = InferSelectModel<typeof gamePoints>;
export type NewGamePoint = InferInsertModel<typeof gamePoints>;

export type UserStat = InferSelectModel<typeof userStats>;
export type NewUserStat = InferInsertModel<typeof userStats>;

// Custom types for API responses
export interface BookmarkWithUser extends Bookmark {
  // Add user info when needed (from Supabase)
  user?: {
    id: string;
    name?: string;
    email?: string;
  };
}

export interface GamePointWithUser extends GamePoint {
  // Add user info when needed (from Supabase)
  user?: {
    id: string;
    name?: string;
    email?: string;
  };
}

export interface UserStatWithUser extends UserStat {
  // Add user info when needed (from Supabase)
  user?: {
    id: string;
    name?: string;
    email?: string;
  };
}

// API response types
export interface BookmarkResponse {
  success: boolean;
  data?: Bookmark;
  error?: string;
}

export interface BookmarksResponse {
  success: boolean;
  data?: Bookmark[];
  error?: string;
}

export interface GamePointResponse {
  success: boolean;
  data?: GamePoint;
  error?: string;
}

export interface GamePointsResponse {
  success: boolean;
  data?: GamePoint[];
  error?: string;
}

export interface UserStatResponse {
  success: boolean;
  data?: UserStat;
  error?: string;
}

export interface UserStatsResponse {
  success: boolean;
  data?: UserStat[];
  error?: string;
} 