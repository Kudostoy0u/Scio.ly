'use client';
import { db } from './db';

export function slugifyEventName(name: string): string {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

let downloadsChannel: BroadcastChannel | null = null;
function getDownloadsChannel(): BroadcastChannel | null {
  try {
    if (typeof window === 'undefined') return null;
    const BC: any = (window as any).BroadcastChannel;
    if (!BC) return null;
    if (!downloadsChannel) downloadsChannel = new BC('scio-downloads');
    return downloadsChannel;
  } catch {
    return null;
  }
}

export function subscribeToDownloads(onUpdate: () => void): () => void {
  try {
    const ch = getDownloadsChannel();
    const handler = (e: MessageEvent) => {
      const payload: any = (e as any)?.data ?? e;
      if (payload && payload.type === 'updated') onUpdate();
    };

    if (ch) {
      try {
        (ch as any).addEventListener?.('message', handler);
      } catch {
        (ch as any).onmessage = handler as any;
      }

      // Also listen to same-window CustomEvent fallback so same-tab listeners get immediate updates
      const winHandler = (ev: Event) => {
        try {
          const detail = (ev as CustomEvent).detail as any;
          if (detail && detail.type === 'updated') onUpdate();
        } catch {}
      };
      window.addEventListener('scio-downloads-updated', winHandler as EventListener);

      return () => {
        try {
          (ch as any).removeEventListener?.('message', handler);
        } catch {
          try { (ch as any).onmessage = null; } catch {}
        }
        try { window.removeEventListener('scio-downloads-updated', winHandler as EventListener); } catch {}
      };
    }

    // If BroadcastChannel not available, use window events only
    const winHandlerOnly = () => onUpdate();
    window.addEventListener('scio-downloads-updated', winHandlerOnly as EventListener);
    return () => window.removeEventListener('scio-downloads-updated', winHandlerOnly as EventListener);
  } catch {
    return () => {};
  }
}

// --- Helpers: DB open + queue management ---
async function ensureDbOpen() {
  try { await db.open(); } catch {}
}

const MANIFEST_KEY = 'scio_downloaded_events';
const SAVE_QUEUE_KEY = 'scio_download_queue';

function getDownloadedManifest(): Set<string> {
  try {
    const raw = localStorage.getItem(MANIFEST_KEY);
    if (!raw) return new Set<string>();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.map((s) => String(s)));
    return new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function saveDownloadedManifest(set: Set<string>) {
  try {
    localStorage.setItem(MANIFEST_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function markEventDownloaded(slug: string) {
  const set = getDownloadedManifest();
  set.add(slug);
  saveDownloadedManifest(set);
}

export function markEventRemoved(slug: string) {
  const set = getDownloadedManifest();
  set.delete(slug);
  saveDownloadedManifest(set);
}

function broadcastDownloadUpdate(slug: string) {
  try {
    const ch = getDownloadsChannel();
    if (ch) {
      ch.postMessage({ type: 'updated', slug });
    }
  } catch {}
  try {
    // same-window fallback
    const ev = new CustomEvent('scio-downloads-updated', { detail: { type: 'updated', slug } });
    window.dispatchEvent(ev);
  } catch {}
}

function enqueueFailedSave(item: { slug: string; payload: unknown }) {
  try {
    const raw = localStorage.getItem(SAVE_QUEUE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push({ slug: item.slug, payload: item.payload, ts: Date.now() });
    localStorage.setItem(SAVE_QUEUE_KEY, JSON.stringify(arr));
  } catch {}
}

async function processSaveQueue() {
  try {
    const raw = localStorage.getItem(SAVE_QUEUE_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw) as any[];
    if (!Array.isArray(arr) || arr.length === 0) return;

    const remaining: any[] = [];
    for (const entry of arr) {
      try {
        await ensureDbOpen();
        // try same write logic as saveOfflineEvent (atomic)
        const slug = String(entry.slug);
        const payload = entry.payload;
        try {
          await (db as any).transaction?.('rw', [(db as any).downloads, (db as any).eventData], async () => {
            await (db as any).eventData?.put({ slug, data: payload });
            await (db as any).downloads?.put({ slug, updatedAt: Date.now() });
          });
          // on success, mark and broadcast
          markEventDownloaded(slug);
          broadcastDownloadUpdate(slug);
        } catch {
          // keep for retry
          remaining.push(entry);
        }
      } catch {
        remaining.push(entry);
      }
    }
    try { localStorage.setItem(SAVE_QUEUE_KEY, JSON.stringify(remaining)); } catch {}
  } catch {}
}

// Rebuild manifest by scanning DB stores for authoritative list
export async function reconcileManifestFromDB(): Promise<Set<string>> {
  try {
    await ensureDbOpen();
    const all = new Set<string>();
    try {
      const dlKeys: IDBValidKey[] = await (db as any).downloads?.toCollection()?.primaryKeys?.() || [];
      dlKeys.forEach((k) => all.add(String(k)));
    } catch {}
    try {
      const dataKeys: IDBValidKey[] = await (db as any).eventData?.toCollection()?.primaryKeys?.() || [];
      dataKeys.forEach((k) => all.add(String(k)));
    } catch {}
    try {
      const legacyKeys: IDBValidKey[] = await (db as any).events?.toCollection()?.primaryKeys?.() || [];
      legacyKeys.forEach((k) => all.add(String(k)));
    } catch {}
    // Merge with existing manifest (ensure resiliency)
    getDownloadedManifest().forEach((k) => all.add(k));
    saveDownloadedManifest(all);
    return all;
  } catch {
    return getDownloadedManifest();
  }
}

// Returns all slugs that have been downloaded to IndexedDB
export async function listDownloadedEventSlugs(): Promise<string[]> {
  try {
    // Ensure manifest is in sync with DB (best-effort)
    await reconcileManifestFromDB();
    const manifest = getDownloadedManifest();
    return Array.from(manifest);
  } catch {
    return Array.from(getDownloadedManifest());
  }
}

export async function hasOfflineEvent(slug: string): Promise<boolean> {
  try {
    await ensureDbOpen();
    // Check downloads metadata first
    const meta = await (db as any).downloads?.get(slug as any);
    if (typeof meta !== 'undefined' && meta !== null) return true;
    // Then check eventData payload
    const v = await (db as any).eventData?.get(slug as any);
    if (typeof v !== 'undefined' && v !== null) return true;
    // Finally, check legacy events store
    const legacy = await (db as any).events?.get(slug as any);
    if (typeof legacy !== 'undefined' && legacy !== null) return true;
    // Fallback to manifest
    return getDownloadedManifest().has(slug);
  } catch {
    return getDownloadedManifest().has(slug);
  }
}

// Save event payload and mark as downloaded (normalized schema)
// Returns true if persisted to DB; on failure it will enqueue for retry and still update manifest for UX resiliency
export async function saveOfflineEvent(slug: string, payload: unknown): Promise<boolean> {
  console.log('[STORAGE] saveOfflineEvent called for:', slug);
  try {
    await ensureDbOpen();
    console.log('[STORAGE] Database opened, writing to stores...');

    // Try to write atomically using a transaction
    try {
      await (db as any).transaction?.('rw', [(db as any).downloads, (db as any).eventData], async () => {
        await (db as any).eventData?.put({ slug, data: payload });
        await (db as any).downloads?.put({ slug, updatedAt: Date.now() });
      });
      // Persist manifest for resiliency
      try { markEventDownloaded(slug); } catch {}
      // Broadcast change
      try { broadcastDownloadUpdate(slug); } catch {}
      // Try processing any queued writes in background
      void processSaveQueue();
      console.log('[STORAGE] saveOfflineEvent completed for:', slug);
      return true;
    } catch (e) {
      console.error('[STORAGE] Atomic write failed, enqueueing for retry:', e);
      // Fallback: try best-effort individual writes
      try {
        await (db as any).eventData?.put({ slug, data: payload });
      } catch {
        // enqueue for later retry
        try { enqueueFailedSave({ slug, payload }); } catch {}
      }
      try { await (db as any).downloads?.put({ slug, updatedAt: Date.now() }); } catch {
        try { enqueueFailedSave({ slug, payload }); } catch {}
      }

      // Update manifest and broadcast so UI shows it as downloaded even if DB write pending
      try { markEventDownloaded(slug); } catch {}
      try { broadcastDownloadUpdate(slug); } catch {}
      // Kick off background queue processing
      void processSaveQueue();
      console.log('[STORAGE] saveOfflineEvent completed (queued) for:', slug);
      return false;
    }
  } catch (e) {
    console.error('[STORAGE] saveOfflineEvent failed:', e);
    try { enqueueFailedSave({ slug, payload }); } catch {}
    try { markEventDownloaded(slug); } catch {}
    try { broadcastDownloadUpdate(slug); } catch {}
    return false;
  }
}

// Remove event payload and downloaded marker
export async function removeOfflineEvent(slug: string): Promise<void> {
  try {
    await ensureDbOpen();
    try {
      await (db as any).transaction?.('rw', [(db as any).downloads, (db as any).eventData], async () => {
        await (db as any).eventData?.delete(slug as any);
        await (db as any).downloads?.delete(slug as any);
      });
    } catch {
      try { await (db as any).eventData?.delete(slug as any); } catch {}
      try { await (db as any).downloads?.delete(slug as any); } catch {}
    }
  } catch {
    // ignore
  } finally {
    try { markEventRemoved(slug); } catch {}
    try { broadcastDownloadUpdate(slug); } catch {}
  }
}

// Public: attempt to sync any queued saves + reconcile manifest
export async function syncOfflineDownloads(): Promise<void> {
  try {
    await processSaveQueue();
    await reconcileManifestFromDB();
  } catch {}
}


