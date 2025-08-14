'use client';

import Dexie, { Table } from 'dexie';

export interface DownloadEntry {
  slug: string;
  updatedAt: number;
}

export class ScioDatabase extends Dexie {
  // Legacy v1 store (events) is retained for migration only
  events!: Table<any, string>;
  downloads!: Table<DownloadEntry, string>;
  eventData!: Table<any, string>;

  constructor() {
    super('scio-offline');
    // v1: single store used previously
    this.version(1).stores({
      events: ''
    });
    // v2: normalized stores: downloads (metadata), eventData (payload)
    this.version(2)
      .stores({
        downloads: '&slug, updatedAt',
        eventData: '&slug'
      })
      .upgrade(async (tx) => {
        try {
          // Migrate legacy events -> eventData + downloads
          const legacy = tx.table('events');
          const keys: IDBValidKey[] = await (legacy as any).toCollection().primaryKeys();
          for (const key of keys) {
            try {
              const val = await (legacy as any).get(key);
              if (typeof key !== 'undefined') {
                await tx.table('eventData').put(val, key as any);
                await tx.table('downloads').put({ slug: String(key), updatedAt: Date.now() });
              }
            } catch {}
          }
        } catch {}
      });
  }
}

export const db = new ScioDatabase();


