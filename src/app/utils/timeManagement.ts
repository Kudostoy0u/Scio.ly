export interface TimeState {
  timeLeft: number;
  isTimeSynchronized: boolean;
  syncTimestamp: number | null;
  originalTimeAtSync: number | null;
  testStartTime: number | null;
  lastPauseTime: number | null;
  totalPausedTime: number;
  isPaused: boolean;
}

export interface TestSession {
  testId: string;
  eventName: string;
  timeLimit: number; // in minutes
  timeState: TimeState;
  lastActivity: number;
  isSubmitted: boolean;
}


const generateTestId = (): string => {
  return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};


export const getCurrentTestSession = (): TestSession | null => {
  try {
    const stored = localStorage.getItem('currentTestSession');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error parsing current test session:', error);
    return null;
  }
};


export const saveTestSession = (session: TestSession): void => {
  try {
    localStorage.setItem('currentTestSession', JSON.stringify(session));
  } catch (error) {
    console.error('Error saving test session:', error);
  }
};


export const clearTestSession = (): void => {
  localStorage.removeItem('currentTestSession');

  localStorage.removeItem('testTimeLeft');
  localStorage.removeItem('isTimeSynchronized');
  localStorage.removeItem('originalSyncTime');
  localStorage.removeItem('syncTimestamp');
  localStorage.removeItem('loadedFromShareCode');
  localStorage.removeItem('codebustersTimeLeft');
  localStorage.removeItem('shareCode');
};


export const initializeTestSession = (
  eventName: string,
  timeLimit: number,
  isSharedTest: boolean = false,
  sharedTimeRemaining?: number
): TestSession => {
  const now = Date.now();
  const timeLimitSeconds = timeLimit * 60;
  
  let timeState: TimeState;
  
  if (isSharedTest && sharedTimeRemaining !== undefined && sharedTimeRemaining !== null) {

    timeState = {
      timeLeft: sharedTimeRemaining,
      isTimeSynchronized: true,
      syncTimestamp: now,
      originalTimeAtSync: sharedTimeRemaining,
      testStartTime: now,
      lastPauseTime: null,
      totalPausedTime: 0,
      isPaused: false
    };
  } else {

    timeState = {
      timeLeft: timeLimitSeconds,
      isTimeSynchronized: false,
      syncTimestamp: null,
      originalTimeAtSync: null,
      testStartTime: now,
      lastPauseTime: null,
      totalPausedTime: 0,
      isPaused: false
    };
  }
  
  const session: TestSession = {
    testId: generateTestId(),
    eventName,
    timeLimit,
    timeState,
    lastActivity: now,
    isSubmitted: false
  };
  
  saveTestSession(session);
  return session;
};


export const resumeTestSession = (): TestSession | null => {
  const session = getCurrentTestSession();
  if (!session) return null;
  
  const now = Date.now();
  const timeState = session.timeState;
  

  session.lastActivity = now;


  if (!timeState.isTimeSynchronized && timeState.isPaused && timeState.lastPauseTime) {
    const pauseDuration = now - timeState.lastPauseTime;
    timeState.totalPausedTime += pauseDuration;
    timeState.isPaused = false;
    timeState.lastPauseTime = null;
  }


  if (timeState.isTimeSynchronized && timeState.syncTimestamp && timeState.originalTimeAtSync) {

    const elapsedMs = now - timeState.syncTimestamp;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    timeState.timeLeft = Math.max(0, timeState.originalTimeAtSync - elapsedSeconds);
  } else {

    // timeleft will continue decrementing only while the test page is mounted
  }
  
  saveTestSession(session);
  return session;
};


export const pauseTestSession = (): void => {
  const session = getCurrentTestSession();
  if (!session) return;
  
  const now = Date.now();
  const timeState = session.timeState;
  
  if (!timeState.isPaused) {
    timeState.isPaused = true;
    timeState.lastPauseTime = now;
    session.lastActivity = now;
    saveTestSession(session);
  }
};


