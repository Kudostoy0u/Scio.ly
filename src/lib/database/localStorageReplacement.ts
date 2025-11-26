/**
 * SyncLocalStorage - A synchronous localStorage wrapper
 * Provides a consistent interface for localStorage operations
 */

const SyncLocalStorage = {
  /**
   * Get an item from localStorage
   * @param key - The key to retrieve
   * @returns The stored value or null if not found
   */
  getItem(key: string): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  /**
   * Set an item in localStorage
   * @param key - The key to store
   * @param value - The value to store
   */
  setItem(key: string, value: string): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore errors
    }
  },

  /**
   * Remove an item from localStorage
   * @param key - The key to remove
   */
  removeItem(key: string): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  },

  /**
   * Clear all items from localStorage
   */
  clear(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.clear();
    } catch {
      // Ignore errors
    }
  },

  /**
   * Get the number of items in localStorage
   * @returns The number of items
   */
  getLength(): number {
    if (typeof window === "undefined") {
      return 0;
    }

    try {
      return localStorage.length;
    } catch {
      return 0;
    }
  },

  /**
   * Get the key at a specific index
   * @param index - The index to get the key for
   * @returns The key or null if not found
   */
  key(index: number): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      return localStorage.key(index);
    } catch {
      return null;
    }
  },
};

export default SyncLocalStorage;
