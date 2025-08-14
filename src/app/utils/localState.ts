'use client';

import type { DailyMetrics } from './metrics';
import { fetchDailyUserStatsRow } from './metrics';

// Keys
const DISPLAY_NAME_KEY = 'scio_display_name';

// Date helper (YYYY-MM-DD)
export const getTodayKey = (): string => new Date().toISOString().split('T')[0];

// Greeting name local accessors
export function getLocalGreetingName(): string {
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function setLocalGreetingName(name: string): void {
  try {
    localStorage.setItem(DISPLAY_NAME_KEY, name);
    window.dispatchEvent(new CustomEvent('scio-display-name-updated', { detail: name }));
  } catch {}
}

// Metrics local accessors
export function getLocalDailyMetrics(): DailyMetrics {
  const today = getTodayKey();
  const defaultMetrics: DailyMetrics = {
    questionsAttempted: 0,
    correctAnswers: 0,
    eventsPracticed: [],
    eventQuestions: {},
    gamePoints: 0,
  };
  try {
    const raw = localStorage.getItem(`metrics_${today}`);
    return raw ? { ...defaultMetrics, ...JSON.parse(raw) } : defaultMetrics;
  } catch {
    return defaultMetrics;
  }
}

export function setLocalDailyMetrics(metrics: DailyMetrics): void {
  const today = getTodayKey();
  try { localStorage.setItem(`metrics_${today}`, JSON.stringify(metrics)); } catch {}
}

export function getLocalHistory(): {
  historicalData: { date: string; count: number }[];
  historyData: Record<string, { questionsAttempted: number; correctAnswers: number; eventsPracticed?: string[] }>;
} {
  const entries: Array<{ date: string; questions_attempted: number; correct_answers: number; events_practiced: string[] }> = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      if (!key.startsWith('metrics_')) continue;
      const date = key.replace('metrics_', '');
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { questionsAttempted?: number; correctAnswers?: number; eventsPracticed?: string[] };
      entries.push({
        date,
        questions_attempted: parsed.questionsAttempted || 0,
        correct_answers: parsed.correctAnswers || 0,
        events_practiced: parsed.eventsPracticed || [],
      });
    }
  } catch {}

  entries.sort((a, b) => a.date.localeCompare(b.date));
  const historicalData = entries.map((e) => ({ date: e.date, count: e.questions_attempted }));
  const historyData: Record<string, { questionsAttempted: number; correctAnswers: number; eventsPracticed?: string[] }> = {};
  entries.forEach((e) => {
    historyData[e.date] = {
      questionsAttempted: e.questions_attempted,
      correctAnswers: e.correct_answers,
      eventsPracticed: e.events_practiced,
    };
  });
  return { historicalData, historyData };
}

// Optional sync from Supabase to localStorage at login
export async function syncLocalFromSupabase(userId: string): Promise<void> {
  try {
    const today = getTodayKey();
    const row = await fetchDailyUserStatsRow(userId, today);
    if (row) {
      setLocalDailyMetrics({
        questionsAttempted: row.questions_attempted || 0,
        correctAnswers: row.correct_answers || 0,
        eventsPracticed: row.events_practiced || [],
        eventQuestions: row.event_questions || {},
        gamePoints: row.game_points || 0,
      });
    }
  } catch {}

  // Also sync greeting name
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: profile } = await supabase
      .from('users')
      .select('first_name, display_name')
      .eq('id', userId)
      .maybeSingle();
    const first = (profile as any)?.first_name as string | undefined;
    const display = (profile as any)?.display_name as string | undefined;
    const chosen = (first && first.trim())
      ? first.trim()
      : (display && display.trim())
        ? display.trim().split(' ')[0]
        : '';
    if (chosen) {
      setLocalGreetingName(chosen);
    }
  } catch {}
}

// Clear all localStorage keys except the theme preference. Also signals name reset.
export function resetAllLocalStorageExceptTheme(): void {
  try {
    const preservedTheme = localStorage.getItem('theme');
    localStorage.clear();
    if (preservedTheme !== null) {
      localStorage.setItem('theme', preservedTheme);
    }
    // Explicitly ensure common cache keys are absent after clear (defensive)
    try { localStorage.removeItem('scio_display_name'); } catch {}
    try { localStorage.removeItem('scio_chart_type'); } catch {}
    // Notify listeners that display name was cleared
    try { window.dispatchEvent(new CustomEvent('scio-display-name-updated', { detail: '' })); } catch {}
  } catch {}
}


