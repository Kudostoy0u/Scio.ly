/**
 * Centralized localStorage utility with type safety and error handling
 */

export class StorageService {
  /**
   * Safely get an item from localStorage
   */
  static get<T>(key: string): T | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const item = localStorage.getItem(key);
      if (!item) {
        return null;
      }
      return JSON.parse(item) as T;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Safely get a string item from localStorage (no JSON parsing)
   */
  static getString(key: string): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      return localStorage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  /**
   * Safely set an item in localStorage
   */
  static set<T>(key: string, value: T): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Safely set a string item in localStorage (no JSON stringification)
   */
  static setString(key: string, value: string): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      localStorage.setItem(key, value);
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Safely remove an item from localStorage
   */
  static remove(key: string): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Safely remove multiple items from localStorage
   */
  static removeMultiple(keys: string[]): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      keys.forEach((key) => localStorage.removeItem(key));
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Safely clear all localStorage
   */
  static clear(): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      localStorage.clear();
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Check if a key exists in localStorage
   */
  static has(key: string): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      return localStorage.getItem(key) !== null;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get with default fallback value
   */
  static getWithDefault<T>(key: string, defaultValue: T): T {
    const value = StorageService.get<T>(key);
    return value !== null ? value : defaultValue;
  }
}

/**
 * Storage keys constants for type safety
 */
export const StorageKeys = {
  // Test-related keys
  TEST_QUESTIONS: "testQuestions",
  TEST_USER_ANSWERS: "testUserAnswers",
  TEST_GRADING_RESULTS: "testGradingResults",
  TEST_PARAMS: "testParams",
  TEST_SUBMITTED: "testSubmitted",
  TEST_FROM_BOOKMARKS: "testFromBookmarks",
  CONTESTED_QUESTIONS: "contestedQuestions",
  LOADED: "loaded",

  // Codebusters-related keys
  CODEBUSTERS_PREFERENCES: "scio_codebusters_preferences",
  NORMAL_EVENT_PREFERENCES: "scio_normal_event_preferences",

  // Assignment-related keys
  CURRENT_ASSIGNMENT_ID: "currentAssignmentId",

  // Teams-related keys
  TEAMS_SELECTION: "teamsSelection",

  // User preferences
  THEME: "theme",
  DIVISION: "division",
  FAVORITE_EVENTS: "favoriteEvents",

  // Dashboard and metrics
  DASHBOARD_BANNER_DISMISSED: "dashboardBannerDismissed",

  // Other
  SHARE_CODE: "shareCode",
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
