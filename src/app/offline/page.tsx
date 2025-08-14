'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import api from '../api';
import Header from '@/app/components/Header';
import { listDownloadedEventSlugs, saveOfflineEvent, subscribeToDownloads } from '@/app/utils/storage';

type EventOption = { name: string; slug: string };

export default function OfflinePage() {
  const { darkMode } = useTheme();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [downloaded, setDownloaded] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    // Build event list from approved events
    const approvedEvents = [
      'Anatomy - Nervous',
      'Anatomy - Endocrine',
      'Anatomy - Sense Organs',
      // 'Anatomy - Cardiovascular',
      // 'Anatomy - Digestive',
      // 'Anatomy - Excretory',
      // 'Anatomy - Immune',
      // 'Anatomy - Integumentary',
      // 'Anatomy - Lymphatic',
      // 'Anatomy - Muscular',
      // 'Anatomy - Respiratory',
      // 'Anatomy - Skeletal',
      'Astronomy',
      // 'Boomilever',
      // 'Bungee Drop',
      'Chemistry Lab',
      'Circuit Lab',
      'Codebusters',
      // 'Crime Busters',
      'Designer Genes',
      'Disease Detectives',
      // 'Dynamic Planet - Earth Fresh Waters',
      // 'Dynamic Planet - Glaciers',
      'Dynamic Planet - Oceanography',
      // 'Dynamic Planet - Tectonics',
      // 'Electric Vehicle',
      // 'Engineering CAD',
      'Entomology',
      // 'Experimental Design',
      'Forensics',
      // 'Helicopter',
      'Heredity',
        // 'Hovercraft',
        // 'Machines',
      'Materials Science',
      'Meteorology',
      'Metric Mastery',
      // 'Mission Possible',
      'Potions and Poisons',
      'Remote Sensing',
      // 'Robot Tour',
      'Rocks and Minerals',
      // 'Scrambler',
      'Solar System',
      'Water Quality - Freshwater',
      // 'Write It Do It',
    ];
    const list: EventOption[] = approvedEvents.map((name) => ({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }));
    setEvents(list);
    
    // Seed downloaded map from IndexedDB
    let cancelled = false;
    (async () => {
      try {
        const keys = await listDownloadedEventSlugs();
        if (cancelled) return;
        const flags: Record<string, boolean> = {};
        keys.forEach((k) => { flags[String(k)] = true; });
        setDownloaded(flags);
      } catch {}
    })();
    
    // Subscribe to cross-tab download updates for immediate UI sync
    const unsubscribe = subscribeToDownloads(async () => {
      try {
        const keys = await listDownloadedEventSlugs();
        const flags: Record<string, boolean> = {};
        keys.forEach((k) => { flags[String(k)] = true; });
        setDownloaded(flags);
      } catch {}
    });
    return () => { 
      cancelled = true; 
      try { unsubscribe(); } catch {} 
    };
  }, []);

  // Also re-read downloaded flags when page regains focus
  useEffect(() => {
    const onFocus = async () => {
      try {
        const keys = await listDownloadedEventSlugs();
        const flags: Record<string, boolean> = {};
        keys.forEach((k) => { flags[String(k)] = true; });
        setDownloaded(flags);
      } catch {}
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleDownloadEvent = async (evt: EventOption) => {
    setDownloading((prev) => ({ ...prev, [evt.slug]: true }));
    setStatus(`Downloading ${evt.name}...`);
    try {
      if (evt.name === 'Codebusters') {
        // Download a pool of quotes for offline Codebusters use
        const enResp = await fetch(`/api/quotes?language=en&limit=200`);
        const esResp = await fetch(`/api/quotes?language=es&limit=200`);
        if (!enResp.ok || !esResp.ok) throw new Error('Failed to fetch quotes');
        const enData = await enResp.json();
        const esData = await esResp.json();
        const enQuotes = enData.data?.quotes || enData.quotes || [];
        const esQuotes = esData.data?.quotes || esData.quotes || [];
        await saveOfflineEvent('codebusters', { en: enQuotes, es: esQuotes });
      } else {
        const params = new URLSearchParams({ event: evt.name, limit: '1000' });
        const res = await fetch(`${api.questions}?${params.toString()}`);
        if (!res.ok) throw new Error(`Failed to download ${evt.name}`);
        const data = await res.json();
        const questions = data?.data ?? [];
        await saveOfflineEvent(evt.slug, questions);
      }
      setDownloaded((prev) => ({ ...prev, [evt.slug]: true }));
      setStatus(`Downloaded ${evt.name}.`);
    } catch {
      setStatus(`Failed to download ${evt.name}.`);
    } finally {
      setDownloading((prev) => ({ ...prev, [evt.slug]: false }));
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header />
      <div className="pt-20 px-4 sm:px-6 max-w-3xl mx-auto">
        <h1 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Offline Downloads</h1>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-4`}>
          Select events to download for offline use.
        </p>
        <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="space-y-3">
            {events.map((evt) => (
              <div key={evt.slug} className="flex items-center justify-between">
                <label className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{evt.name}</label>
                <button
                  onClick={() => handleDownloadEvent(evt)}
                  disabled={!!downloading[evt.slug]}
                  className={`px-3 py-1.5 rounded-md text-sm ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400'}`}
                >
                  {downloading[evt.slug] ? 'Downloading…' : downloaded[evt.slug] ? 'Downloaded' : 'Download'}
                </button>
              </div>
            ))}
          </div>
          {status && <div className={`mt-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{status}</div>}
        </div>
        <p className={`text-xs mt-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          When offline, the app can load downloaded questions for tests and unlimited practice.
        </p>
      </div>
    </div>
  );
}


