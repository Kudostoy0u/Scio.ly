/**
 * Image preloading utilities for Science Olympiad platform
 * Provides efficient image preloading for better user experience
 */

/**
 * Preloads an image by creating a new Image object
 * Returns a promise that resolves when the image is loaded
 *
 * @param {string} url - URL of the image to preload
 * @returns {Promise<void>} Promise that resolves when image is loaded
 * @throws {Error} When image fails to load
 * @example
 * ```typescript
 * try {
 *   await preloadImage('/images/hero.jpg');
 *   console.log('Image preloaded successfully');
 * } catch (error) {
 *   console.error('Image preload failed:', error);
 * }
 * ```
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image failed to load"));
      img.src = url;
    } catch (e) {
      reject(e as Error);
    }
  });
}
