'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaRegClipboard } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../api';
import type { QuoteData as CodebustersQuoteData } from '@/app/codebusters/types';

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
  encryptedQuotes?: CodebustersQuoteData[];
}

// Note: CodebustersQuoteData type is imported and used for encryptedQuotes

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
  const [isOffline, setIsOffline] = useState(false);
  const hasGeneratedRef = useRef(false);
  const generationRequestId = useRef(0);
  const currentEncryptedQuotesRef = useRef<CodebustersQuoteData[] | undefined>(encryptedQuotes);
  const currentIsCodebustersRef = useRef(isCodebusters);
  const hasHandledRedirectRef = useRef(false);

  // Detect offline status
  useEffect(() => {
    const updateOnline = () => setIsOffline(!navigator.onLine);
    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

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
      // We no longer use sync metadata for generation; we persist the displayed remaining time only
      // capture sync fields but do not use; present for potential extension
      void isTimeSynchronized;
      void syncTimestamp;
      
      if (currentIsCodebusters) {
        // Get time from the time management system for Codebusters
        const timeSession = JSON.parse(localStorage.getItem('currentTestSession') || '{}');
        if (timeSession && timeSession.timeState) {
          currentTimeLeft = timeSession.timeState.timeLeft;
          // no-op: captured via void above
        }
      } else {
        // For regular tests, prefer time from session; fallback to prop
        try {
          const timeSession = JSON.parse(localStorage.getItem('currentTestSession') || '{}');
          if (timeSession && timeSession.timeState && typeof timeSession.timeState.timeLeft === 'number') {
            currentTimeLeft = timeSession.timeState.timeLeft;
          } else {
            currentTimeLeft = typeof timeLeft === 'number' ? timeLeft : null;
          }
        } catch {
          currentTimeLeft = typeof timeLeft === 'number' ? timeLeft : null;
        }
        // no-op: captured via void above
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
          
          // Automatically copy the generated share code to clipboard
          try {
            await navigator.clipboard.writeText(data.data.shareCode);
            toast.success('Share code copied to clipboard!');
          } catch (error) {
            console.error('Failed to copy share code to clipboard:', error);
            // Don't show error toast as the main functionality still works
          }
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
        // For our time model, just persist the current displayed timeLeft as remaining
        const currentTimeRemaining = (typeof currentTimeLeft === 'number') ? currentTimeLeft : null;

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
          
          // Automatically copy the generated share code to clipboard
          try {
            await navigator.clipboard.writeText(data.data.shareCode);
            toast.success('Share code copied to clipboard!');
          } catch (error) {
            console.error('Failed to copy share code to clipboard:', error);
            // Don't show error toast as the main functionality still works
          }
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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
      onClick={onClose}
    >
      <div
        className={`relative rounded-lg p-6 w-96 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 text-gray-500 hover:${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
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
              disabled={isGenerating || loadingGenerate || isOffline}
              className={`w-full px-4 py-2 rounded-md font-medium transition-colors border-2 border-blue-500 text-blue-500 hover:bg-blue-50 hover:text-blue-600 disabled:border-gray-400 disabled:text-gray-400 ${
                darkMode ? 'hover:bg-blue-900/20' : ''
              }`}
            >
              {isOffline ? 'Share Not Available Offline' : 'Generate Share Code'}
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
            disabled={loadingLoad || isOffline}
            className={`w-full px-4 py-2 rounded-md font-medium transition-colors border-2 border-green-500 text-green-500 hover:bg-green-50 hover:text-green-600 disabled:border-gray-400 disabled:text-gray-400 ${
              darkMode ? 'hover:bg-green-900/20' : ''
            }`}
          >
            {loadingLoad ? 'Loading...' : isOffline ? 'Load Not Available Offline' : 'Load Shared Test'}
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