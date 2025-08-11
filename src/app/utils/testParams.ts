'use client';

import type { Settings } from '@/app/practice/types';

export type TestParams = {
  eventName: string;
  questionCount: number;
  timeLimit: number;
  difficulties: string[];
  types: 'multiple-choice' | 'free-response' | 'both';
  division: 'B' | 'C' | 'any';
  tournament: string;
  subtopics: string[];
  idPercentage?: number;
};

function normalizeArray(values: string[] | undefined): string[] {
  if (!values || values.length === 0) return [];
  return [...values].map(v => (v || '').toString()).filter(Boolean);
}

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

  return {
    eventName,
    questionCount: normalizedQuestionCount,
    timeLimit: normalizedTimeLimit,
    difficulties: normalizeArray(settings.difficulties),
    types: normalizedTypes,
    division: normalizedDivision,
    tournament: settings.tournament || 'any',
    subtopics: normalizeArray(settings.subtopics),
    idPercentage: normalizedIdPct,
  };
}

export function saveTestParams(params: TestParams) {
  try {
    localStorage.setItem('testParams', JSON.stringify(params));
    localStorage.removeItem('testQuestions');
    localStorage.removeItem('testUserAnswers');
  } catch {}
  try {
    const cookiePayload = encodeURIComponent(JSON.stringify(params));
    document.cookie = `scio_test_params=${cookiePayload}; Path=/; Max-Age=600; SameSite=Lax`;
  } catch {}
}


