'use client';
import React from 'react';
import { FaShareAlt } from "react-icons/fa";
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { updateMetrics } from '@/app/utils/metrics';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/app/contexts/ThemeContext';
import api from '../api';
import MarkdownExplanation from '@/app/utils/MarkdownExplanation';
import PDFViewer from '@/app/components/PDFViewer';
import QuestionActions from '@/app/components/QuestionActions';
import EditQuestionModal from '@/app/components/EditQuestionModal';
import ShareModal from '@/app/components/ShareModal';
import { loadBookmarksFromSupabase } from '@/app/utils/bookmarks';
import { Question } from '@/app/utils/geminiService';
import { User } from '@supabase/supabase-js';
import { getUserProfile } from '@/app/utils/userProfile';
import {
  RouterParams,
  GradingResults,
  Explanations,
  LoadingExplanation,
  isMultiSelectQuestion,
  gradeFreeResponses,
  buildApiParams,
  shuffleArray,
  getExplanation,
  formatTime
} from '@/app/utils/questionUtils';
import {
  getCurrentTestSession,
  initializeTestSession,
  resumeTestSession,
  updateTimeLeft,
  markTestSubmitted,
  resetTestSession,
  migrateFromLegacyStorage,
  setupVisibilityHandling
} from '@/app/utils/timeManagement';



// Question type now imported from geminiService



// Share code functionality now uses question IDs instead of indices







