'use client';

import type { Settings } from '@/app/practice/types';

export interface FavoriteConfig {
  eventName: string;
  settings: Settings;
}

const FAVORITES_KEY = 'scio_favorite_test_configs';
const MAX_FAVORITES = 4;

function normalizeArray(values: string[] | undefined): string[] {
  if (!values || values.length === 0) return [];
  return [...values].map(v => (v || '').toString()).sort((a, b) => a.localeCompare(b));
}

function normalizeSettings(settings: Settings): Settings {
  return {
    ...settings,
    difficulties: normalizeArray(settings.difficulties),
    subtopics: normalizeArray(settings.subtopics),
    questionCount: Math.max(1, Math.min(200, Number(settings.questionCount || 0))),
    timeLimit: Math.max(1, Math.min(120, Number(settings.timeLimit || 0))),
    idPercentage: typeof settings.idPercentage === 'number' ? Math.max(0, Math.min(100, settings.idPercentage)) : settings.idPercentage,
    types: ['multiple-choice', 'both', 'free-response'].includes(settings.types) ? settings.types : 'multiple-choice',
    division: ['B', 'C', 'any'].includes(settings.division) ? settings.division : 'any',
    tournament: settings.tournament || '',
  } as Settings;
}

function normalizeConfig(config: FavoriteConfig): FavoriteConfig {
  return {
    eventName: config.eventName,
    settings: normalizeSettings(config.settings),
  };
}

function configsEqual(a: FavoriteConfig, b: FavoriteConfig): boolean {
  const na = normalizeConfig(a);
  const nb = normalizeConfig(b);
  return JSON.stringify(na) === JSON.stringify(nb);
}

export function getFavoriteConfigs(): FavoriteConfig[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(FAVORITES_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavoriteConfig[];
    if (!Array.isArray(parsed)) return [];
    // Ensure normalization and cap
    const cleaned = parsed
      .filter(x => x && typeof x.eventName === 'string' && x.settings)
      .map(x => normalizeConfig(x));
    return cleaned.slice(0, MAX_FAVORITES);
  } catch {
    return [];
  }
}

function saveFavoriteConfigs(favorites: FavoriteConfig[]) {
  try {
    const capped = favorites.slice(0, MAX_FAVORITES);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(capped));
  } catch {}
}

export function isConfigFavorited(config: FavoriteConfig): boolean {
  const favorites = getFavoriteConfigs();
  return favorites.some(f => configsEqual(f, config));
}

export function addFavoriteConfig(config: FavoriteConfig): FavoriteConfig[] {
  const normalized = normalizeConfig(config);
  const favorites = getFavoriteConfigs();
  if (favorites.some(f => configsEqual(f, normalized))) {
    return favorites;
  }
  const next = [normalized, ...favorites].slice(0, MAX_FAVORITES);
  saveFavoriteConfigs(next);
  return next;
}

export function removeFavoriteConfig(config: FavoriteConfig): FavoriteConfig[] {
  const favorites = getFavoriteConfigs();
  const next = favorites.filter(f => !configsEqual(f, config));
  saveFavoriteConfigs(next);
  return next;
}

export function toggleFavoriteConfig(config: FavoriteConfig): { favorited: boolean; favorites: FavoriteConfig[] } {
  const normalized = normalizeConfig(config);
  const already = isConfigFavorited(normalized);
  const favorites = already ? removeFavoriteConfig(normalized) : addFavoriteConfig(normalized);
  return { favorited: !already, favorites };
}


