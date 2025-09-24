export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image failed to load'));
      img.src = url;
    } catch (e) {
      reject(e as Error);
    }
  });
}


