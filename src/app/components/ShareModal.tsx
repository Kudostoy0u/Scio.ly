'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaRegClipboard } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../api';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputCode: string;
  setInputCode: (code: string) => void;
  darkMode: boolean;
  timeLeft?: number | null;
  isTimeSynchronized?: boolean;
  syncTimestamp?: number | null;
  isCodebusters?: boolean;
  encryptedQuotes?: QuoteData[];
}

interface QuoteData {
  author: string;
  quote: string;
  encrypted: string;
  cipherType: 'Random Aristocrat' | 'K1 Aristocrat' | 'K2 Aristocrat' | 'K3 Aristocrat' | 'Random Patristocrat' | 'K1 Patristocrat' | 'K2 Patristocrat' | 'K3 Patristocrat' | 'Caesar' | 'Atbash' | 'Affine' | 'Hill' | 'Baconian' | 'Porta' | 'Nihilist' | 'Fractionated Morse' | 'Columnar Transposition' | 'Xenocrypt';
  key?: string;
  matrix?: number[][];
  portaKeyword?: string;
  nihilistKey?: string;
  columnarKey?: string;
  fractionatedKey?: string;
  xenocryptKey?: string;
  caesarShift?: number;
  affineA?: number;
  affineB?: number;
  solution?: { [key: string]: string };
  frequencyNotes?: { [key: string]: string };
  hillSolution?: {
    matrix: string[][];
    plaintext: { [key: number]: string };
  };
  nihilistSolution?: { [key: number]: string };
  fractionatedSolution?: { [key: number]: string };
  columnarSolution?: { [key: number]: string };
  xenocryptSolution?: { [key: number]: string };
  difficulty?: number;
}

interface QuestionWithId {
  id: string;
  [key: string]: unknown;
}

