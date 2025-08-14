'use client';

// IndexedDB helper to read cached event questions for offline use
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('scio-offline', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('events')) db.createObjectStore('events');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getEventOfflineQuestions(
  slug: string
): Promise<any[] | { en: any[]; es: any[] } | null> {
  const db = await openDB();
  type CodebustersOfflineQuotes = { en: any[]; es: any[] };
  return await new Promise<any[] | CodebustersOfflineQuotes | null>((resolve, reject) => {
    const tx = db.transaction('events', 'readonly');
    tx.onerror = () => reject(tx.error);
    const req = tx.objectStore('events').get(slug);
    req.onsuccess = () => resolve((req.result as any) || null);
    req.onerror = () => reject(req.error);
  });
}


