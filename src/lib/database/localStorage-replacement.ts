/**
 * SyncLocalStorage - A synchronous localStorage wrapper
 * Provides a consistent interface for localStorage operations
 */

class SyncLocalStorage {
  /**
   * Get an item from localStorage
   * @param key - The key to retrieve
   * @returns The stored value or null if not found
   */
  static getItem(key: string): string | null {
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
   * Set an item in localStorage
   * @param key - The key to store
   * @param value - The value to store
   */
  static setItem(key: string, value: string): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.setItem(key, value);
    } catch (_error) {}
  }

  /**
   * Remove an item from localStorage
   * @param key - The key to remove
   */
  static removeItem(key: string): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.removeItem(key);
    } catch (_error) {}
  }

  /**
   * Clear all items from localStorage
   */
  static clear(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.clear();
    } catch (_error) {}
  }

  /**
   * Get the number of items in localStorage
   * @returns The number of items
   */
  static getLength(): number {
    if (typeof window === "undefined") {
      return 0;
    }

    try {
      return localStorage.length;
    } catch (_error) {
      return 0;
    }
  }

  /**
   * Get the key at a specific index
   * @param index - The index to get the key for
   * @returns The key or null if not found
   */
  static key(index: number): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      return localStorage.key(index);
    } catch (_error) {
      return null;
    }
  }
}

export default SyncLocalStorage;