export default function TestPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const fetchStartedRef = useRef(false);
  const [data, setData] = useState<Question[]>([]);
  const [routerData, setRouterData] = useState<RouterParams>({});

  const [userAnswers, setUserAnswers] = useState<Record<number, (string | null)[] | null>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isTimeSynchronized, setIsTimeSynchronized] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [syncTimestamp, setSyncTimestamp] = useState<number | null>(null);
  const { darkMode } = useTheme();

  const [explanations, setExplanations] = useState<Explanations>({});
  const [loadingExplanation, setLoadingExplanation] = useState<LoadingExplanation>({});
  const [lastCallTime, setLastCallTime] = useState<number>(0);
  const RATE_LIMIT_DELAY = 2000;
  // gradingResults now holds numeric scores (0, 0.5, or 1)
  const [gradingResults, setGradingResults] = useState<GradingResults>({});
  const [isMounted, setIsMounted] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [inputCode, setInputCode] = useState<string>('');
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Record<string, boolean>>({});

  // State to track submitted reports and edits per question index
  const [submittedReports, setSubmittedReports] = useState<Record<number, boolean>>({});
  const [submittedEdits, setSubmittedEdits] = useState<Record<number, boolean>>({});

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const closeShareModal = useCallback(() => {
    setShareModalOpen(false);
  }, []);

  const handleEditOpen = (question: Question) => {
    setEditingQuestion(question);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (editedQuestion: Question, reason: string, originalQuestion: Question): Promise<{ success: boolean; message: string; reason: string; }> => {
    try {
      const response = await fetch(api.reportEdit, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalQuestion: originalQuestion,
          editedQuestion: editedQuestion,
          reason: reason,
          event: routerData.eventName,
          bypass: false
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        if (editingQuestion) {
          const questionIndex = data.findIndex(q => q.question === editingQuestion.question);
          if (questionIndex !== -1) {
            // Update the question data in the state to reflect the changes immediately
            setData(prevData => {
              const newData = [...prevData];
              newData[questionIndex] = editedQuestion;
              return newData;
            });
            
            // Update localStorage with the new question data
            localStorage.setItem('testQuestions', JSON.stringify(data.map((q, idx) => 
              idx === questionIndex ? editedQuestion : q
            )));
            
            handleEditSubmitted(questionIndex);
          }
        }
        return { success: true, message: result.reason || 'Edit submitted successfully!', reason: result.reason || 'Edit submitted successfully!' };
      } else {
        return { success: false, message: result.reason || 'Failed to submit edit', reason: result.reason || 'Failed to submit edit' };
      }
    } catch (error) {
      console.error('Error submitting edit:', error);
      return { success: false, message: 'An unexpected error occurred. Please try again.', reason: 'An unexpected error occurred. Please try again.' };
    }
  };

  useEffect(() => {
    setIsMounted(true);
    if (localStorage.getItem("loaded")) {
      localStorage.removeItem('testUserAnswers')

      toast.success('Shared test loaded successfully!');
      localStorage.removeItem("loaded");
      console.log('🔍 Loaded flag detected and cleared');
    }
    // Load user answers from localStorage if they exist
    const storedUserAnswers = localStorage.getItem('testUserAnswers');
    if (storedUserAnswers) {
      setUserAnswers(JSON.parse(storedUserAnswers));
    }
    
    // Cleanup function that runs when component unmounts (user navigates away)
    return () => {
      // Only clear user answers if the test wasn't submitted
      // This preserves the behavior where submitted tests generate new ones on reload
      if (!localStorage.getItem('testSubmitted')) {
        localStorage.removeItem('testUserAnswers');
      }
    };
  }, []);

  useEffect(() => {
    // Prevent multiple executions - only run once on mount
    if (fetchStartedRef.current) {
      console.log('🔍 Skipping data fetch - already started fetching');
      return;
    }
    
    if (data.length > 0) {
      console.log('🔍 Skipping data fetch - already have data');
      return;
    }
    
    if (isLoading === false) {
      console.log('🔍 Skipping data fetch - loading already complete');
      return;
    }
    
    console.log('🔍 Starting data fetch - data.length:', data.length, 'isLoading:', isLoading);
    fetchStartedRef.current = true;

    const storedParams = localStorage.getItem('testParams');
    if (!storedParams) {
      router.push('/');
      return;
    }
  
    const routerParams = JSON.parse(storedParams);
    setRouterData(routerParams);
  
    // Initialize time management system
    const eventName = routerParams.eventName || 'Unknown Event';
    const timeLimit = parseInt(routerParams.timeLimit || '30');
    
    // Try to migrate from legacy storage first
    let session = migrateFromLegacyStorage(eventName, timeLimit);
    
    if (!session) {
      // Check if we have an existing session
      session = getCurrentTestSession();
      
      if (!session) {
        // New test - initialize session
        session = initializeTestSession(eventName, timeLimit, false);
      } else {
        // Resume existing session
        session = resumeTestSession();
      }
    }
    
    if (session) {
      setTimeLeft(session.timeState.timeLeft);
      setIsTimeSynchronized(session.timeState.isTimeSynchronized);
      setSyncTimestamp(session.timeState.syncTimestamp);
      setIsSubmitted(session.isSubmitted);
      
      console.log('🕐 Time management initialized:', {
        timeLeft: session.timeState.timeLeft,
        isSynchronized: session.timeState.isTimeSynchronized,
        isSubmitted: session.isSubmitted
      });
    }

    // Check if we have stored questions
    const storedQuestions = localStorage.getItem('testQuestions');
    const isFromBookmarks = localStorage.getItem('testFromBookmarks') === 'true';
    
    if (storedQuestions) {
      const parsedQuestions = JSON.parse(storedQuestions);
      setData(parsedQuestions);
      
      // 🔍 DEBUG: Log stored questions data
      console.log('🔍 LOADED STORED QUESTIONS:');
      console.log('🔍 FROM BOOKMARKS:', isFromBookmarks);
      parsedQuestions.forEach((question, index) => {
        console.log(`📝 Stored Question ${index + 1}:`, JSON.stringify(question, null, 2));
      });
      
      setIsLoading(false);
      return;
    }

    // If no stored questions and this is from bookmarks, load from Supabase
    const loadBookmarkedQuestionsFromSupabase = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (isFromBookmarks && user) {
        try {
          const bookmarks = await loadBookmarksFromSupabase(user.id);
          const eventBookmarks = bookmarks.filter(b => b.eventName === eventName);
          
          if (eventBookmarks.length > 0) {
            const questions = eventBookmarks.map(b => b.question);
            setData(questions);
            localStorage.setItem('testQuestions', JSON.stringify(questions));
            console.log(`🔍 LOADED ${questions.length} BOOKMARKED QUESTIONS FROM SUPABASE`);
          } else {
            setFetchError('No bookmarked questions found for this event.');
          }
        } catch (error) {
          console.error('Error loading bookmarked questions:', error);
          setFetchError('Failed to load bookmarked questions.');
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    if (isFromBookmarks) {
      loadBookmarkedQuestionsFromSupabase();
      return;
    }
  
    const fetchData = async () => {
      console.log('🔍 Starting fresh API fetch for questions...');
      try {
        const { questionCount } = routerParams;
        
        // Request more questions than needed so we can filter and shuffle
        const requestCount = Math.max(parseInt(questionCount || '10') * 3, 50);
        const params = buildApiParams(routerParams, requestCount);
        
        const apiUrl = `${api.questions}?${params}`;
        console.log('Fetching from API:', apiUrl);
        console.log('API params string:', params);
        console.log('Router params:', routerParams);
        
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch data from API');
        const apiResponse = await response.json();
        
        if (!apiResponse.success) {
          throw new Error(apiResponse.error || 'API request failed');
        }
        
        let questions: Question[] = apiResponse.data || [];
        console.log(`API returned ${questions.length} questions`);
        
        // Filter out questions with completely missing or invalid answer structure
        questions = questions.filter(q => {
          // Only filter out questions that have no answers array at all or null answers
          const hasAnswerStructure = q.answers && Array.isArray(q.answers) && q.answers.length > 0;
          
          if (!hasAnswerStructure) {
            console.log(`🚫 Filtered out question with no answer structure:`, q.id);
          }
          return hasAnswerStructure;
        });
        console.log(`After filtering questions with no answer structure: ${questions.length} questions`);
        
        // Removed question filtering - all questions are now included
        
        console.log(`No filtering applied: ${questions.length} questions`);
        
        // Shuffle and select the requested number of questions
        const shuffledQuestions = shuffleArray(questions);
        const selectedQuestions = shuffledQuestions.slice(
          0,
          parseInt(questionCount || '10')
        );
        
        // Add original indices for compatibility
        const questionsWithIndex = selectedQuestions.map((q, idx) => ({
          ...q,
          originalIndex: idx
        }));
        
        // Store questions for persistence
        localStorage.setItem('testQuestions', JSON.stringify(questionsWithIndex));
        setData(questionsWithIndex);
        
        console.log(`Selected ${questionsWithIndex.length} questions for test`);
        
        // 🔍 DEBUG: Log complete JSON for each question
        console.log('🔍 COMPLETE QUESTION DATA:');
        questionsWithIndex.forEach((question, index) => {
          console.log(`📝 Question ${index + 1}:`, JSON.stringify(question, null, 2));
        });
      } catch (error) {
        console.error(error);
        setFetchError('Failed to load questions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount to prevent re-fetching

  const handleAnswerChange = (
    questionIndex: number,
    answer: string | null,
    multiselect = false
  ) => {
    setUserAnswers((prev) => {
      const currentAnswers = prev[questionIndex] || [];
      let newAnswers;
      
      if (multiselect) {
        newAnswers = currentAnswers.includes(answer)
          ? currentAnswers.filter((ans) => ans !== answer)
          : [...currentAnswers, answer];
      } else {
        newAnswers = [answer];
      }
      
      const updatedAnswers = { ...prev, [questionIndex]: newAnswers };
      
      // Save user answers to localStorage
      localStorage.setItem('testUserAnswers', JSON.stringify(updatedAnswers));
      
      return updatedAnswers;
    });
  };

  const handleSubmit = useCallback(async () => {
    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // 🔍 DEBUG: Log test submission details
    console.log('🔴 SUBMITTING TEST:');
    console.log('  Total questions:', data.length);
    console.log('  User answers:', userAnswers);
    console.log('  Questions data:', data.map((q, i) => ({
      index: i,
      question: q.question.substring(0, 50) + '...',
      answers: q.answers,
      options: q.options
    })));
    
    // Extract questions that need to be graded
    interface FRQToGrade {
      index: number;
      question: string;
      correctAnswers: (string | number)[];
      studentAnswer: string;
    }
    
    const frqsToGrade: FRQToGrade[] = [];
    
    // Calculate scores for multiple-choice questions
    let mcqScore = 0;
    let mcqTotal = 0;
    
    for (let i = 0; i < data.length; i++) {
      const question = data[i];
      const answer = userAnswers[i] || [];
      
      // Skip if this question has already been graded via contest
      if (gradingResults[i] === 1) {
        mcqScore += 1;
        mcqTotal += 1;
        continue;
      }
      
      // Skip questions with no answer
      if (!answer.length || !answer[0]) continue;
      
      // For MCQ
      if (question.options && question.options.length) {
        mcqTotal++;
        
        // 🔍 DEBUG: Log MCQ grading
        console.log(`🎯 Grading MCQ ${i + 1}:`);
        console.log('  Question:', question.question.substring(0, 50) + '...');
        console.log('  User answer:', answer);
        console.log('  Question answers:', question.answers);
        console.log('  Question options:', question.options);
        
        // Simple matching for MCQ
        const correct = Array.isArray(question.answers)
          ? question.answers
          : [question.answers];
        
        // Convert option text to 0-based index for comparison with correct answers
        const userNumericAnswers = answer
          .map(ans => {
            const idx = question.options?.indexOf(ans ?? "");
            return idx !== undefined && idx >= 0 ? idx : -1;
          })
          .filter(idx => idx >= 0);
        
        // Debug logging
        console.log('  User numeric answers:', userNumericAnswers);
        
        // Handle both string and number answers from backend
        const correctAnswers = correct.map(ans => {
          if (typeof ans === 'string') {
            // Skip empty strings - treat as no correct answer available
            if (ans === "") return undefined;
            // If answer is a string, it's the option text
            return ans;
          } else if (typeof ans === 'number') {
            // If answer is a number, convert to option text
            return question.options && ans >= 0 && ans < question.options.length 
              ? question.options[ans] 
              : undefined;
          }
          return undefined;
        }).filter((text): text is string => text !== undefined);
        
        // If no valid correct answers found, mark as ungraded (skip scoring)
        if (correctAnswers.length === 0) {
          console.log('  ⚠️ No valid correct answers found - skipping scoring');
          continue;
        }
        
        // If fully correct (exact match)
        if (
          // If user chose all correct options for multi-select...
          (isMultiSelectQuestion(question.question, question.answers) &&
            correctAnswers.every(correctAns => 
              answer.some(ans => ans === correctAns)
            ) &&
            answer.length === correctAnswers.length)
          ||
          // ...or single correct answer for single-select
          (!isMultiSelectQuestion(question.question, question.answers) &&
            answer.some(ans => ans !== null && correctAnswers.includes(ans)))
        ) {
          mcqScore++;
          // Store the grade for this question
          setGradingResults(prev => ({ ...prev, [i]: 1 }));
          console.log('  ✅ CORRECT!');
        } else {
          // Store that this question was incorrect
          setGradingResults(prev => ({ ...prev, [i]: 0 }));
          console.log('  ❌ INCORRECT!');
        }
      } else {
        // For FRQ
        if (answer[0] !== null) {
          // Check if the question has valid correct answers for FRQ
          const hasValidFRQAnswers = question.answers && 
            question.answers.length > 0 && 
            question.answers[0] !== "" && 
            question.answers[0] !== null;
          
          if (hasValidFRQAnswers) {
            frqsToGrade.push({
              index: i,
              question: question.question,
              correctAnswers: question.answers,
              studentAnswer: answer[0] as string
            });
          } else {
            console.log(`⚠️ FRQ ${i + 1} has no valid correct answer - skipping AI grading`);
            // Mark as ungraded since we can't grade it
            setGradingResults(prev => ({ ...prev, [i]: 0.5 })); // Give partial credit for attempt
          }
        }
      }
    }
    
    // Grade FRQs using Gemini if there are any
    if (frqsToGrade.length > 0) {
      try {
        const scores = await gradeFreeResponses(
          frqsToGrade.map(item => ({
            question: item.question,
            correctAnswers: item.correctAnswers,
            studentAnswer: item.studentAnswer
          }))
        );
        
        // Process the FRQ scores
        scores.forEach((score, idx) => {
          const questionIndex = frqsToGrade[idx].index;
          setGradingResults(prev => ({ ...prev, [questionIndex]: score }));
          
          // Add to the total score
          if (score >= 0.5) {
            mcqScore += score;
            mcqTotal += 1;
          }
        });
      } catch (error) {
        console.error("Error grading FRQs:", error);
        // If there's an error, mark all FRQs as incorrect
        frqsToGrade.forEach(item => {
          setGradingResults(prev => ({ ...prev, [item.index]: 0 }));
        });
      }
    }
    
    // Mark test as submitted using new time management system
    markTestSubmitted();
    
    // Clear user answers from localStorage to allow a new test to be generated if the page is refreshed
    localStorage.removeItem('testUserAnswers');
    
    // Clear bookmarks flag if this was a bookmarked test
    localStorage.removeItem('testFromBookmarks');
    
    // Don't remove contestedQuestions from localStorage after submission
    // This ensures that if user views the same test again, they cannot re-contest questions
    
    // Update user metrics
            const { data: { user } } = await supabase.auth.getUser();
        if (user && routerData.eventName) {
          updateMetrics(user.id, {
        questionsAttempted: mcqTotal,
        correctAnswers: Math.round(mcqScore),
        eventName: routerData.eventName
      });
    }
  }, [data, userAnswers, gradingResults, routerData, setGradingResults]);

  // Comprehensive timer logic with new time management system
  useEffect(() => {
    if (timeLeft === null || isSubmitted) return;

    if (timeLeft === 0) {
      handleSubmit();
      return;
    }
    
    if (timeLeft === 30) {
      toast.warning("Warning: Thirty seconds left");
    }
    if (timeLeft === 60) {
      toast.warning("Warning: One minute left");
    }

    const timer = setInterval(() => {
      const session = getCurrentTestSession();
      if (!session) return;
      
      // Update time based on session state
      if (session.timeState.isTimeSynchronized && session.timeState.syncTimestamp && session.timeState.originalTimeAtSync) {
        // Synchronized test - calculate based on original sync point
        const now = Date.now();
        const elapsedMs = now - session.timeState.syncTimestamp;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        const newTimeLeft = Math.max(0, session.timeState.originalTimeAtSync - elapsedSeconds);
        setTimeLeft(newTimeLeft);
        updateTimeLeft(newTimeLeft);
      } else {
        // Non-synchronized test - calculate based on test start time and pauses
        const now = Date.now();
        const totalElapsedMs = now - (session.timeState.testStartTime || now) - session.timeState.totalPausedTime;
        const totalElapsedSeconds = Math.floor(totalElapsedMs / 1000);
        const originalTimeLimit = session.timeLimit * 60;
        const newTimeLeft = Math.max(0, originalTimeLimit - totalElapsedSeconds);
        setTimeLeft(newTimeLeft);
        updateTimeLeft(newTimeLeft);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted, handleSubmit]);

  const handleBackToMain = () => {
    router.push('/practice');
  };
  // const storedParams = localStorage.getItem('testParams');
  // if (!storedParams) {
  //   throw new Error('No test parameters found');
  // }
  // const routerParams = JSON.parse(storedParams);
  // const { eventName, timeLimit } = routerParams;
  // localStorage.setItem("testTimeLeft",timeLimit)
  // Reset the test while preserving test parameters
  const handleResetTest = () => {
    setIsSubmitted(false);
    setUserAnswers({});
    setGradingResults({});
    setExplanations({});
    
    // Clear all test data
    localStorage.removeItem('testQuestions');
    localStorage.removeItem('testUserAnswers');
    localStorage.removeItem('contestedQuestions');
    localStorage.removeItem('testFromBookmarks');
    
    // Reset time management session
    const timeLimit = JSON.parse(localStorage.getItem("testParams") ?? "{}")?.timeLimit || "30";
    const eventName = JSON.parse(localStorage.getItem("testParams") ?? "{}")?.eventName || "Unknown Event";
    const newSession = resetTestSession(eventName, parseInt(timeLimit));
    
    // Update state with new session
    setTimeLeft(newSession.timeState.timeLeft);
    setIsTimeSynchronized(newSession.timeState.isTimeSynchronized);
    setSyncTimestamp(newSession.timeState.syncTimestamp);
    
    window.location.reload()
  };





  const handleGetExplanation = (index: number, question: Question, userAnswer: (string | null)[]) => {
    getExplanation(
      index,
      question,
      userAnswer,
      routerData,
      explanations,
      setExplanations,
      setLoadingExplanation,
      lastCallTime,
      setLastCallTime,
      setData,
      gradingResults,
      setGradingResults,
      userAnswers,
      RATE_LIMIT_DELAY
    );
  };

  // Helper functions for bookmark management
  const isQuestionBookmarked = (question: Question): boolean => {
    return bookmarkedQuestions[question.question] || false;
  };

  const handleBookmarkChange = (questionText: string, isBookmarked: boolean) => {
    setBookmarkedQuestions(prev => ({
      ...prev,
      [questionText]: isBookmarked
    }));
  };

  const handleReportSubmitted = (index: number) => {
    setSubmittedReports(prev => ({ ...prev, [index]: true }));
  };

  const handleEditSubmitted = (index: number) => {
    setSubmittedEdits(prev => ({ ...prev, [index]: true }));
  };

  const handleQuestionRemoved = (questionIndex: number) => {
    // Remove the question from the data array
    setData(prevData => {
      const newData = prevData.filter((_, index) => index !== questionIndex);
      
      // Update localStorage with the new data
      localStorage.setItem('testQuestions', JSON.stringify(newData));
      
      return newData;
    });

    // Remove user answers for this question and shift remaining answers
    setUserAnswers(prevAnswers => {
      const newAnswers: Record<number, (string | null)[] | null> = {};
      
      Object.keys(prevAnswers).forEach(key => {
        const index = parseInt(key);
        if (index < questionIndex) {
          // Keep answers for questions before the removed one
          newAnswers[index] = prevAnswers[index];
        } else if (index > questionIndex) {
          // Shift answers for questions after the removed one
          newAnswers[index - 1] = prevAnswers[index];
        }
        // Skip the removed question's answers
      });
      
      // Update localStorage
      localStorage.setItem('testUserAnswers', JSON.stringify(newAnswers));
      
      return newAnswers;
    });

    // Remove grading results for this question and shift remaining results
    setGradingResults(prevResults => {
      const newResults: GradingResults = {};
      
      Object.keys(prevResults).forEach(key => {
        const index = parseInt(key);
        if (index < questionIndex) {
          // Keep results for questions before the removed one
          newResults[index] = prevResults[index];
        } else if (index > questionIndex) {
          // Shift results for questions after the removed one
          newResults[index - 1] = prevResults[index];
        }
        // Skip the removed question's results
      });
      
      return newResults;
    });

    // Remove explanations for this question and shift remaining explanations
    setExplanations(prevExplanations => {
      const newExplanations: Explanations = {};
      
      Object.keys(prevExplanations).forEach(key => {
        const index = parseInt(key);
        if (index < questionIndex) {
          // Keep explanations for questions before the removed one
          newExplanations[index] = prevExplanations[index];
        } else if (index > questionIndex) {
          // Shift explanations for questions after the removed one
          newExplanations[index - 1] = prevExplanations[index];
        }
        // Skip the removed question's explanations
      });
      
      return newExplanations;
    });

    // Remove loading explanation state for this question and shift remaining states
    setLoadingExplanation(prevLoading => {
      const newLoading: LoadingExplanation = {};
      
      Object.keys(prevLoading).forEach(key => {
        const index = parseInt(key);
        if (index < questionIndex) {
          // Keep loading states for questions before the removed one
          newLoading[index] = prevLoading[index];
        } else if (index > questionIndex) {
          // Shift loading states for questions after the removed one
          newLoading[index - 1] = prevLoading[index];
        }
        // Skip the removed question's loading state
      });
      
      return newLoading;
    });

    // Remove submitted reports/edits for this question and shift remaining ones
    setSubmittedReports(prevReports => {
      const newReports: Record<number, boolean> = {};
      
      Object.keys(prevReports).forEach(key => {
        const index = parseInt(key);
        if (index < questionIndex) {
          newReports[index] = prevReports[index];
        } else if (index > questionIndex) {
          newReports[index - 1] = prevReports[index];
        }
      });
      
      return newReports;
    });

    setSubmittedEdits(prevEdits => {
      const newEdits: Record<number, boolean> = {};
      
      Object.keys(prevEdits).forEach(key => {
        const index = parseInt(key);
        if (index < questionIndex) {
          newEdits[index] = prevEdits[index];
        } else if (index > questionIndex) {
          newEdits[index - 1] = prevEdits[index];
        }
      });
      
      return newEdits;
    });
  };

  useEffect(() => {
    const loadUserBookmarks = async () => {
          const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const bookmarks = await loadBookmarksFromSupabase(user.id);
        
        // Create a map of question text to bookmark status
        const bookmarkMap: Record<string, boolean> = {};
        bookmarks.forEach(bookmark => {
          if (bookmark.source === 'test') {
            bookmarkMap[bookmark.question.question] = true;
          }
        });
        
        setBookmarkedQuestions(bookmarkMap);
      }
    };
    
    loadUserBookmarks();
  }, []);
  // Fetch user profile data
  const fetchProfileData = async (user: User | null) => {
    const profile = await getUserProfile(user?.id || null);
    console.log("Header: Fetched profile:", profile); // DEBUG
  };
  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user || null;
      fetchProfileData(user); // Fetch profile when user state changes
    });
    return () => subscription.unsubscribe();
  }, []);

  // Setup visibility handling for time management
  useEffect(() => {
    const cleanup = setupVisibilityHandling();
    return cleanup;
  }, []); 


  if (!isMounted) {
    return null;
  }
    
  return (
    <>

      {/* <ToastContainer theme={`${darkMode ? "dark" : "light"}`} style={{zIndex:99999}}/> */}
      <div className="relative min-h-screen">
        {/* Background */}
        <div
          className={`absolute inset-0 ${
            darkMode ? 'bg-gray-900' : 'bg-gray-50'
          }`}
        ></div>

        {/* Add styled scrollbar */}
        <style jsx global>{`
          ::-webkit-scrollbar {
            width: 8px;
            transition: background 1s ease;
            ${darkMode
              ? 'background: black;'
              : 'background: white;'
            }
          }

                    ::-webkit-scrollbar-thumb {
            background: ${darkMode
              ? '#374151'
              : '#3b82f6'};
            border-radius: 4px;
            transition: background 1s ease;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: ${darkMode
              ? '#1f2937'
              : '#2563eb'};
          }
        `}</style>

        {/* Page Content */}
        <div className="relative flex flex-col items-center p-6 ">
        <button
            onClick={handleResetTest}
            className={`absolute top-4 right-4 p-2 rounded-full transition-transform duration-300 hover:scale-110 ${
              darkMode ? 'bg-gray-700 text-white shadow-lg' : 'bg-white text-gray-900 shadow-md'
            }`}
            title="Reset Test"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-refresh">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
              <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
            </svg>
          </button>
          <header className="w-full max-w-3xl flex justify-between items-center py-4 ">
            <div className="flex items-center">
              <h1 className={`text-2xl font-extrabold  ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                Scio.ly: {routerData.eventName ? routerData.eventName : 'Loading...'}
                {localStorage.getItem('testFromBookmarks') === 'true' && (
                  <span className={`ml-2 text-sm font-normal ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                    (Bookmarked)
                  </span>
                )}
              </h1>
            </div>
            {timeLeft !== null && (
              <div
                className={`text-xl font-semibold  ${
                  timeLeft <= 300
                    ? 'text-red-600'
                    : darkMode
                    ? 'text-white'
                    : 'text-blue-600'
                }`}
              >
                {formatTime(timeLeft)}
              </div>
            )}
          </header>

          {/* Smooth Progress Bar */}
          <div
            className={`${isSubmitted ? '' : 'sticky top-6'
            } z-10 w-full max-w-3xl bg-white border-2 border-gray-300 rounded-full h-5 mb-6 shadow-lg `}
          >
            <div
                              className="bg-blue-500 h-4 rounded-full transition-[width] duration-700 ease-in-out shadow-md"
              style={{ width: `${(Object.keys(userAnswers).length / data.length) * 100}%` }}
            ></div>
          </div>

          <main
            className={`w-full max-w-3xl rounded-lg shadow-md p-6 mt-4  ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}
          >
          <button
            onClick={() => setShareModalOpen(true)}
            title="Share Test"
            className="absolute "
          >
          <div className = "flex justify-between text-blue-400">
          <FaShareAlt className={`transition-all duration-500 mt-0.5`}/> <p>&nbsp;&nbsp;Take together</p>
          </div>
          </button>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
              </div>
            ) : fetchError ? (
              <div className="text-red-600 text-center">{fetchError}</div>
            ) : routerData.eventName === "Codebusters" && routerData.types === 'multiple-choice' ? (
              <div className="flex flex-col items-center justify-center h-64">
                <p className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  No MCQs available for this event
                </p>
                <p className={`text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Please select &quot;MCQ + FRQ&quot; in the dashboard to practice this event
                </p>
              </div>
            ) : (
              <>
                <div className="container mx-auto px-4 py-8 mt-3">
                  {data.map((question, index) => {
                    const isMultiSelect = isMultiSelectQuestion(question.question, question.answers);
                    const currentAnswers = userAnswers[index] || [];
                    const isBookmarked = isQuestionBookmarked(question);

                    return (
                      <div
                        key={index}
                        className={`relative border p-4 rounded-lg shadow-sm transition-all duration-500 ease-in-out mb-6 ${
                          darkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-gray-50 border-gray-300 text-black'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                        
                          <h3 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>Question {index + 1}</h3>
                          <QuestionActions
                            question={question}
                            questionIndex={index}
                            isBookmarked={isBookmarked}
                            eventName={routerData.eventName || 'Unknown Event'}
                            source="test"
                            onBookmarkChange={handleBookmarkChange}
                            darkMode={darkMode}
                            compact={true}
                            isSubmittedReport={submittedReports[index]}
                            isSubmittedEdit={submittedEdits[index]}
                            onReportSubmitted={handleReportSubmitted}
                            onEditSubmitted={handleEditSubmitted}
                            isSubmitted={isSubmitted}
                            onEdit={() => handleEditOpen(question)}
                            onQuestionRemoved={handleQuestionRemoved}
                          />
                        </div>
                        <p className="mb-4 break-words whitespace-normal overflow-x-auto">
                          {question.question}
                        </p>

                        {question.options && question.options.length > 0 ? (
                          <div className="space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <label
                                key={optionIndex}
                                                        className={`block p-2 rounded-md  ${
                          (() => {
                            // 🔍 DEBUG: Log answer coloring logic
                            if (isSubmitted) {
                              console.log(`🎨 Answer coloring for Q${index + 1}, option ${optionIndex + 1} (${option}):`);
                              console.log(`  gradingResults[${index}]:`, gradingResults[index]);
                              console.log(`  question.answers:`, question.answers);
                              console.log(`  currentAnswers:`, currentAnswers);
                              console.log(`  optionIndex:`, optionIndex);
                              console.log(`  is correct answer?:`, question.answers.includes(option));
                              console.log(`  user selected?:`, currentAnswers.includes(option));
                            }
                            
                            // Simplified coloring logic
                            if (!isSubmitted) {
                              return darkMode ? 'bg-gray-700' : 'bg-gray-200';
                            }
                            
                            // After submission, color based on correctness
                            // Handle both string and number answers from backend (same logic as grading)
                            const correctAnswers = question.answers.map(ans => {
                              if (typeof ans === 'string') {
                                // Skip empty strings - treat as no correct answer available
                                if (ans === "") return undefined;
                                // If answer is a string, it's the option text
                                return ans;
                              } else if (typeof ans === 'number') {
                                // If answer is a number, convert to option text
                                return question.options && ans >= 0 && ans < question.options.length 
                                  ? question.options[ans] 
                                  : undefined;
                              }
                              return undefined;
                            }).filter((text): text is string => text !== undefined);
                            
                            const isCorrectAnswer = correctAnswers.includes(option);
                            const isUserSelected = currentAnswers.includes(option);
                            
                            if (isCorrectAnswer && isUserSelected) {
                              // User selected correct answer - green
                              return darkMode ? 'bg-green-800' : 'bg-green-200';
                            } else if (isCorrectAnswer && !isUserSelected) {
                              // Correct answer that user didn't select - blue (show correct answer)
                              return darkMode ? 'bg-blue-700' : 'bg-blue-200';
                            } else if (!isCorrectAnswer && isUserSelected) {
                              // User selected wrong answer - red
                              return darkMode ? 'bg-red-900' : 'bg-red-200';
                            } else {
                              // Neither correct nor selected - gray
                              return darkMode ? 'bg-gray-700' : 'bg-gray-200';
                            }
                          })()
                        } ${!isSubmitted && (darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-300')}`}
                              >
                                <input
                                  type={isMultiSelect ? "checkbox" : "radio"}
                                  name={`question-${index}`}
                                  value={option}
                                  checked={currentAnswers.includes(option)}
                                  onChange={() => handleAnswerChange(index, option, isMultiSelect)}
                                  disabled={isSubmitted}
                                  className="mr-2"
                                />
                                {option}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <textarea
                            value={userAnswers[index]?.[0] || ''}
                            onChange={(e) => handleAnswerChange(index, e.target.value)}
                            disabled={isSubmitted}
                            className={`w-full p-2 border rounded-md  ${
                              darkMode ? 'bg-gray-700' : 'bg-white'
                            }`}
                            rows={3}
                            placeholder="Type your answer here..."
                          />
                        )}

                        {isSubmitted && (
                          <>
                            {(() => {
                              const score = gradingResults[index] ?? 0;
                              let resultText = '';
                              let resultColor = '';
                              if (!currentAnswers[0]) {
                                resultText = 'Skipped';
                                resultColor = 'text-blue-500';
                              } else if (score === 1 || score === 2 || score === 3) {
                                resultText = 'Correct!';
                                resultColor = 'text-green-600';
                              } else if (score === 0) {
                                resultText = 'Wrong!';
                                resultColor = 'text-red-600';
                              } else {
                                resultText = 'Partial Credit';
                                resultColor = 'text-amber-400';
                              }
                              return (
                                <p className={`mt-2 font-semibold  ${resultColor}`}>
                                  {resultText}
                                </p>
                              );
                            })()}
                            <div className="mt-2">
                              {!explanations[index] ? (
                                <button
                                  onClick={() => handleGetExplanation(index, question, currentAnswers ?? [])}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 ${
                                    darkMode
                                      ? 'bg-gray-700 hover:bg-gray-600 text-blue-400'
                                      : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                                  }`}
                                  disabled={loadingExplanation[index]}
                                >
                                  {loadingExplanation[index] ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                                  ) : (
                                    <>
                                      <span>Explain</span>
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <MarkdownExplanation text={explanations[index]} />
                              )}
                            </div>
                          </>
                        )}
                        <br />
                        {/* Difficulty Bar */}
                        <div className="absolute bottom-2 right-2 w-20 h-2 rounded-full bg-gray-300 ">
                          <div
                            className={`h-full rounded-full  ${
                              question.difficulty >= 0.66
                                ? 'bg-red-500'
                                : question.difficulty >= 0.33
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${question.difficulty * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Submit Button */}
                <div className="text-center ">
                  {isSubmitted ? (
                    <button
                      onClick={handleResetTest}
                      className={`w-full px-4 py-2 font-semibold rounded-lg  transform hover:scale-105 ${
                        darkMode
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      Reset Test
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      className={`w-full px-4 py-2 font-semibold rounded-lg  transform hover:scale-105 ${
                        darkMode
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}>
                      Submit Answers
                    </button>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      <ShareModal
        isOpen={shareModalOpen}
        onClose={closeShareModal}
        inputCode={inputCode}
        setInputCode={setInputCode}
        darkMode={darkMode}
      />
      {editingQuestion && (
        <EditQuestionModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleEditSubmit}
          darkMode={darkMode}
          question={editingQuestion}
          eventName={routerData.eventName || 'Unknown Event'}
          canEditAnswers={isSubmitted}
        />
      )}


      {/* Fixed Back Button */}
      <button
        onClick={handleBackToMain}
        className={`fixed bottom-8 left-8 z-50 p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
          darkMode
            ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-600/50'
            : 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-blue-500/50'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>



      {/* Add the reference button as sticky at the bottom */}
      {routerData.eventName === 'Codebusters' && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30 mb-2">
          <PDFViewer 
            pdfPath="/2024_Div_C_Resource.pdf" 
            buttonText="Codebusters Reference" 
            darkMode={darkMode} 
          />
        </div>
      )}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={darkMode ? "dark" : "light"}
      />
    </>
  );
}


