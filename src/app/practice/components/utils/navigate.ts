import { clearTestSession } from '@/app/utils/timeManagement';
import { buildTestParams, saveTestParams } from '@/app/utils/testParams';
import { Settings } from '../../types';

export function proceedWithTest(selectedEventName: string, settings: Settings, push: (url: string) => void) {
  clearTestSession();
  try { clearTestSession(); } catch {}
  const testParams = buildTestParams(selectedEventName, settings);
  saveTestParams(testParams);
  if (selectedEventName === 'Codebusters') {
    try {
      localStorage.removeItem('codebustersQuotes');
      localStorage.removeItem('codebustersIsTestSubmitted');
      localStorage.removeItem('codebustersTestScore');
      localStorage.removeItem('codebustersTimeLeft');
      localStorage.removeItem('codebustersQuotesLoadedFromStorage');
      localStorage.removeItem('shareCode');
    } catch {}
    push('/codebusters');
  } else {
    try {
      localStorage.removeItem('testGradingResults');
      localStorage.removeItem('testSubmitted');
    } catch {}
    push('/test');
  }
}

export function proceedWithUnlimited(selectedEventName: string, settings: Settings, push: (url: string) => void) {
  try {
    const cookiePayload = encodeURIComponent(JSON.stringify({
      eventName: selectedEventName,
      types: settings.types,
      division: settings.division,
      difficulties: settings.difficulties,
      subtopics: settings.subtopics,
      idPercentage: settings.idPercentage,
      pureIdOnly: settings.pureIdOnly,
    }));
    document.cookie = `scio_unlimited_params=${cookiePayload}; Path=/; Max-Age=600; SameSite=Lax`;
  } catch {}
  if (selectedEventName === 'Codebusters') {
    const cbParams = buildTestParams(selectedEventName, { ...settings, questionCount: 1 });
    saveTestParams(cbParams);
    try {
      localStorage.removeItem('codebustersQuotes');
      localStorage.removeItem('codebustersIsTestSubmitted');
      localStorage.removeItem('codebustersTestScore');
      localStorage.removeItem('codebustersTimeLeft');
      localStorage.removeItem('codebustersQuotesLoadedFromStorage');
      localStorage.removeItem('shareCode');
    } catch {}
    push('/codebusters');
    return;
  }
  push('/unlimited');
}


