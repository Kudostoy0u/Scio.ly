// localstorage keys for different event types
export const NORMAL_EVENT_PREFERENCES = 'scio_normal_event_preferences';
export const CODEBUSTERS_PREFERENCES = 'scio_codebusters_preferences';


export const NORMAL_DEFAULTS = {
  questionCount: 10,
  timeLimit: 15
};

export const CODEBUSTERS_DEFAULTS = {
  questionCount: 3,
  timeLimit: 15
};


export const savePreferences = (eventName: string, questionCount: number, timeLimit: number) => {
  const isCodebusters = eventName === 'Codebusters';
  const key = isCodebusters ? CODEBUSTERS_PREFERENCES : NORMAL_EVENT_PREFERENCES;
  const preferences = { questionCount, timeLimit };
  localStorage.setItem(key, JSON.stringify(preferences));
};

export const loadPreferences = (eventName: string) => {
  const isCodebusters = eventName === 'Codebusters';
  const key = isCodebusters ? CODEBUSTERS_PREFERENCES : NORMAL_EVENT_PREFERENCES;
  const defaults = isCodebusters ? CODEBUSTERS_DEFAULTS : NORMAL_DEFAULTS;
  
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const preferences = JSON.parse(saved);
      return {
        questionCount: preferences.questionCount || defaults.questionCount,
        timeLimit: preferences.timeLimit || defaults.timeLimit
      };
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
  
  return defaults;
}; 