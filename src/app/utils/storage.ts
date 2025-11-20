"use client";
import logger from "@/lib/utils/logger";

import { db } from "./db";

/**
 * Storage utilities for Science Olympiad platform
 * Provides client-side storage management and event name processing
 */

/**
 * Convert event name to URL-friendly slug
 * Transforms event names into lowercase, hyphenated slugs for URLs
 *
 * @param {string} name - Event name to slugify
 * @returns {string} URL-friendly slug
 * @example
 * ```typescript
 * const slug = slugifyEventName('Anatomy & Physiology');
 * console.log(slug); // "anatomy-physiology"
 * ```
 */
export function slugifyEventName(name: string): string {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

/** Cached downloads broadcast channel */
let downloadsChannel: BroadcastChannel | null = null;

/**
 * Get or create the downloads broadcast channel
 * Creates a broadcast channel for cross-tab communication about downloads
 *
 * @returns {BroadcastChannel | null} Downloads broadcast channel or null if unavailable
 */
function getDownloadsChannel(): BroadcastChannel | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }
    const bc = (window as Window & { BroadcastChannel?: typeof BroadcastChannel }).BroadcastChannel;
    if (!bc) {
      return null;
    }
    if (!downloadsChannel) {
      downloadsChannel = new bc("scio-downloads");
    }
    return downloadsChannel;
  } catch {
    return null;
  }
}

/**
 * Subscribe to download updates across browser tabs
 * Sets up cross-tab communication for download status updates
 *
 * @param {() => void} onUpdate - Callback function to call when downloads update
 * @returns {() => void} Unsubscribe function to remove listeners
 * @example
 * ```typescript
 * const unsubscribe = subscribeToDownloads(() => {
 *   console.log('Downloads updated');
 * });
 * // Later: unsubscribe();
 * ```
 */
export function subscribeToDownloads(onUpdate: () => void): () => void {
  try {
    const ch = getDownloadsChannel();
    const handler = (e: MessageEvent) => {
      const payload = e.data ?? e;
      if (payload && typeof payload === "object" && "type" in payload && payload.type === "updated") {
        onUpdate();
      }
    };

    if (ch) {
      try {
        ch.addEventListener("message", handler);
      } catch {
        (ch as { onmessage: ((e: MessageEvent) => void) | null }).onmessage = handler;
      }

      const winHandler = (ev: Event) => {
        try {
          const detail = (ev as CustomEvent).detail;
          if (detail && typeof detail === "object" && "type" in detail && detail.type === "updated") {
            onUpdate();
          }
        } catch {}
      };
      window.addEventListener("scio-downloads-updated", winHandler);

      return () => {
        try {
          ch.removeEventListener("message", handler);
        } catch {
          try {
            (ch as { onmessage: ((e: MessageEvent) => void) | null }).onmessage = null;
          } catch {}
        }
        try {
          window.removeEventListener("scio-downloads-updated", winHandler as EventListener);
        } catch {}
      };
    }

    const winHandlerOnly = () => onUpdate();
    window.addEventListener("scio-downloads-updated", winHandlerOnly as EventListener);
    return () =>
      window.removeEventListener("scio-downloads-updated", winHandlerOnly as EventListener);
  } catch {
    return () => {};
  }
}

// --- database helpers ---
async function ensureDbOpen() {
  try {
    await db.open();
  } catch {}
}

function broadcastDownloadUpdate(eventSlug: string) {
  try {
    const ch = getDownloadsChannel();
    if (ch) {
      ch.postMessage({ type: "updated", eventSlug });
    }
  } catch {}
  try {
    // same-window fallback
    const ev = new CustomEvent("scio-downloads-updated", {
      detail: { type: "updated", eventSlug },
    });
    window.dispatchEvent(ev);
  } catch {}
}

export async function listDownloadedEventSlugs(): Promise<string[]> {
  try {
    await ensureDbOpen();
    const entries = await db.questions.toArray();
    return entries.map((entry) => entry.eventSlug);
  } catch {
    return [];
  }
}

export async function hasOfflineEvent(eventSlug: string): Promise<boolean> {
  try {
    await ensureDbOpen();
    const entry = await db.questions.get(eventSlug);
    return !!entry;
  } catch {
    return false;
  }
}

export async function getEventOfflineQuestions(
  eventSlug: string
): Promise<Array<{ id: string; author: string; quote: string }> | { en: Array<{ id: string; author: string; quote: string }>; es: Array<{ id: string; author: string; quote: string }> } | []> {
  try {
    await ensureDbOpen();
    const entry = await db.questions.get(eventSlug);
    return entry?.questions || [];
  } catch {
    return [];
  }
}

export async function saveOfflineEvent(
  eventSlug: string,
  questions: Array<{ id: string; author: string; quote: string }> | { en: Array<{ id: string; author: string; quote: string }>; es: Array<{ id: string; author: string; quote: string }> }
): Promise<boolean> {
  try {
    await ensureDbOpen();
    await db.questions.put({
      eventSlug,
      questions,
      updatedAt: Date.now(),
    });
    broadcastDownloadUpdate(eventSlug);
    return true;
  } catch (error) {
    logger.error("Failed to save offline event:", error);
    return false;
  }
}

export async function removeOfflineEvent(eventSlug: string): Promise<void> {
  try {
    await ensureDbOpen();
    await db.questions.delete(eventSlug);
    broadcastDownloadUpdate(eventSlug);
  } catch {
    // ignore errors
  }
}

export async function syncOfflineDownloads(): Promise<void> {}
