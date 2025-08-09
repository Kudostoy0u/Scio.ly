'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import api from '../api';

type EventOption = { name: string; slug: string };

// Minimal IndexedDB helper
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

async function saveEventQuestions(slug: string, questions: unknown) {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('events', 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore('events').put(questions as any, slug);
  });
}

// Removed unused loadEventQuestions helper

export default function OfflinePage() {
  const { darkMode } = useTheme();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [isCaching, setIsCaching] = useState(false);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    // Build event list from known events (quick mapping for UX)
    const list: EventOption[] = [
      'Anatomy and Physiology', 'Astronomy', 'Dynamic Planet', 'Rocks and Minerals', 'Disease Detectives',
      'Remote Sensing', 'Chemistry Lab', 'Circuit Lab', 'Forensics', 'Materials Science', 'Codebusters'
    ].map((name) => ({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }));
    setEvents(list);
  }, []);

  const totalCount = useMemo(() => Object.values(selected).reduce((a, b) => a + (b || 0), 0), [selected]);

  const handleCache = async () => {
    setIsCaching(true);
    setStatus('');
    try {
      for (const evt of events) {
        const count = selected[evt.slug] || 0;
        if (!count) continue;
        setStatus(`Fetching ${count} for ${evt.name}...`);
        const params = new URLSearchParams({ event: evt.name, limit: String(Math.min(count, 1000)) });
        const res = await fetch(`${api.questions}?${params.toString()}`);
        if (!res.ok) throw new Error(`Failed to fetch ${evt.name}`);
        const data = await res.json();
        const questions = data?.data ?? [];
        await saveEventQuestions(evt.slug, questions);
      }
      setStatus('Cached successfully.');
    } catch {
      setStatus('Failed to cache.');
    } finally {
      setIsCaching(false);
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="pt-20 px-4 sm:px-6 max-w-3xl mx-auto">
        <h1 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Offline Downloads</h1>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-4`}>
          Select events to download questions for offline use (max 1000 per event).
        </p>
        <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="space-y-3">
            {events.map((evt) => (
              <div key={evt.slug} className="flex items-center justify-between">
                <label className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{evt.name}</label>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={selected[evt.slug] || 0}
                  onChange={(e) => setSelected((prev) => ({ ...prev, [evt.slug]: Math.max(0, Math.min(1000, Number(e.target.value))) }))}
                  className={`w-24 px-2 py-1 rounded-md ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Total: {totalCount}</div>
            <button
              disabled={isCaching || totalCount === 0}
              onClick={handleCache}
              className={`px-4 py-2 rounded-md ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400'}`}
            >
              {isCaching ? 'Caching…' : 'Cache Selected'}
            </button>
          </div>
          {status && <div className={`mt-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{status}</div>}
        </div>
        <p className={`text-xs mt-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          On offline mode, the app can load cached questions for tests and unlimited practice.
        </p>
      </div>
    </div>
  );
}


