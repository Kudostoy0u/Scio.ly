'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { updateMetrics } from '@/app/utils/metrics';
import { auth } from '@/lib/firebase';
import { useTheme } from '@/app/contexts/ThemeContext';
import api from '../api';
import MarkdownExplanation from '@/app/utils/MarkdownExplanation';
import PDFViewer from '@/app/components/PDFViewer';
import ReportModal, { Question } from '@/app/components/ReportModal';
import { addBookmark, removeBookmark, loadBookmarksFromFirebase } from '@/app/utils/bookmarks';

interface RouterParams {
  eventName?: string;
  difficulty?: string;
  types?: string;
}

interface ReportState {
  isOpen: boolean;
  questionIndex: number | null;
}

const API_URL = api.api;
const arr = api.arr;
const LoadingFallback = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
  </div>
);

/* 
  Updated gradeWithGemini now returns a numeric score (0, 0.5, or 1).
*/
const gradeWithGemini = async (
  userAnswer: string,
  correctAnswers: (string | number)[],
  question: string
): Promise<number> => {
  if (!userAnswer) return 0;

  const prompt = `You are grading a Science Olympiad question.

Question: ${question}
Correct Answer(s): ${correctAnswers.join(', ')}
Student Answer: ${userAnswer}

Grade this response on a scale as follows:
0: The answer is completely incorrect.
0.5: The answer is partially correct.
1: The answer is fully correct.
Provide only a single number (0, 0.5, or 1) as the score. Be lenient if the student technically fills the criteria`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${arr[Math.floor(Math.random() * arr.length)]}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
      console.error('Gemini API error:', await response.text());
      return 0;
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    const score = parseFloat(resultText);
    return score;
  } catch (error) {
    console.error('Error grading with Gemini:', error);
    return 0;
  }
};

