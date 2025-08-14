'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/app/contexts/ThemeContext';
import { FavoriteConfig, getFavoriteConfigs, removeFavoriteConfig } from '@/app/utils/favorites';
import { buildTestParams, saveTestParams } from '@/app/utils/testParams';
import { clearTestSession } from '@/app/utils/timeManagement';
import type { Settings } from '@/app/practice/types';
import { Hourglass, BookCheck, Play, Trash2 } from 'lucide-react';
import { listDownloadedEventSlugs } from '@/app/utils/storage';
import { toast } from 'react-toastify';

export default function FavoriteConfigsCard() {
  const { darkMode } = useTheme();
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteConfig[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [downloadedSet, setDownloadedSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      setFavorites(getFavoriteConfigs());
    } catch {}
    // Listen to storage changes from other tabs/windows
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'scio_favorite_test_configs') {
        setFavorites(getFavoriteConfigs());
      }
    };
    window.addEventListener('storage', onStorage);
    // Setup offline state and downloaded events
    const updateOnline = () => setIsOffline(!navigator.onLine);
    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    (async () => {
      try {
        const keys = await listDownloadedEventSlugs();
        setDownloadedSet(new Set(keys));
      } catch {}
    })();
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  const cardStyle = darkMode
    ? 'bg-gray-800 border border-gray-700'
    : 'bg-white border border-gray-200';

  const startFromConfig = (config: FavoriteConfig) => {
    const { eventName, settings } = config;
    if (isOffline) {
      const slug = eventName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (!downloadedSet.has(slug)) {
        toast.error('This event is not downloaded for offline use. Go to Offline page to download it.');
        return;
      }
    }
    try { clearTestSession(); } catch {}
    const testParams = buildTestParams(eventName, settings);
    saveTestParams(testParams);
    if (eventName === 'Codebusters') {
      router.push('/codebusters');
    } else {
      router.push('/test');
    }
  };

  const handleRemove = (config: FavoriteConfig) => {
    try {
      const next = removeFavoriteConfig(config);
      setFavorites(next);
    } catch {}
  };

  return (
    <div className={`hidden md:flex md:col-span-2 rounded-lg ${cardStyle} pl-5 pr-5 h-32 overflow-hidden`}>
      <div className="flex flex-row w-full items-center gap-4 h-full">
        {/* Left: Title/Description */}
        <div className="flex-none min-w-[110px]">
          <h3 className={`${darkMode ? 'text-white' : 'text-gray-800'} text-lg font-semibold leading-tight`}>
            <span className="block">Favorited</span>
            <span className="block">Configs</span>
          </h3>
        </div>

        {/* Right: One row, four columns */}
        <div className="flex-1 h-full">
          <div className="grid grid-cols-4 gap-4 h-full items-center">
            {Array.from({ length: 4 }).map((_, idx) => {
              const fav = favorites[idx];
              if (!fav) {
                return (
                  <div key={`placeholder-${idx}`} className={`hidden md:flex items-center justify-center rounded-md h-[80%] ${darkMode ? 'bg-gray-900/30 border border-gray-800' : 'bg-gray-50/60 border border-gray-200'}`}>
                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-xs`}>No favorited configuration</span>
                  </div>
                );
              }
              return (
              <div
                key={`fav-${idx}`}
                role="button"
                tabIndex={0}
                className={`relative group rounded-md overflow-hidden h-[80%] ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'} cursor-pointer`}
                onClick={() => startFromConfig(fav)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startFromConfig(fav); } }}
              >
                <div className="absolute inset-0 p-3 flex flex-col items-start justify-between text-left">
                  <div className={`text-xs font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} break-words leading-snug`}>{fav.eventName}</div>
                  <div className="w-full">
                    <ConfigSummaryGrid settings={fav.settings} darkMode={darkMode} />
                  </div>
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); startFromConfig(fav); }}
                    className="p-2 rounded-full border border-white/70 text-white hover:border-white"
                    title="Start"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemove(fav); }}
                    className="p-2 rounded-full border border-white/70 text-white hover:border-white"
                    title="Remove"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// local normalization no longer used; centralized via buildTestParams

// summarizeSettings retained historically; currently unused after grid redesign

function ConfigSummaryGrid({ settings, darkMode }: { settings: Settings; darkMode: boolean }) {
  const typeLabel = settings.types === 'both' ? 'MCQ+FRQ' : settings.types === 'free-response' ? 'FRQ' : 'MCQ';
  const divLabel = settings.division === 'any' ? 'Div B/C' : `Div ${settings.division}`;
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
      <div className="flex items-center gap-1 text-xs">
        <BookCheck className={`w-3.5 h-3.5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
        <span className={`${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{settings.questionCount}</span>
        <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>qs</span>
      </div>
      <div className="flex items-center gap-1 text-xs">
        <Hourglass className={`w-3.5 h-3.5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
        <span className={`${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{settings.timeLimit}</span>
        <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>min</span>
      </div>
      <div className={`text-xs ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{typeLabel}</div>
      <div className={`text-xs ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{divLabel}</div>
    </div>
  );
}


