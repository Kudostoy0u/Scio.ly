import { toast } from 'react-toastify';
import api from '../api';
import {
  initializeTestSession,
  clearTestSession
} from './timeManagement';

// Import the QuoteData type from the codebusters page
export interface QuoteData {
  author: string;
  quote: string;
  encrypted: string;
  cipherType: 'Random Aristocrat' | 'K1 Aristocrat' | 'K2 Aristocrat' | 'K3 Aristocrat' | 'Random Patristocrat' | 'K1 Patristocrat' | 'K2 Patristocrat' | 'K3 Patristocrat' | 'Caesar' | 'Atbash' | 'Affine' | 'Hill 2x2' | 'Hill 3x3' | 'Baconian' | 'Porta' | 'Nihilist' | 'Fractionated Morse' | 'Columnar Transposition' | 'Xenocrypt';
  key?: string;        // For aristocrat/patristocrat/porta/nihilist/columnar/xenocrypt
  matrix?: number[][]; // For hill
  portaKeyword?: string; // For porta
  nihilistKey?: string; // For nihilist
  columnarKey?: string; // For columnar transposition
  fractionatedKey?: string; // For fractionated morse
  fractionationTable?: { [key: string]: string }; // For fractionated morse table
  xenocryptKey?: string; // For xenocrypt
  caesarShift?: number; // For caesar cipher
  affineA?: number; // For affine cipher (a value)
  affineB?: number; // For affine cipher (b value)
  solution?: { [key: string]: string };
  frequencyNotes?: { [key: string]: string };
  hillSolution?: {
    matrix: string[][];
    plaintext: { [key: number]: string };
  };
  nihilistSolution?: { [key: number]: string }; // For nihilist
  fractionatedSolution?: { [key: number]: string }; // For fractionated morse
  columnarSolution?: { [key: number]: string }; // For columnar transposition
  xenocryptSolution?: { [key: number]: string }; // For xenocrypt
  difficulty?: number; // New field for difficulty
}

export interface ShareCodeResult {
  success: boolean;
  eventName?: string;
  testParams?: Record<string, unknown>;
  questions?: Record<string, unknown>[];
  encryptedQuotes?: QuoteData[];
  adjustedTimeRemaining?: number;
  error?: string;
}

export const loadSharedTestCode = async (code: string): Promise<ShareCodeResult> => {
  try {
    // First, try the codebusters share endpoint
    let response = await fetch(`${api.codebustersShare}?code=${code}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('🔍 Codebusters API Response:', data);
      
      if (data.success && data.data && data.data.quotes && data.data.testParams) {
        console.log('🔍 Successfully got encrypted quotes from codebusters endpoint:', data.data.quotes.length, 'quotes');
        // Store test parameters
        localStorage.setItem('testParams', JSON.stringify(data.data.testParams));
        
        // Time synchronization will be handled by the new time management system
        console.log('🕐 Codebusters time sync will be handled by new time management system');
        
        return {
          success: true,
          eventName: 'Codebusters',
          testParams: data.data.testParams,
          encryptedQuotes: data.data.quotes,
          adjustedTimeRemaining: data.data.timeRemainingSeconds
        };
      }
    }
    
    // If codebusters endpoint fails, try the general share endpoint
    response = await fetch(`${api.share}?code=${code}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('🔍 General API Response:', data);
      
      if (data.success && data.data && data.data.testParamsRaw) {
        const testParams = data.data.testParamsRaw;
        
        console.log('🔍 Processing regular test with eventName:', testParams.eventName);
        
        // Store test parameters
        localStorage.setItem('testParams', JSON.stringify(testParams));
        
        // Time synchronization will be handled by the new time management system
        console.log('🕐 Regular test time sync will be handled by new time management system');
        
        // Fetch the actual questions using the questionIds
        const questionIds = data.data.questionIds || [];
        if (questionIds.length > 0) {
          try {
            console.log('🔍 Fetching questions by IDs:', questionIds);
            const questionsResponse = await fetch(api.questionsBatch, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ ids: questionIds }),
            });
            if (questionsResponse.ok) {
              const questionsData = await questionsResponse.json();
              if (questionsData.success && questionsData.data) {
                console.log('🔍 Successfully fetched questions:', questionsData.data.length);
                return {
                  success: true,
                  eventName: testParams.eventName,
                  testParams: testParams,
                  questions: questionsData.data,
                  adjustedTimeRemaining: data.data.timeRemainingSeconds
                };
              }
            }
          } catch (fetchError) {
            console.error('Error fetching questions by IDs:', fetchError);
          }
        }
        
        return {
          success: true,
          eventName: testParams.eventName,
          testParams: testParams,
          questions: [],
          adjustedTimeRemaining: data.data.timeRemainingSeconds
        };
      }
    }

    return {
      success: false,
      error: 'Invalid or expired test code',
    };
  } catch (error) {
    console.error('Error loading shared test code:', error);
    return {
      success: false,
      error: 'Failed to load shared test code',
    };
  }
};

export const handleShareCodeRedirect = async (code: string): Promise<boolean> => {
  // 1. Clear all relevant local storage to ensure a clean slate
  clearTestSession();
  localStorage.removeItem('testQuestions');
  localStorage.removeItem('testUserAnswers');
  localStorage.removeItem('contestedQuestions');
  localStorage.removeItem('testParams');
  localStorage.removeItem('shareCode');
  localStorage.removeItem('codebustersQuotes');
  localStorage.removeItem('testSubmitted');
  localStorage.removeItem('loaded');

  // 2. Fetch the shared test data
  const result = await loadSharedTestCode(code);
  
  if (!result.success || !result.testParams) {
    toast.error(result.error || 'Failed to load shared test. The code may be invalid or expired.');
    return false;
  }

  // 3. Copy the share code to clipboard and show success notification
  try {
    await navigator.clipboard.writeText(code);
    toast.success('Share code copied to clipboard!');
  } catch (error) {
    console.error('Failed to copy share code to clipboard:', error);
    // Don't show error toast as the main functionality still works
  }

  // 4. Set up local storage based on the test type
  localStorage.setItem('testParams', JSON.stringify(result.testParams));

  // 5. Initialize time management session
  const eventName = result.eventName || 'Unknown Event';
  const timeLimit = parseInt(result.testParams.timeLimit as string || '30');
  const isSharedTest = true;
  const sharedTimeRemaining = result.adjustedTimeRemaining;
  
  initializeTestSession(eventName, timeLimit, isSharedTest, sharedTimeRemaining);
  
  // 6. Redirect to the correct page
  if (result.eventName === 'Codebusters') {
    if (result.encryptedQuotes) {
      localStorage.setItem('codebustersQuotes', JSON.stringify(result.encryptedQuotes));
    }
    // No longer need to set shareCode, the destination page will load from the pre-loaded data
    window.location.href = '/codebusters';
  } else {
    // For regular tests, store the questions and reload the test page
    if (result.questions && Array.isArray(result.questions)) {
      const questionsWithIndex = result.questions.map((q: Record<string, unknown>, idx: number) => ({ ...q, originalIndex: idx }));
      localStorage.setItem('testQuestions', JSON.stringify(questionsWithIndex));
    }
    localStorage.setItem('loaded', '1'); // Flag for the test page to show a success message
    window.location.href = '/test';
  }
  
  return true;
}; 