// Add this helper function
const isMultiSelectQuestion = (question: string, answers?: (number | string)[]): boolean => {
  const multiSelectKeywords = [
    'choose all',
    'select all',
    'all that apply',
    'multi select',
    'multiple select',
    'multiple answers',
    'check all',
    'mark all'
  ];
  
  // First check if the question text contains any multi-select keywords
  const hasKeywords = multiSelectKeywords.some(keyword => 
    question.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // If keywords are found, it's definitely multi-select
  if (hasKeywords) return true;
  
  // If answers array is provided and has more than one answer, it's multi-select
  if (answers && answers.length > 1) return true;
  return false;
};


export default function UnlimitedPracticePage() {
  const router = useRouter();

  const [data, setData] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(Math.floor(Math.random() * 200));
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  // For the current question, the answer is stored as an array.
  const [currentAnswer, setCurrentAnswer] = useState<(string | null)[]>([]);
  const [routerData, setRouterData] = useState<RouterParams>({});
  const { darkMode, setDarkMode } = useTheme();
  const [isProcessingReport, setIsProcessingReport] = useState<Record<number, boolean>>({});
  const [reportState, setReportState] = useState<ReportState>({
    isOpen: false,
    questionIndex: null
  });
  const [explanations, setExplanations] = useState<{ [key: number]: string }>({});
  const [loadingExplanation, setLoadingExplanation] = useState<{ [key: number]: boolean }>({});
  const [lastCallTime, setLastCallTime] = useState<number>(0);
  const RATE_LIMIT_DELAY = 2000;
  // Updated gradingResults now holds a numeric score.
  const [gradingResults, setGradingResults] = useState<{ [key: string]: number }>({});
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Record<string, boolean>>({});
  // State to track submitted reports and edits per question index
  const [submittedReports, setSubmittedReports] = useState<Record<number, boolean>>({});
  const [submittedEdits, setSubmittedEdits] = useState<Record<number, boolean>>({});

  // Fetch and filter questions on mount
  useEffect(() => {
    const storedParams = localStorage.getItem('testParams');
    if (!storedParams) {
      // Handle the case where params are not in localStorage (e.g., redirect)
      router.push('/');
      return;
    }

    const routerParams = JSON.parse(storedParams);
    setRouterData(routerParams);

    // Check if we have stored questions
    const storedQuestions = localStorage.getItem('unlimitedQuestions');
    if (storedQuestions) {
      setData(JSON.parse(storedQuestions));

      setIsLoading(false);
      return;
    }

    const difficultyMap: Record<string, number> = {
      easy: 0.33,
      medium: 0.66,
      hard: 1.0,
    };
    const difficultyValue = difficultyMap[routerParams.difficulty || 'easy'] || 0.33;

    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Failed to fetch data');
        const jsonData = await response.json();

        const eventQuestions: Question[] = jsonData[routerParams.eventName as string] || [];

        const filteredQuestions = eventQuestions.filter((q) => {
          const questionDifficulty = q.difficulty ?? 0.5;
          return routerParams.difficulty === 'any'
            ? true
            : questionDifficulty >= difficultyValue - 0.33 &&
                questionDifficulty <= difficultyValue;
        });

        const finalQuestions =
          routerParams.types === 'multiple-choice'
            ? filteredQuestions.filter((q) => q.options && q.options.length > 0)
            : routerParams.types === 'free-response'
            ? filteredQuestions.filter((q) => q.options?.length == 0)
            : filteredQuestions;

        // No shuffling here anymore
        localStorage.setItem('unlimitedQuestions', JSON.stringify(finalQuestions));
        setData(finalQuestions);
      } catch (error) {
        console.error(error);
        setFetchError('Failed to load questions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Update the useEffect that loads bookmarks
  useEffect(() => {
    const loadUserBookmarks = async () => {
      if (auth.currentUser) {
        const bookmarks = await loadBookmarksFromFirebase(auth.currentUser.uid);
        
        // Create a map of question text to bookmark status
        const bookmarkMap: Record<string, boolean> = {};
        bookmarks.forEach(bookmark => {
          if (bookmark.source === 'unlimited') {
            bookmarkMap[bookmark.question.question] = true;
          }
        });
        
        setBookmarkedQuestions(bookmarkMap);
      }
    };
    
    loadUserBookmarks();

    // Cleanup effect to clear localStorage on unmount
    return () => {
      if (window.location.pathname !== '/unlimited') {
        localStorage.removeItem('unlimitedQuestions');
        localStorage.removeItem('testParams');
        localStorage.removeItem('contestedUnlimitedQuestions');
      }
    };
  }, []);

  // Grab the current question (if available)
  const currentQuestion = data[currentQuestionIndex];

  // Update the answer for the current question.
  // For checkboxes (multiselect) the answer array is updated;
  // for radio buttons or free-response we simply store a single value.
  const handleAnswerChange = (answer: string | null, multiselect = false) => {
    if (multiselect) {
      setCurrentAnswer((prev) => {
        // Toggle the answer
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
    - For questions with options:
      • If multiple answers are allowed, we calculate the fraction of correct options selected.
      • If only one answer is allowed, we return 1 if it exactly matches; otherwise 0.
    - For free-response questions we use gradeWithGemini.
  */
  const isCorrect = async (question: Question, answers: (string | null)[]): Promise<number> => {
    if (!question.answers || question.answers.length === 0) return 0;

    if (question.options && question.options.length > 0) {
      const filteredUserAnswers = answers.filter((a) => a !== null) as string[];
      // Get correct answers from options using 1-based indices
      const correctOptions = question.answers.map(ans => question.options![Number(ans) - 1]);

      // Multi-select: check for partial credit
      if (question.answers.length > 1) {
        if (filteredUserAnswers.length === 0) return 0;

        // Calculate how many correct answers were selected
        const numCorrectSelected = filteredUserAnswers.filter((a) => correctOptions.includes(a)).length;
        const hasIncorrectAnswers = filteredUserAnswers.some(a => !correctOptions.includes(a));

        // Return 1 for perfect answers, 0.5 for partial credit (but will be counted as wrong), 0 for completely wrong
        if (numCorrectSelected === correctOptions.length && !hasIncorrectAnswers) {
          return 1;
        } else if (numCorrectSelected > 0) {
          return 0.5; // This will show amber color but count as wrong
        }
        return 0;
      } else {
        // Single selection
        return filteredUserAnswers.length === 1 && filteredUserAnswers[0] === correctOptions[0] ? 1 : 0;
      }
    }

    // For free-response questions, use gradeWithGemini
    if (!answers[0]) return 0;
    return await gradeWithGemini(answers[0], question.answers, question.question);
  };

  // Mark the current question as submitted and store the numeric score.
  const handleSubmit = async () => {
    setIsSubmitted(true);

    try {
      const score = await isCorrect(currentQuestion, currentAnswer);
      setGradingResults((prev) => ({ ...prev, [currentQuestionIndex]: score }));

      // Only count if there's an actual answer, and for multi-select, only count as correct if score is exactly 1
      const wasAttempted = currentAnswer.length > 0 && currentAnswer[0] !== null && currentAnswer[0] !== '';
      const isMultiSelect = currentQuestion.answers.length > 1 && currentQuestion.options;
      const isCorrectAnswer = isMultiSelect ? score === 1 : score >= 0.5;
      
      await updateMetrics(auth.currentUser?.uid || null, {
        questionsAttempted: wasAttempted ? 1 : 0,
        correctAnswers: wasAttempted && isCorrectAnswer ? 1 : 0,
        eventName: routerData.eventName || undefined,
      });
    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  };

  // When "Next Question" is clicked, load a random question.
  const handleNext = () => {
    if (data.length > 0) { // Ensure there are questions to pick from
      const randomIndex = Math.floor(Math.random() * data.length);
      console.log(randomIndex)
      setCurrentQuestionIndex(randomIndex);
      setCurrentAnswer([]);
      setIsSubmitted(false);
    } else {
      console.warn("No questions available to select randomly.");
      // Optionally handle the case where there are no questions, e.g., show a message to the user.
    }
  };

  const handleReport = async (reason: string, action: 'remove' | 'edit', editedQuestion?: string, originalQuestion?: string) => {
    if (reportState.questionIndex === null) return;
    
    const indexToReport = reportState.questionIndex;
    // Close the modal first
    setReportState({ isOpen: false, questionIndex: null });
    setIsProcessingReport(prev => ({ ...prev, [indexToReport]: true }));
    
    try {
      const question = data[indexToReport];
      const endpoint = action === 'remove' ? '/api/report/remove' : '/api/report/edit';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.question,
          answer: question.answers,
          originalQuestion: originalQuestion || JSON.stringify(question), // Use the full original question JSON if available
          editedQuestion: editedQuestion,
          event: routerData.eventName || 'Unknown Event',
          reason
        }),
      });

      const result = await response.json();
      
      // Show appropriate toast after modal is closed
      if (result.success) {
        toast.success(`${action === 'remove' ? 'Report' : 'Edit'} submitted successfully!`);
      } else {
        toast.error(result.message || 'Failed to submit report');
      }
    } catch {
      // Show error toast after modal is closed
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setIsProcessingReport(prev => ({ ...prev, [indexToReport]: false }));
      // Update submission status after attempt
      if (action === 'remove') {
        setSubmittedReports(prev => ({ ...prev, [indexToReport]: true }));
      } else if (action === 'edit') {
        setSubmittedEdits(prev => ({ ...prev, [indexToReport]: true }));
      }
    }
  };

  const getExplanation = async (index: number, question: Question, userAnswer: (string | null)[] ) => {
    if (explanations[index]) return;

    const now = Date.now();
    if (now - lastCallTime < RATE_LIMIT_DELAY) {
      toast.error('Please wait a moment before requesting another explanation');
      return;
    }
    setLastCallTime(now);

    setLoadingExplanation((prev) => ({ ...prev, [index]: true }));

    try {
      const isMCQ = question.options && question.options.length > 0;
      const prompt = `You are ${userAnswer.length > 0 && userAnswer[0] ? "giving feedback on a student's response to a science olympiad question." : "explaining a reasoning process to solve a science olympiad question."} 
      Question: ${question.question}${isMCQ ? `\\nOptions: ${question?.options?.join(', ')}` : ''}\n 
      Provide a clear and informative reasoning to come to an answer to this question.
      Start your output with "**Explanation:** ", end the explanation with "Final answer: [Answer].\\n"
      ${isMCQ ? "\\nEnd your output with a new line 'Correct Indices: ' followed by a comma-separated list of the 0-indexed indices of the correct options." : ""}`;
      // Removed the old logic for checking CORRECT/INCORRECT suffix as it's less reliable.

      console.log('Sending explanation prompt:', prompt);
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + arr[Math.floor(Math.random() * arr.length)],
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Response error:', errorText);
        throw new Error(`Failed to fetch explanation: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const fullResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log("API RESPONSE:", fullResponse)
      if (!fullResponse) {
        throw new Error('Invalid response format from API');
      }

      // Modified response parsing logic (similar to test/Content.tsx)
      let explanationText = fullResponse;
      const indicesMarker = 'Correct Indices: ';
      const markerIndex = fullResponse.lastIndexOf(indicesMarker);

      if (isMCQ && markerIndex !== -1) {
        // Extract and parse indices if marker is found for MCQ
        explanationText = fullResponse.substring(0, markerIndex).trim(); // Get text before marker
        const indicesString = fullResponse.substring(markerIndex + indicesMarker.length).trim();
        try {
          const zeroBasedIndices = indicesString.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
          if (zeroBasedIndices.length > 0) {
            const oneBasedIndices = zeroBasedIndices.map(i => i + 1);

            // Compare new indices with existing ones
            const currentAnswers = question.answers || [];
            const answersChanged = !(
              oneBasedIndices.length === currentAnswers.length &&
              oneBasedIndices.every(val => currentAnswers.includes(val)) &&
              currentAnswers.every(val => oneBasedIndices.includes(val))
            );

            if (answersChanged) {
              console.log("Explanation suggested different answers, submitting auto-edit request.");
              const newQ = { ...question, answers: oneBasedIndices };
              try {
                await fetch('/api/report/edit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    question: question.question,
                    answer: question.answers, // Original answers
                    originalQuestion: JSON.stringify(question),
                    editedQuestion: JSON.stringify(newQ),
                    event: routerData.eventName || 'Unknown Event',
                    reason: "Explanation corrected answers",
                    bypass: true
                  }),
                });
                // Update question data locally to reflect the change immediately
                setData(prevData => {
                  const newData = [...prevData];
                  newData[index] = { ...newData[index], answers: oneBasedIndices };
                  return newData;
                });
                // Trigger re-evaluation of the answer with the new correct answers
                const newScore = await isCorrect({ ...question, answers: oneBasedIndices }, userAnswer);
                setGradingResults(prev => ({ ...prev, [index]: newScore }));
              } catch (editError) {
                console.error("Failed to submit auto-edit request:", editError);
                // Optional: Add toast notification for failed auto-edit
              }
            } else {
              // If answers didn't change, just re-evaluate the score in case something was missed
              const currentScore = await isCorrect(question, userAnswer);
              if (currentScore !== gradingResults[index]) {
                setGradingResults(prev => ({ ...prev, [index]: currentScore }));
              }
            }
          }
        } catch (parseError) {
          console.error("Failed to parse correct indices:", parseError);
          // Keep the full response as explanation in case of parsing error
          explanationText = fullResponse;
        }
      }
      // Removed the old logic checking for "CORRECT" / "INCORRECT" suffix

      setExplanations((prev) => ({ ...prev, [index]: explanationText }));

    } catch (error) {
      console.error('Error in getExplanation:', error);
      const errorMsg = `Failed to load explanation: ${(error as Error).message}`;
      setExplanations((prev) => ({
        ...prev,
        [index]: errorMsg,
      }));
      toast.error(errorMsg);
    } finally {
      setLoadingExplanation((prev) => ({ ...prev, [index]: false }));
      // Update submission status after attempt
      setSubmittedReports(prev => ({ ...prev, [index]: true }));
    }
  };


  const handleBookmark = async (question: Question) => {
    if (!auth.currentUser) {
      toast.info('Please sign in to bookmark questions');
      return;
    }
    
    try {
      // Update local state immediately to reflect change in UI
      setBookmarkedQuestions(prev => ({
        ...prev,
        [question.question]: true
      }));
      
      // Then update Firebase in the background
      await addBookmark(auth.currentUser.uid, question, routerData.eventName || 'Unknown Event', 'unlimited');
      toast.success('Question bookmarked!');
    } catch (error) {
      // Revert the local state if there was an error
      setBookmarkedQuestions(prev => ({
        ...prev,
        [question.question]: false
      }));
      console.error('Error bookmarking question:', error);
      toast.error('Failed to bookmark question');
    }
  };

  const handleRemoveBookmark = async (question: Question) => {
    if (!auth.currentUser) {
      toast.info('Please sign in to manage bookmarks');
      return;
    }
    
    try {
      // Update local state immediately to reflect change in UI
      setBookmarkedQuestions(prev => ({
        ...prev,
        [question.question]: false
      }));
      
      // Then update Firebase in the background
      await removeBookmark(auth.currentUser.uid, question, 'unlimited');
      toast.success('Bookmark removed!');
    } catch (error) {
      // Revert the local state if there was an error
      setBookmarkedQuestions(prev => ({
        ...prev,
        [question.question]: true
      }));
      console.error('Error removing bookmark:', error);
      toast.error('Failed to remove bookmark');
    }
  };
  const updateContext = (bool, msg) => {
    (bool ? toast.success : toast.error)(msg);
  }
  // Function to handle direct report without modal
  const handleDirectReport = async (index: number) => {
    if (isProcessingReport[index] || submittedReports[index]) return; // Prevent multiple clicks if already submitted
    setIsProcessingReport(prev => ({ ...prev, [index]: true }));
    
    try {
      const question = data[index];
      console.log(JSON.stringify({
        question: question.question,
        answer: question.answers,
        originalQuestion: JSON.stringify(question),
        event: routerData.eventName || 'Unknown Event',
        reason: 'Direct report from test page' // Default reason
      }))
      const response = await fetch('/api/report/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.question,
          answer: question.answers,
          originalQuestion: JSON.stringify(question),
          event: routerData.eventName || 'Unknown Event',
          reason: 'Direct report from test page' // Default reason
        }),
      });

      const result = await response.json();
      updateContext(result.success, result.success ? 'Question reported for removal!' : result.message || 'Failed to submit report');
    } catch {
      updateContext(false, 'Failed to submit report. Please try again.');
    } finally {
      setIsProcessingReport(prev => ({ ...prev, [index]: false }));
      // Update submission status after attempt
      setSubmittedReports(prev => ({ ...prev, [index]: true }));
    }
  };
  const renderQuestion = (question: Question) => {
    const isMultiSelect = isMultiSelectQuestion(question.question, question.answers);
    const currentAnswers = currentAnswer || [];
    const isBookmarked = bookmarkedQuestions[question.question] || false;

    return (
      <div className={`relative border p-4 rounded-lg shadow-sm transition-all duration-500 ease-in-out ${
        darkMode
          ? 'bg-gray-700 border-gray-600 text-white'
          : 'bg-gray-50 border-gray-300 text-black'
      }`}>
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-lg">Question</h3>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => isBookmarked ? handleRemoveBookmark(question) : handleBookmark(question)}
              className={`text-gray-500 hover:text-yellow-500 transition-colors duration-200`}
              title={isBookmarked ? "Remove from bookmarks" : "Bookmark question"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill={isBookmarked ? "currentColor" : "none"}
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </button>
            <button
            onClick={() => setReportState({ isOpen: true, questionIndex: currentQuestionIndex })}
            className={`text-gray-500 hover:text-blue-500 transition-colors duration-200 p-1 rounded-full hover:bg-gray-500/20 ${isProcessingReport[currentQuestionIndex] || submittedEdits[currentQuestionIndex] ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Suggest Edit"
            disabled={isProcessingReport[currentQuestionIndex] || submittedEdits[currentQuestionIndex]}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button
          onClick={() => handleDirectReport(currentQuestionIndex)}
          className={`text-gray-500 hover:text-red-500 transition-colors duration-200 p-1 rounded-full hover:bg-gray-500/20 ${isProcessingReport[currentQuestionIndex] || submittedReports[currentQuestionIndex] ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Report for removal"
          disabled={isProcessingReport[currentQuestionIndex] || submittedReports[currentQuestionIndex]}
        >
          {isProcessingReport[currentQuestionIndex] ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-red-500 border-t-transparent"></div>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
        </button>
          </div>
        </div>
        <p className="mb-4 break-words whitespace-normal overflow-x-auto">
          {question.question}
        </p>

        {question.options && question.options.length > 0 ? (
          <div className="space-y-2">
            {question.options.map((option, idx) => (
              <label
                key={idx}
                className={`block p-2 rounded-md transition-colors duration-1000 ease-in-out ${
                  isSubmitted && currentAnswers.includes(option)
                    ? gradingResults[currentQuestionIndex] >= 1
                      ? darkMode ? 'bg-green-800' : 'bg-green-200'
                      : !(question.options?.length && question.answers.indexOf(idx+1) != -1)
                        ? darkMode ? 'bg-red-900' : 'bg-red-200'
                        : darkMode ? 'bg-green-800' : 'bg-green-200'
                    : isSubmitted && question.options?.length && question.answers.indexOf(idx+1) != -1 && gradingResults[currentQuestionIndex] != 3
                      ? darkMode ? 'bg-green-800' : 'bg-green-200'
                      : darkMode ? 'bg-gray-700' : 'bg-gray-200'
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
            className={`w-full p-2 border rounded-md transition-all duration-1000 ease-in-out ${
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
                <p className={`mt-2 font-semibold transition-colors duration-1000 ease-in-out ${resultColor}`}>
                  {resultText}
                </p>
              );
            })()}
            <p className="text-sm mt-1">
              <strong>Correct Answer(s):</strong>{' '}
              {question.options?.length
                ? question.answers
                    .map((ans) => question.options?.[ans as number - 1])
                    .join(', ')
                : question.answers.join(', ')}
            </p>
            <div className="mt-2">
              {!explanations[currentQuestionIndex] ? (
                <button
                  onClick={() => getExplanation(currentQuestionIndex, question, currentAnswers ?? [])}
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
        <div className="absolute bottom-2 right-2 w-20 h-2 rounded-full bg-gray-300 transition-all duration-1000 ease-in-out">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-in-out ${
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
    
    // Clear unlimited practice-related localStorage items
    localStorage.removeItem('unlimitedQuestions');
    localStorage.removeItem('testParams');
    localStorage.removeItem('contestedUnlimitedQuestions');
    
    router.push('/practice');
  };

  return (
    <>
      <div className="relative min-h-screen">
        {/* Background Layers */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${
            darkMode ? 'opacity-100' : 'opacity-0'
          } bg-gradient-to-br from-gray-800 to-black`}
        ></div>
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${
            darkMode ? 'opacity-0' : 'opacity-100'
          } bg-gradient-to-br from-gray-50 to-blue-100`}
        ></div>

        <div className="relative flex flex-col items-center p-6 transition-all duration-1000 ease-in-out">
          <header className="w-full max-w-3xl flex justify-between items-center py-4 transition-colors duration-1000 ease-in-out">
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
              Scio.ly: {routerData.eventName || 'Loading...'}
            </h1>
          </header>

          <main
            className={`w-full max-w-3xl rounded-lg shadow-md p-6 mt-4 transition-all duration-1000 ease-in-out ${
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
              <div className="space-y-6">
                {renderQuestion(currentQuestion)}

                {/* Action Button */}
                <div className="mt-6 text-center">
                  {!isSubmitted ? (
                    <button
                      onClick={handleSubmit}
                      className={`w-full mt-6 px-4 py-2 font-semibold rounded-lg transition-all duration-1000 transform hover:scale-105 ${
                        darkMode
                          ? 'bg-gradient-to-r from-regalblue-100 to-regalred-100 text-white'
                          : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                      }`}
                    >
                      {currentAnswer.length === 0 || currentAnswer[0] === null || currentAnswer[0] === '' ? 'Skip Question' : 'Check Answer'}
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className={`w-full mt-6 px-4 py-2 font-semibold rounded-lg transition-all duration-1000 transform hover:scale-105 ${
                        darkMode
                          ? 'bg-gradient-to-r from-regalblue-100 to-regalred-100 text-white'
                          : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                      }`}
                    >
                      Next Question
                    </button>
                  )}
                </div>
              </div>
            )}
          </main>

          {/* Back Button (bottom-left) */}
          <button
            onClick={handleResetTest}
            className={`fixed bottom-8 left-8 p-4 rounded-full shadow-lg transition-transform duration-300 hover:scale-110 transition-colors duration-1000 ease-in-out ${
              darkMode
                ? 'bg-gradient-to-r from-regalblue-100 to-regalred-100'
                : 'bg-gradient-to-r from-blue-500 to-cyan-500'
            } text-white`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>

          {/* Dark Mode Toggle (bottom-right) */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`fixed bottom-8 right-8 p-3 rounded-full shadow-lg transition-transform duration-300 hover:scale-110 ${
              darkMode ? 'bg-gray-700' : 'bg-white'
            }`}
          >
            {darkMode ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
<circle cx="12" cy="12" r="4" fill="currentColor"/>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M16.95 16.95l1.414 1.414M7.05 7.05L5.636 5.636"
            />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 1112 3v0a9 9 0 008.354 12.354z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      <ReportModal
        isOpen={reportState.isOpen}
        onClose={() => setReportState({ isOpen: false, questionIndex: null })}
        onSubmit={handleReport}
        darkMode={darkMode}
        question={data[reportState.questionIndex ?? 0]}
        event={routerData.eventName || 'Unknown Event'}
      />

    

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
      <ToastContainer theme={`${darkMode ? "dark" : "light"}`}/>
    </>
  );
}