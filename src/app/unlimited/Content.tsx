'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback } from 'react';

import { updateMetrics } from '@/app/utils/metrics';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/app/contexts/ThemeContext';
import Header from '@/app/components/Header';
import api from '../api';
import { getEventOfflineQuestions } from '@/app/utils/storage';
import MarkdownExplanation from '@/app/utils/MarkdownExplanation';
import QuestionActions from '@/app/components/QuestionActions';
import EditQuestionModal from '@/app/components/EditQuestionModal';
import { loadBookmarksFromSupabase } from '@/app/utils/bookmarks';
import { Question } from '@/app/utils/geminiService';
import { shuffleArray } from '@/app/utils/questionUtils';
import {
  RouterParams,
  GradingResults,
  Explanations,
  LoadingExplanation,
  isMultiSelectQuestion,
  gradeWithGemini,
  buildApiParams,
  getExplanation,
  calculateMCQScore
} from '@/app/utils/questionUtils';







const LoadingFallback = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
  </div>
);






export default function UnlimitedPracticePage({ initialRouterData }: { initialRouterData?: any }) {
  const router = useRouter();

  const [data, setData] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(Math.floor(Math.random() * 200));
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [currentAnswer, setCurrentAnswer] = useState<(string | null)[]>([]);
  const [routerData, setRouterData] = useState<RouterParams>(initialRouterData || {});
  const { darkMode } = useTheme();

  const [explanations, setExplanations] = useState<Explanations>({});
  const [loadingExplanation, setLoadingExplanation] = useState<LoadingExplanation>({});
  const [lastCallTime, setLastCallTime] = useState<number>(0);
  const RATE_LIMIT_DELAY = 2000;

  const [gradingResults, setGradingResults] = useState<GradingResults>({});
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Record<string, boolean>>({});

  const [submittedReports, setSubmittedReports] = useState<Record<number, boolean>>({});
  const [submittedEdits, setSubmittedEdits] = useState<Record<number, boolean>>({});

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  

  const [idQuestionIndices, setIdQuestionIndices] = useState<Set<number>>(new Set());
  const [idQuestionCache, setIdQuestionCache] = useState<Map<number, Question>>(new Map());
  const [namePool, setNamePool] = useState<string[]>([]);
  const [isLoadingIdQuestion, setIsLoadingIdQuestion] = useState(false);


  useEffect(() => {

    if (data.length > 0 || isLoading === false) {
      return;
    }

    const storedParams = localStorage.getItem('testParams');
    const routerParams = initialRouterData || (storedParams ? JSON.parse(storedParams) : {});
    if (!routerParams || Object.keys(routerParams).length === 0) {
      router.push('/');
      return;
    }
    setRouterData(routerParams);


    const storedQuestions = localStorage.getItem('unlimitedQuestions');
    if (storedQuestions) {
      const parsedQuestions = JSON.parse(storedQuestions);
      setData(parsedQuestions);
      


      setIsLoading(false);
      return;
    }





    const fetchData = async () => {
      try {

        const params = buildApiParams(routerParams, 1000);
        const apiUrl = `${api.questions}?${params}`;
        
        let apiResponse: any = null;
        

        const isOffline = !navigator.onLine;
        if (isOffline) {

          const evt = routerParams.eventName as string | undefined;
          if (evt) {
            const slug = evt.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const cached = await getEventOfflineQuestions(slug);
            if (Array.isArray(cached) && cached.length > 0) {

              const typesSel = (routerParams.types as string) || 'multiple-choice';
              const filtered = typesSel === 'multiple-choice'
                ? cached.filter((q: any) => Array.isArray(q.options) && q.options.length > 0)
                : typesSel === 'free-response'
                  ? cached.filter((q: any) => !Array.isArray(q.options) || q.options.length === 0)
                  : cached;
              apiResponse = { success: true, data: filtered };
            }
          }
          if (!apiResponse) throw new Error('No offline data available for this event. Please download it first.');
        } else {

          let response: Response | null = null;
          try {
            response = await fetch(apiUrl);
          } catch {
            response = null;
          }
          
          if (response && response.ok) {
            apiResponse = await response.json();
          } else {

            const evt = routerParams.eventName as string | undefined;
            if (evt) {
              const slug = evt.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const cached = await getEventOfflineQuestions(slug);
              if (Array.isArray(cached) && cached.length > 0) {

                const typesSel = (routerParams.types as string) || 'multiple-choice';
                const filtered = typesSel === 'multiple-choice'
                  ? cached.filter((q: any) => Array.isArray(q.options) && q.options.length > 0)
                  : typesSel === 'free-response'
                    ? cached.filter((q: any) => !Array.isArray(q.options) || q.options.length === 0)
                    : cached;
                apiResponse = { success: true, data: filtered };
              }
            }
            if (!apiResponse) throw new Error('Failed to fetch data from API');
          }
        }
        
        if (!apiResponse.success) {
          throw new Error(apiResponse.error || 'API request failed');
        }
        const baseQuestions: Question[] = apiResponse.data || [];


        let finalQuestions: Question[] = baseQuestions;
        const idPct = (routerParams as any).idPercentage;
        const supportsId = routerParams.eventName === 'Rocks and Minerals' || 
                          routerParams.eventName === 'Entomology' ||
                          routerParams.eventName === 'Anatomy - Nervous' ||
                          routerParams.eventName === 'Anatomy - Endocrine' ||
                          routerParams.eventName === 'Anatomy - Sense Organs' ||
                          routerParams.eventName === 'Dynamic Planet - Oceanography' ||
                          routerParams.eventName === 'Water Quality - Freshwater' ||
                          routerParams.eventName === 'Remote Sensing' ||
                          routerParams.eventName === 'Circuit Lab';
        if (supportsId && typeof idPct !== 'undefined' && parseInt(idPct) > 0) {
          const pct = Math.max(0, Math.min(100, parseInt(idPct)));
          const totalQuestionsCount = pct === 100 ? 1000 : baseQuestions.length;
          const idCount = Math.round((pct / 100) * totalQuestionsCount);
          const baseCount = totalQuestionsCount - idCount;
          
          
          

          const idPlaceholders: Question[] = Array.from({ length: idCount }, (_, i) => ({
            question: '[Loading ID Question...]',
            answers: [],
            difficulty: 0.5,
            event: routerParams.eventName,
            _isIdPlaceholder: true,
            _placeholderId: i,
          } as any));
          

          if (pct === 100) {
            finalQuestions = idPlaceholders;
          } else {
            const trimmedBase = baseQuestions.slice(0, baseCount);

            const combined = [...trimmedBase, ...idPlaceholders];
            finalQuestions = shuffleArray(combined);
          }
          

          const idIndices = new Set<number>();
          finalQuestions.forEach((q, idx) => {
            if ((q as any)._isIdPlaceholder) {
              idIndices.add(idx);
            }
          });
          setIdQuestionIndices(idIndices);
          

          const idParams = new URLSearchParams();
          idParams.set('event', routerParams.eventName);
          idParams.set('limit', String(Math.max(idCount * 3, 50)));
          

          if (routerParams.subtopics && routerParams.subtopics.length > 0) {
            idParams.set('subtopics', routerParams.subtopics.join(','));
          }
          
          fetch(`${api.idQuestions}?${idParams.toString()}`)
            .then(r => r.json())
            .then(j => {
              const src = Array.isArray(j?.data) ? j.data : [];

              const typesSel = (routerParams.types as string) || 'multiple-choice';
              const filtered = src.filter((row: any) => {
                const isMcq = Array.isArray(row.options) && row.options.length > 0;
                if (typesSel === 'multiple-choice') return isMcq;
                if (typesSel === 'free-response') return !isMcq;
                return true;
              });

              const pool = filtered.map((row: any) => ({
                question: row.question,
                options: row.options || [],
                answers: row.answers || [],
                difficulty: row.difficulty ?? 0.5,
                event: row.event,
                imageData: Array.isArray(row.images) && row.images.length ? row.images[Math.floor(Math.random()*row.images.length)] : undefined,
              } as Question));
              setNamePool(pool.map(q => q.question)); // not used, but maintained

              setIdQuestionCache(prev => {
                const m = new Map(prev);
                const picks = [...pool];
                let idx = 0;
                for (const i of idIndices.values()) {
                  if (idx >= picks.length) break;
                  m.set(i, picks[idx++]);
                }
                return m;
              });
            })
            .catch(() => {});
        }


        const serialized = JSON.stringify(finalQuestions, (key, value) => key === 'imageData' ? undefined : value);
        localStorage.setItem('unlimitedQuestions', serialized);
        setData(finalQuestions);
      } catch {
        
        setFetchError('Failed to load questions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    const loadUserBookmarks = async () => {
          const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const bookmarks = await loadBookmarksFromSupabase(user.id);
        

        const bookmarkMap: Record<string, boolean> = {};
        bookmarks.forEach(bookmark => {
          if (bookmark.source === 'unlimited') {
                                const key = (bookmark.question as any).imageData
              ? `id:${(bookmark.question as any).imageData}`
              : bookmark.question.question;
            bookmarkMap[key] = true;
          }
        });
        
        setBookmarkedQuestions(bookmarkMap);
      }
    };
    
    loadUserBookmarks();


    return () => {
      if (window.location.pathname !== '/unlimited') {
        localStorage.removeItem('unlimitedQuestions');
        localStorage.removeItem('testParams');
        localStorage.removeItem('contestedUnlimitedQuestions');
      }
    };
  }, []);


  const loadIdQuestion = useCallback(async (index: number) => {
    if (!idQuestionIndices.has(index) || idQuestionCache.has(index)) {
      return;
    }
    
    setIsLoadingIdQuestion(true);
    try {
      console.log('[IDGEN][unlimited] loading ID question for index', index);
      

      const params = new URLSearchParams();
      params.set('event', routerData.eventName || 'Unknown Event');
      params.set('limit', '1');
      

      if (routerData.subtopics && routerData.subtopics.length > 0) {
        params.set('subtopics', routerData.subtopics.join(','));
      }
      
      const resp = await fetch(`${api.idQuestions}?${params.toString()}`);
      const { success, data } = await resp.json();
      
              if (success && data.length > 0) {
          const item = data[0];
          const imgs: string[] = Array.isArray(item.images) ? item.images : [];
          const chosenImg = imgs.length ? imgs[Math.floor(Math.random() * imgs.length)] : undefined;
          

          const types = routerData.types || 'multiple-choice';
          let question: Question;
          

          const isEnt = routerData.eventName === 'Entomology';
          const isRocks = routerData.eventName === 'Rocks and Minerals';
          const isAnatomy = routerData.eventName?.startsWith('Anatomy');
          const isDyplan = routerData.eventName?.startsWith('Dynamic Planet');
          const isWaterQuality = routerData.eventName === 'Water Quality - Freshwater';
          const isRemoteSensing = routerData.eventName === 'Remote Sensing';
          const isCircuitLab = routerData.eventName === 'Circuit Lab';
          
          let frqPrompt = 'Identify the specimen shown in the image.';
          if (isEnt) {
            frqPrompt = 'Identify the scientific name shown in the image.';
          } else if (isRocks) {
            frqPrompt = 'Identify the mineral shown in the image.';
          } else if (isAnatomy) {
            frqPrompt = 'Identify the anatomical structure shown in the image.';
          } else if (isDyplan) {
            frqPrompt = 'Identify the geological feature shown in the image.';
          } else if (isWaterQuality) {
            frqPrompt = 'Identify the water quality indicator shown in the image.';
          } else if (isRemoteSensing) {
            frqPrompt = 'Analyze the remote sensing data shown in the image.';
          } else if (isCircuitLab) {
            frqPrompt = 'Analyze the circuit diagram or measurement shown in the image.';
          }
          
          if (types === 'free-response' || (types === 'both' && Math.random() < 0.5)) {
            question = {
              question: frqPrompt,
              answers: item.answers || item.names || [],
              difficulty: item.difficulty ?? 0.5,
              event: routerData.eventName || 'Unknown Event',
              imageData: chosenImg,
            };
          } else {
            const correct = (item.answers && item.answers.length > 0) ? item.answers[0] : (item.names && item.names.length > 0) ? item.names[0] : '';
            const distractors = shuffleArray(namePool.filter(n => !item.answers?.includes(n) && !item.names?.includes(n))).slice(0, 3);
            const options = shuffleArray([correct, ...distractors]);
            const correctIndex = options.indexOf(correct);
            question = {
              question: frqPrompt,
              options,
              answers: [correctIndex],
              difficulty: item.difficulty ?? 0.5,
              event: routerData.eventName || 'Unknown Event',
              imageData: chosenImg,
            };
          }
        

        setIdQuestionCache(prev => new Map(prev).set(index, question));
        setData(prev => {
          const newData = [...prev];
          newData[index] = question;
          return newData;
        });
        
        
      }
    } catch {
      
    } finally {
      setIsLoadingIdQuestion(false);
    }
  }, [idQuestionIndices, idQuestionCache, namePool, routerData]);


  useEffect(() => {
    if (idQuestionIndices.has(currentQuestionIndex) && !idQuestionCache.has(currentQuestionIndex)) {
      loadIdQuestion(currentQuestionIndex);
    }
  }, [currentQuestionIndex, idQuestionIndices, idQuestionCache, loadIdQuestion]);


  const currentQuestion = idQuestionCache.get(currentQuestionIndex) || data[currentQuestionIndex];



  // for radio buttons or free-response we simply store a single value.
  const handleAnswerChange = (answer: string | null, multiselect = false) => {
    if (multiselect) {
      setCurrentAnswer((prev) => {

        if (prev.includes(answer)) {
          return prev.filter((ans) => ans !== answer);
        }
        return [...prev, answer];
      });
    } else {
      setCurrentAnswer([answer]);
    }
  };

  /*
    Updated isCorrect now returns a numeric score:
    - For questions with options: uses calculateMCQScore
    - For free-response questions we use gradeWithGemini.
  */
  const isCorrect = async (question: Question, answers: (string | null)[]): Promise<number> => {
    if (!question.answers || question.answers.length === 0) return 0;

    if (question.options && question.options.length > 0) {
      return calculateMCQScore(question, answers);
    }


    if (!answers[0]) return 0;
    return await gradeWithGemini(answers[0], question.answers, question.question);
  };


  const handleSubmit = async () => {
    setIsSubmitted(true);

    try {
      // 🔍 debug: log submission details
      
      
      const score = await isCorrect(currentQuestion, currentAnswer);
      
      
      
      setGradingResults((prev) => ({ ...prev, [currentQuestionIndex]: score }));


      const wasAttempted = currentAnswer.length > 0 && currentAnswer[0] !== null && currentAnswer[0] !== '';

      const fractionalCorrect = Math.max(0, Math.min(1, score));
      
      const { data: { user } } = await supabase.auth.getUser();
      await updateMetrics(user?.id || null, {
        questionsAttempted: wasAttempted ? 1 : 0,
        correctAnswers: wasAttempted ? fractionalCorrect : 0,
        eventName: wasAttempted ? (routerData.eventName || undefined) : undefined,
      });
    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  };


  const handleNext = () => {
    if (data.length > 0) {
      const randomIndex = Math.floor(Math.random() * data.length);
      
      setCurrentQuestionIndex(randomIndex);
      setCurrentAnswer([]);
      setIsSubmitted(false);
    } else {
      console.warn("No questions available to select randomly.");

    }
  };



  const handleGetExplanation = async (index: number, question: Question, userAnswer: (string | null)[]) => {

    const originalGetExplanation = () => getExplanation(
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
      undefined, // no useranswers for unlimited
      RATE_LIMIT_DELAY
    );

    await originalGetExplanation();
    

    if (question.options && question.options.length > 0) {
      const newScore = await isCorrect(question, userAnswer);
      if (newScore !== gradingResults[index]) {
        setGradingResults(prev => ({ ...prev, [index]: newScore }));
      }
    }
    

    setSubmittedReports(prev => ({ ...prev, [index]: true }));
  };





  const handleBookmarkChange = (key: string, isBookmarked: boolean) => {
    setBookmarkedQuestions(prev => ({
      ...prev,
      [key]: isBookmarked
    }));
  };

  const handleReportSubmitted = (index: number) => {
    setSubmittedReports(prev => ({ ...prev, [index]: true }));
  };

  const handleEditSubmitted = (index: number) => {
    setSubmittedEdits(prev => ({ ...prev, [index]: true }));
  };

  const handleQuestionRemoved = (_questionIndex: number) => {

    // since there's only one question shown at a time
    handleNext();
  };

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
          const questionIndex = currentQuestionIndex;

          setData(prevData => {
            const newData = [...prevData];
            newData[questionIndex] = editedQuestion;
            return newData;
          });
          

          const updatedData = data.map((q, idx) => 
            idx === questionIndex ? editedQuestion : q
          );
          localStorage.setItem('unlimitedQuestions', JSON.stringify(updatedData));
          
          handleEditSubmitted(questionIndex);
        }
        return { success: true, message: result.message || 'Edit submitted successfully!', reason: result.message || 'Edit submitted successfully!' };
      } else {
        return { success: false, message: result.message || 'Failed to submit edit', reason: result.message || 'Failed to submit edit' };
      }
    } catch (error) {
      console.error('Error submitting edit:', error);
      return { success: false, message: 'An unexpected error occurred. Please try again.', reason: 'An unexpected error occurred. Please try again.' };
    }
  };
  const renderQuestion = (question: Question) => {
    const isMultiSelect = isMultiSelectQuestion(question.question, question.answers);
    const currentAnswers = currentAnswer || [];
    const key = (question as any).imageData ? `id:${(question as any).imageData}` : question.question;
    const isBookmarked = bookmarkedQuestions[key] || false;

    return (
      <div className={`relative border p-4 rounded-lg shadow-sm transition-all duration-500 ease-in-out ${
        darkMode
          ? 'bg-gray-700 border-gray-600 text-white'
          : 'bg-gray-50 border-gray-300 text-black'
      }`}>
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-lg">Question</h3>
          <QuestionActions
            question={question}
            questionIndex={currentQuestionIndex}
            isBookmarked={isBookmarked}
            eventName={routerData.eventName || 'Unknown Event'}
            source="unlimited"
            onBookmarkChange={handleBookmarkChange}
            darkMode={darkMode}
            compact={true}
            isSubmittedReport={submittedReports[currentQuestionIndex]}
            isSubmittedEdit={submittedEdits[currentQuestionIndex]}
            onReportSubmitted={handleReportSubmitted}
            _isSubmitted={isSubmitted}
            onEdit={() => handleEditOpen(question)}
            onQuestionRemoved={handleQuestionRemoved}
          />
        </div>
        {isLoadingIdQuestion && idQuestionIndices.has(currentQuestionIndex) ? (
          <div className="flex items-center justify-center h-32 mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : (
          <>
            {question.imageData && (
              <div className="mb-4 w-full flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={question.imageData} alt="Mineral" className="max-h-64 rounded-md border" />
              </div>
            )}
            <p className="mb-4 break-words whitespace-normal overflow-x-auto">{question.question}</p>
          </>
        )}

        {question.options && question.options.length > 0 ? (
          <div className="space-y-2">
            {question.options.map((option, idx) => (
              <label
                key={idx}
                className={`block p-2 rounded-md  ${
                  (() => {
                    // 🔍 DEBUG: Log answer coloring logic for unlimited
                    if (isSubmitted) {
                      
                    }
                    
                    // Handle both string and number answers from backend (same logic as test page)
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
                    
                    if (isSubmitted && isUserSelected) {
                      // User selected this option
                      return gradingResults[currentQuestionIndex] >= 1
                        ? darkMode ? 'bg-green-800' : 'bg-green-200'
                        : isCorrectAnswer
                          ? darkMode ? 'bg-green-800' : 'bg-green-200'
                          : darkMode ? 'bg-red-900' : 'bg-red-200';
                    } else if (isSubmitted && isCorrectAnswer && !isUserSelected) {
                      // Correct answer that user didn't select - show it
                      return darkMode ? 'bg-green-800' : 'bg-green-200';
                    } else {
                      // Default gray background
                      return darkMode ? 'bg-gray-700' : 'bg-gray-200';
                    }
                  })()
                } ${!isSubmitted && (darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-300')}`}
              >
                <input
                  type={isMultiSelect ? "checkbox" : "radio"}
                  name={`question-${currentQuestionIndex}`}
                  value={option}
                  checked={currentAnswers.includes(option)}
                  onChange={() => handleAnswerChange(option, isMultiSelect)}
                  disabled={isSubmitted}
                  className="mr-2"
                />
                {option}
              </label>
            ))}
          </div>
        ) : (
          <textarea
            value={currentAnswer[0] || ''}
            onChange={(e) => handleAnswerChange(e.target.value)}
            disabled={isSubmitted}
            className={`w-full p-2 border rounded-md  ${
              isSubmitted 
                ? gradingResults[currentQuestionIndex] === 1
                  ? darkMode ? 'bg-green-800 border-green-700' : 'bg-green-200 border-green-300'
                  : gradingResults[currentQuestionIndex] === 0
                  ? darkMode ? 'bg-red-900 border-red-800' : 'bg-red-200 border-red-300'
                  : darkMode ? 'bg-amber-400 border-amber-500' : 'bg-amber-400 border-amber-500'
                : darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300'
            }`}
            rows={3}
            placeholder="Type your answer here..."
          />
        )}

        {isSubmitted && (
          <>
            {(() => {
              const score = gradingResults[currentQuestionIndex];
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
            <p className="text-sm mt-1">
              <strong>Correct Answer(s):</strong>{' '}
              {question.options?.length
                ? question.answers
                    .map((ans) => question.options?.[ans as number])
                    .join(', ')
                : question.answers.join(', ')}
            </p>
            <div className="mt-2">
              {!explanations[currentQuestionIndex] ? (
                <button
                  onClick={() => handleGetExplanation(currentQuestionIndex, question, currentAnswers ?? [])}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 ${
                    darkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-blue-400'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                  }`}
                  disabled={loadingExplanation[currentQuestionIndex]}
                >
                  {loadingExplanation[currentQuestionIndex] ? (
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
                <MarkdownExplanation text={explanations[currentQuestionIndex]} />
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
  };



  const handleResetTest = () => {
    setCurrentAnswer([]);
    setCurrentQuestionIndex(0);
    setData([]);
    setGradingResults({});
    setIsSubmitted(false);
    setExplanations({});
    

    localStorage.removeItem('unlimitedQuestions');
    localStorage.removeItem('testParams');
    localStorage.removeItem('contestedUnlimitedQuestions');
    
    router.push('/practice');
  };

  return (
    <>
      <Header />
      <div className="relative min-h-screen">
        {/* Background */}
        <div
          className={`absolute inset-0 ${
            darkMode ? 'bg-gray-900' : 'bg-gray-50'
          }`}
        ></div>

        <div className="relative flex flex-col items-center p-6 pt-20">
          <header className="w-full max-w-3xl flex justify-between items-center py-4 ">
            <h1 className={`text-xl md:text-3xl font-extrabold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              {routerData.eventName || 'Loading...'}
            </h1>
            {/* Reset button removed for Unlimited mode */}
          </header>

          {/* Inline back link to Practice */}
          <div className="w-full max-w-3xl -mt-2">
            <button
              onClick={handleResetTest}
              className={`group inline-flex items-center text-base font-medium ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
              <span className="ml-2">Go back</span>
            </button>
          </div>

          <main
            className={`w-full max-w-3xl rounded-lg shadow-md p-6 mt-4  ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            {isLoading ? (
              <LoadingFallback />
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
            ) : !currentQuestion ? (
              <div>No questions available.</div>
            ) : (
              <div className="space-y-4">
                {renderQuestion(currentQuestion)}

                {/* Action Button */}
                <div className="text-center">
                  {!isSubmitted ? (
                    <button
                      onClick={handleSubmit}
                      className={`w-full px-4 py-2 font-semibold rounded-lg border-2 transition-colors ${
                        darkMode
                          ? 'bg-transparent text-blue-300 border-blue-300 hover:text-blue-200 hover:border-blue-200'
                          : 'bg-transparent text-blue-700 border-blue-700 hover:text-blue-600 hover:border-blue-600'
                      }`}
                    >
                      {currentAnswer.length === 0 || currentAnswer[0] === null || currentAnswer[0] === '' ? 'Skip Question' : 'Check Answer'}
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className={`w-full px-4 py-2 font-semibold rounded-lg border-2 transition-colors ${
                        darkMode
                          ? 'bg-transparent text-blue-300 border-blue-300 hover:text-blue-200 hover:border-blue-200'
                          : 'bg-transparent text-blue-700 border-blue-700 hover:text-blue-600 hover:border-blue-600'
                      }`}
                    >
                      Next Question
                    </button>
                  )}
                </div>
              </div>
            )}
          </main>

          {/* No floating back button */}


        </div>
      </div>

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

      {/* Global ToastContainer handles notifications */}
    </>
  );
}