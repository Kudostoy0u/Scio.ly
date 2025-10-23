'use client';

import type { Settings } from '@/app/practice/types';
import SyncLocalStorage from '@/lib/database/localStorage-replacement';

/**
 * Test parameters interface for practice tests
 * Defines all parameters needed to configure a practice test
 */
export type TestParams = {
  /** Science Olympiad event name */
  eventName: string;
  /** Number of questions in the test */
  questionCount: number;
  /** Time limit in minutes */
  timeLimit: number;
  /** Array of difficulty levels */
  difficulties: string[];
  /** Question type configuration */
  types: 'multiple-choice' | 'free-response' | 'both';
  /** Division (B, C, or any) */
  division: 'B' | 'C' | 'any';
  /** Tournament name */
  tournament: string;
  /** Array of subtopics to include */
  subtopics: string[];
  /** Optional percentage of ID questions */
  idPercentage?: number;
  /** Optional minimum character length for quotes */
  charLengthMin?: number;
  /** Optional maximum character length for quotes */
  charLengthMax?: number;
  /** Optional flag for pure ID questions only */
  pureIdOnly?: boolean;
};

/**
 * Normalize an array of string values
 * Filters out empty values and converts to strings
 * 
 * @param {string[] | undefined} values - Array of values to normalize
 * @returns {string[]} Normalized array of non-empty strings
 */
function normalizeArray(values: string[] | undefined): string[] {
  if (!values || values.length === 0) return [];
  return [...values].map(v => (v || '').toString()).filter(Boolean);
}

/**
 * Build test parameters from event name and settings
 * Validates and normalizes all settings to create test parameters
 * 
 * @param {string} eventName - Science Olympiad event name
 * @param {Settings} settings - Practice test settings
 * @returns {TestParams} Normalized test parameters
 * @example
 * ```typescript
 * const params = buildTestParams('Anatomy & Physiology', {
 *   questionCount: 25,
 *   timeLimit: 50,
 *   difficulties: ['easy', 'medium'],
 *   types: 'multiple-choice',
 *   division: 'C',
 *   tournament: 'Nationals',
 *   subtopics: ['Cardiovascular System']
 * });
 * ```
 */
export function buildTestParams(eventName: string, settings: Settings): TestParams {
  const normalizedQuestionCount = Math.max(1, Math.min(200, Number(settings.questionCount || 0)));
  const normalizedTimeLimit = Math.max(1, Math.min(120, Number(settings.timeLimit || 0)));
  const normalizedTypes = (['multiple-choice', 'both', 'free-response'] as const).includes(settings.types as any)
    ? (settings.types as TestParams['types'])
    : 'multiple-choice';
  const normalizedDivision = (['B', 'C', 'any'] as const).includes(settings.division as any)
    ? (settings.division as TestParams['division'])
    : 'any';
  const normalizedIdPct = typeof settings.idPercentage === 'number'
    ? Math.max(0, Math.min(100, settings.idPercentage))
    : undefined;
  const normalizedCharLengthMin = typeof settings.charLengthMin === 'number'
    ? Math.max(10, Math.min(200, settings.charLengthMin))
    : undefined;
  const normalizedCharLengthMax = typeof settings.charLengthMax === 'number'
    ? Math.max(10, Math.min(200, settings.charLengthMax))
    : undefined;

  const params = {
    eventName,
    questionCount: normalizedQuestionCount,
    timeLimit: normalizedTimeLimit,
    difficulties: normalizeArray(settings.difficulties),
    types: normalizedTypes,
    division: normalizedDivision,
    tournament: settings.tournament || 'any',
    subtopics: normalizeArray(settings.subtopics),
    idPercentage: normalizedIdPct,
    charLengthMin: normalizedCharLengthMin,
    charLengthMax: normalizedCharLengthMax,
    pureIdOnly: settings.pureIdOnly || false,
  };
  
  return params;
}

export function saveTestParams(params: TestParams) {
  try {
    SyncLocalStorage.setItem('testParams', JSON.stringify(params));
    SyncLocalStorage.removeItem('testQuestions');
    SyncLocalStorage.removeItem('testUserAnswers');
  } catch {}
  try {
    const cookiePayload = encodeURIComponent(JSON.stringify(params));
    document.cookie = `scio_test_params=${cookiePayload}; Path=/; Max-Age=600; SameSite=Lax`;
  } catch {}
}