const ShareModal: React.FC<ShareModalProps> = React.memo(({ 
  isOpen, 
  onClose, 
  inputCode, 
  setInputCode, 
  darkMode, 
  timeLeft, 
  isTimeSynchronized, 
  syncTimestamp,
  isCodebusters = false,
  encryptedQuotes = []
}) => {
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingLoad, setLoadingLoad] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const hasGeneratedRef = useRef(false);
  const generationRequestId = useRef(0);
  const currentEncryptedQuotesRef = useRef(encryptedQuotes);
  const currentIsCodebustersRef = useRef(isCodebusters);
  const hasHandledRedirectRef = useRef(false);

  // Update refs when props change
  useEffect(() => {
    currentEncryptedQuotesRef.current = encryptedQuotes;
    currentIsCodebustersRef.current = isCodebusters;
  }, [encryptedQuotes, isCodebusters]);

  const generateShareCode = useCallback(async () => {
    // Prevent multiple simultaneous generations
    if (isGenerating || hasGeneratedRef.current) {
      return;
    }

    // Assign a unique request ID to track this generation request
    const currentRequestId = ++generationRequestId.current;
    
    setIsGenerating(true);
    setLoadingGenerate(true);
    
    try {
      // Get current values from refs instead of relying on closure
      const currentIsCodebusters = currentIsCodebustersRef.current;
      const currentEncryptedQuotes = currentEncryptedQuotesRef.current || [];
      
      // For Codebusters, get time information from the current test session
      let currentTimeLeft: number | null = null;
      let currentIsTimeSynchronized: boolean = false;
      let currentSyncTimestamp: number | null = null;
      
      if (currentIsCodebusters) {
        // Get time from the time management system for Codebusters
        const timeSession = JSON.parse(localStorage.getItem('currentTestSession') || '{}');
        if (timeSession && timeSession.timeState) {
          currentTimeLeft = timeSession.timeState.timeLeft;
          currentIsTimeSynchronized = timeSession.timeState.isTimeSynchronized;
          currentSyncTimestamp = timeSession.timeState.syncTimestamp;
        }
      } else {
        // For regular tests, use props if available (for backward compatibility)
        currentTimeLeft = timeLeft || null;
        currentIsTimeSynchronized = isTimeSynchronized || false;
        currentSyncTimestamp = syncTimestamp || null;
      }

      if (currentIsCodebusters) {
        // Codebusters share code generation
        if (currentEncryptedQuotes.length === 0) {
          toast.error('No quotes available to share');
          return;
        }

        const testParams = JSON.parse(localStorage.getItem('testParams') || '{}');
        const shareData = JSON.parse(localStorage.getItem('codebustersShareData') || '{}');

        const response = await fetch(api.codebustersShareGenerate, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shareData: shareData,
            testParams: testParams,
            timeRemainingSeconds: currentTimeLeft
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate share code');
        }

        const data = await response.json();
        
        // Only set the code if this is still the current request
        if (currentRequestId === generationRequestId.current) {
          setShareCode(data.data.shareCode);
          hasGeneratedRef.current = true;
        }
      } else {
        // Regular test share code generation
        const testQuestionsRaw = localStorage.getItem('testQuestions');
        if (!testQuestionsRaw) {
          toast.error('No test questions found to share.');
          return;
        }
        const testParamsRaw = localStorage.getItem('testParams');
        if (!testParamsRaw) {
          toast.error('No test parameters found.');
          return;
        }

        const questions = JSON.parse(testQuestionsRaw) as QuestionWithId[];
        const questionIds = questions.map(q => q.id).filter(id => id);
        
        if (questionIds.length === 0) {
          throw new Error('No valid question IDs found');
        }
        
        const testParams = JSON.parse(testParamsRaw);
        let currentTimeRemaining = currentTimeLeft;
        if (currentIsTimeSynchronized && currentSyncTimestamp) {
          const now = Date.now();
          const elapsedMs = now - currentSyncTimestamp;
          const elapsedSeconds = Math.floor(elapsedMs / 1000);
          const originalTimeAtSync = parseInt(localStorage.getItem('originalSyncTime') || '0');
          currentTimeRemaining = Math.max(0, originalTimeAtSync - elapsedSeconds);
        }

        const response = await fetch(api.shareGenerate, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            questionIds, 
            testParamsRaw: testParams,
            timeRemainingSeconds: currentTimeRemaining || null
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate share code');
        }

        const data = await response.json();
        
        // Only set the code if this is still the current request
        if (currentRequestId === generationRequestId.current) {
          setShareCode(data.data.shareCode);
          hasGeneratedRef.current = true;
        }
      }
    } catch (error) {
      console.error('Error generating share code:', error);
      toast.error((error as Error).message);
    } finally {
      setIsGenerating(false);
      setLoadingGenerate(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to prevent re-creation

  const copyCodeToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareCode || '');
      toast.success('Code copied to clipboard!');
    } catch {
      toast.error('Failed to copy code');
    }
  };

  const handleSharedTestRedirect = async (code: string) => {
    try {
      const { handleShareCodeRedirect } = await import('@/app/utils/shareCodeUtils');
      await handleShareCodeRedirect(code);
    } catch (error) {
      console.error('Error loading shared test:', error);
      toast.error((error as Error).message);
    }
  };

  const loadSharedTest = async () => {
    if (!inputCode) {
      toast.error('Please enter a share code');
      return;
    }
    setLoadingLoad(true);
    try {
      const { handleShareCodeRedirect } = await import('@/app/utils/shareCodeUtils');
      await handleShareCodeRedirect(inputCode);
    } catch (error) {
      console.error('Error loading shared test:', error);
      toast.error((error as Error).message);
    } finally {
      // The page will redirect, so the loading state doesn't need to be reset
    }
  };

  // Handle share code from localStorage (for redirects)
  useEffect(() => {
    // Prevent infinite loops by checking if we've already handled this redirect
    if (hasHandledRedirectRef.current) {
      return;
    }
    
    const shareCode = localStorage.getItem("shareCode");
    if (shareCode) {
      // Mark that we've handled this redirect
      hasHandledRedirectRef.current = true;
      // Handle shared test redirect directly without opening the modal
      handleSharedTestRedirect(shareCode);
      localStorage.removeItem("shareCode");
    }
  }, []);

  // Generate share code only when explicitly requested
  // Removed automatic generation on modal open

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasGeneratedRef.current = false;
      setShareCode(null);
      setIsGenerating(false);
      setLoadingGenerate(false);
      // Increment the request ID to invalidate any pending requests
      generationRequestId.current++;
      // Reset the redirect handler for future use
      hasHandledRedirectRef.current = false;
    }
  }, [isOpen]);

  return (
    <div
      style={{ display: isOpen ? 'flex' : 'none' }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className={`relative rounded-lg p-6 w-96 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-xl font-bold"
          style={{ color: darkMode ? 'white' : '#4A5568' }}
        >
          &times;
        </button>
        <h3 className="text-lg font-semibold mb-4">Share Test</h3>
        
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Share Code</h4>
          {isGenerating || loadingGenerate ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
              <p>Generating...</p>
            </div>
          ) : shareCode ? (
            <div className={`flex items-center justify-between p-2 rounded-md ${
              darkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <span className={`break-all ${darkMode ? 'text-white' : 'text-black'}`}>
                {shareCode}
              </span>
              <button onClick={copyCodeToClipboard} className="ml-2">
                <FaRegClipboard className={darkMode ? 'text-gray-300' : 'text-black'} />
              </button>
            </div>
          ) : (
            <button
              onClick={generateShareCode}
              disabled={isGenerating || loadingGenerate}
              className={`w-full px-4 py-2 rounded-md font-medium transition-colors border-2 border-blue-500 text-blue-500 hover:bg-blue-50 hover:text-blue-600 disabled:border-gray-400 disabled:text-gray-400 ${
                darkMode ? 'hover:bg-blue-900/20' : ''
              }`}
            >
              Generate Share Code
            </button>
          )}
        </div>
        
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Load Shared Test</h4>
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Enter share code"
            className={`w-full p-2 border rounded-md mb-2 ${
              darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-black border-gray-300'
            }`}
          />
          <button
            onClick={loadSharedTest}
            disabled={loadingLoad}
            className="w-full px-4 py-2 rounded-md border-2 border-green-500 text-green-500 hover:bg-green-50 hover:text-green-600 disabled:border-gray-400 disabled:text-gray-400 transition-colors"
          >
            {loadingLoad ? 'Loading...' : 'Load Shared Test'}
          </button>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  // We deliberately ignore onClose and setInputCode function props since they may change on every render
  // but don't affect the share code generation logic
  

  
  // Ignore time-related props that change frequently but don't affect share code generation
  const propsEqual = (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.darkMode === nextProps.darkMode &&
    prevProps.inputCode === nextProps.inputCode &&
    prevProps.isCodebusters === nextProps.isCodebusters &&
    JSON.stringify(prevProps.encryptedQuotes) === JSON.stringify(nextProps.encryptedQuotes)
    // Removed timeLeft, isTimeSynchronized, syncTimestamp from comparison
  );
  
  if (!propsEqual) {
    // Props changed, re-rendering
  }
  
  return propsEqual;
});

ShareModal.displayName = 'ShareModal';

export default ShareModal;