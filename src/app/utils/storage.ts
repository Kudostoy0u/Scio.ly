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

// Returns all slugs that have been downloaded to IndexedDB
export async function listDownloadedEventSlugs(): Promise<string[]> {
  const db = await openDB();
  return await new Promise<string[]>((resolve, reject) => {
    try {
      const tx = db.transaction('events', 'readonly');
      const store = tx.objectStore('events');
      const req = (store as any).getAllKeys ? (store as any).getAllKeys() : null;
      if (req) {
        req.onsuccess = () => resolve((req.result as IDBValidKey[]).map(String));
        req.onerror = () => reject(req.error);
      } else {
        // Fallback for very old browsers: iterate with a cursor
        const keys: string[] = [];
        const cursorReq = store.openKeyCursor();
        cursorReq.onsuccess = (event: any) => {
          const cursor = event.target.result as IDBCursor | null;
          if (cursor) {
            keys.push(String(cursor.key));
            cursor.continue();
          } else {
            resolve(keys);
          }
        };
        cursorReq.onerror = () => reject(cursorReq.error);
      }
    } catch (e) {
      reject(e as any);
    }
  });
}

export async function hasOfflineEvent(slug: string): Promise<boolean> {
  const db = await openDB();
  return await new Promise<boolean>((resolve, reject) => {
    const tx = db.transaction('events', 'readonly');
    const req = tx.objectStore('events').get(slug);
    req.onsuccess = () => resolve(typeof req.result !== 'undefined' && req.result !== null);
    req.onerror = () => reject(req.error);
  });
}