export const resumeFromPause = (): void => {
  const session = getCurrentTestSession();
  if (!session) return;
  
  const now = Date.now();
  const timeState = session.timeState;
  
  if (timeState.isPaused && timeState.lastPauseTime) {
    const pauseDuration = now - timeState.lastPauseTime;
    timeState.totalPausedTime += pauseDuration;
    timeState.isPaused = false;
    timeState.lastPauseTime = null;
    session.lastActivity = now;
    saveTestSession(session);
  }
};


export const updateTimeLeft = (newTimeLeft: number): void => {
  const session = getCurrentTestSession();
  if (!session) return;
  
  session.timeState.timeLeft = Math.max(0, newTimeLeft);
  session.lastActivity = Date.now();
  saveTestSession(session);
};


export const markTestSubmitted = (): void => {
  const session = getCurrentTestSession();
  if (!session) return;
  
  session.isSubmitted = true;
  session.lastActivity = Date.now();
  saveTestSession(session);
};


export const isTestExpired = (): boolean => {
  const session = getCurrentTestSession();
  if (!session) return true;
  
  return session.timeState.timeLeft <= 0;
};


export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};


export const isSessionStale = (maxInactiveMinutes: number = 30): boolean => {
  const session = getCurrentTestSession();
  if (!session) return true;
  
  const now = Date.now();
  const inactiveMs = now - session.lastActivity;
  const inactiveMinutes = inactiveMs / (1000 * 60);
  
  return inactiveMinutes > maxInactiveMinutes;
};


export const resetTestSession = (eventName: string, timeLimit: number): TestSession => {
  clearTestSession();
  return initializeTestSession(eventName, timeLimit, false);
};


export const setupVisibilityHandling = (): (() => void) => {
  const handleVisibilityChange = () => {
    if (document.hidden) {

      pauseTestSession();
    } else {

      resumeFromPause();
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};


export const getLegacyTimeLeft = (): number | null => {
  const stored = localStorage.getItem('testTimeLeft');
  return stored ? parseInt(stored) : null;
};

export const getLegacyCodebustersTimeLeft = (): number | null => {
  const stored = localStorage.getItem('codebustersTimeLeft');
  return stored ? parseInt(stored) : null;
};


export const migrateFromLegacyStorage = (eventName: string, timeLimit: number): TestSession | null => {
  const session = getCurrentTestSession();
  if (session) return session;
  

  const legacyTimeLeft = getLegacyTimeLeft();
  const legacyCodebustersTimeLeft = getLegacyCodebustersTimeLeft();
  const isTimeSynchronized = localStorage.getItem('isTimeSynchronized') === 'true';
  const originalSyncTime = localStorage.getItem('originalSyncTime');
  const syncTimestamp = localStorage.getItem('syncTimestamp');
  
  if (legacyTimeLeft || legacyCodebustersTimeLeft) {

    const timeLeft = legacyTimeLeft || legacyCodebustersTimeLeft || (timeLimit * 60);
    const now = Date.now();
    
    let timeState: TimeState;
    
    if (isTimeSynchronized && originalSyncTime && syncTimestamp) {

      timeState = {
        timeLeft: parseInt(originalSyncTime),
        isTimeSynchronized: true,
        syncTimestamp: parseInt(syncTimestamp),
        originalTimeAtSync: parseInt(originalSyncTime),
        testStartTime: now,
        lastPauseTime: null,
        totalPausedTime: 0,
        isPaused: false
      };
    } else {

      timeState = {
        timeLeft,
        isTimeSynchronized: false,
        syncTimestamp: null,
        originalTimeAtSync: null,
        testStartTime: now,
        lastPauseTime: null,
        totalPausedTime: 0,
        isPaused: false
      };
    }
    
    const session: TestSession = {
      testId: generateTestId(),
      eventName,
      timeLimit,
      timeState,
      lastActivity: now,
      isSubmitted: localStorage.getItem('testSubmitted') === 'true' || 
                   localStorage.getItem('codebustersIsTestSubmitted') === 'true'
    };
    
    saveTestSession(session);
    

    localStorage.removeItem('testTimeLeft');
    localStorage.removeItem('codebustersTimeLeft');
    localStorage.removeItem('isTimeSynchronized');
    localStorage.removeItem('originalSyncTime');
    localStorage.removeItem('syncTimestamp');
    localStorage.removeItem('loadedFromShareCode');
    
    return session;
  }
  
  return null;
}; 