'use client';
import React from 'react';
import { FaRegClipboard, FaShareAlt } from "react-icons/fa";
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { updateMetrics } from '@/app/utils/metrics';
import { auth } from '@/lib/firebase';
import { useTheme } from '@/app/contexts/ThemeContext';
import api from '../api';
import MarkdownExplanation from '@/app/utils/MarkdownExplanation';
import PDFViewer from '@/app/components/PDFViewer';
import ReportModal, { Question as ReportQuestion } from '@/app/components/ReportModal';
import { addBookmark, removeBookmark, loadBookmarksFromFirebase } from '@/app/utils/bookmarks';

interface RouterParams {
  eventName?: string;
  questionCount?: string;
  difficulty?: string;
  types?: string;
  timeLimit?: string;
}

interface ReportState {
  isOpen: boolean;
  questionIndex: number | null;
}

// Keep the Question type for backward compatibility
type Question = ReportQuestion;

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputCode: string;
  setInputCode: (code: string) => void;
  setRouterData: (data: RouterParams) => void;
  darkMode: boolean;
}

const API_URL = api.api;  
const arr = api.arr
// Replace the global variable declaration of globalShareCode with a removal comment
// let globalShareCode: string | null = null;

const difficultyMap: Record<string, number> = {
  easy: 0.33,
  medium: 0.66,
  hard: 1.0,
};

// Batch grading function for free-response questions using Gemini 2.0 Lite
const gradeFreeResponses = async (
  freeResponses: { question: string; correctAnswers: (string | number)[]; studentAnswer: string }[]
): Promise<number[]> => {
  if (!freeResponses.length) return [];
  
  let prompt =
    "You are grading a Science Olympiad free-response section. For each of the following questions, grade the student's answer on a scale as follows:\n" +
    "0: The answer is incorrect\n" +
    "0.5: The answer is partially correct. (BE STRINGENT ON THIS THIS MEANS THE STUDENT GOT SOME OF THE ANSWERS BUT NOT ALL)\n" +
    "1: The answer is fully correct\n" +
    "Provide the scores for each question in order, separated by commas.\n\n";
  
  freeResponses.forEach((item, idx) => {
    prompt += `Question ${idx + 1}: ${item.question}\n`;
    prompt += `Correct Answer(s): ${
      Array.isArray(item.correctAnswers) ? item.correctAnswers.join(", ") : item.correctAnswers
    }\n`;
    prompt += `Student Answer: ${item.studentAnswer}\n\n`;
  });
  
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=AIzaSyAkBDzzh7TQTJzmlLmzC7Yb5ls5SJqe05c",
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
      return freeResponses.map(() => 0);
    }
    
    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!resultText) {
      return freeResponses.map(() => 0);
    }
    let scores = resultText.split(",").map(item => parseFloat(item.trim()));
    // Ensure scores are one of 0, 0.5, or 1; otherwise default to 0.
    scores = scores.map(score => (score === 1 || score === 0.5 || score === 0 ? score : 0));
    return scores;
  } catch (error) {
    console.error("Error grading with Gemini:", error);
    return freeResponses.map(() => 0);
  }
};

// Helper function to determine if question is multi-select
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
  
  const hasKeywords = multiSelectKeywords.some(keyword => 
    question.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (hasKeywords) return true;
  
  if (answers && answers.length > 1) return true;
  
  return false;
};

export default function TestPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Question[]>([]);
  const [routerData, setRouterData] = useState<RouterParams>({});
  const [userAnswers, setUserAnswers] = useState<Record<number, (string | null)[] | null>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const { darkMode, setDarkMode } = useTheme();
  const [reportState, setReportState] = useState<ReportState>({
    isOpen: false,
    questionIndex: null
  });
  const [explanations, setExplanations] = useState<{ [key: number]: string }>({});
  const [loadingExplanation, setLoadingExplanation] = useState<{ [key: number]: boolean }>({});
  const [lastCallTime, setLastCallTime] = useState<number>(0);
  const RATE_LIMIT_DELAY = 2000;
  // gradingResults now holds numeric scores (0, 0.5, or 1)
  const [gradingResults, setGradingResults] = useState<{ [key: string]: number }>({});
  const [isMounted, setIsMounted] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [inputCode, setInputCode] = useState<string>('');
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Record<string, boolean>>({});

  const closeShareModal = useCallback(() => {
    setShareModalOpen(false);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    if (localStorage.getItem("loaded")) {
      localStorage.removeItem('testUserAnswers')

      toast.success('Shared test loaded successfully!');
      localStorage.removeItem("loaded");
    }
    // Load user answers from localStorage if they exist
    const storedUserAnswers = localStorage.getItem('testUserAnswers');
    if (storedUserAnswers) {
      setUserAnswers(JSON.parse(storedUserAnswers));
    }
    
    // Don't remove testTimeLeft here, so it can be loaded when the page is reloaded
    
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
    const storedParams = localStorage.getItem('testParams');
    if (!storedParams) {
      router.push('/');
      return;
    }
  
    const routerParams = JSON.parse(storedParams);
    setRouterData(routerParams);
  
    if (routerParams.timeLimit && localStorage.getItem('testTimeLeft') == routerParams.timeLimit) {
      setTimeLeft(parseInt(routerParams.timeLimit, 10) * 60);
    } else {
      setTimeLeft(parseInt(localStorage.getItem('testTimeLeft')??"30" ,10))
    }
    // Check if we have stored questions
    const storedQuestions = localStorage.getItem('testQuestions');
    if (storedQuestions) {
      setData(JSON.parse(storedQuestions));
      setIsLoading(false);
      return;
    }
  
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Failed to fetch data');
        const jsonData = await response.json();
  
        const { eventName, questionCount, difficulty, types } = routerParams;
        const difficultyValue = difficultyMap[difficulty || 'easy'] || 0.33;
        const eventQuestions: Question[] = jsonData[eventName as string] || [];
  
        // Filter questions based on difficulty
        const filteredQuestions = eventQuestions.filter((q) => {
          const questionDifficulty = q.difficulty ?? 0.5;
          return difficulty === 'any'
            ? true
            : questionDifficulty >= difficultyValue - 0.33 &&
                questionDifficulty <= difficultyValue;
        });
        console.log(`Choosing from ${filteredQuestions?.length} questions...`)
        // Assign original indices to the filtered questions
        const filteredQuestionsWithIndex = filteredQuestions.map((q, idx) => ({
          ...q,
          originalIndex: idx
        }));
  
        // Further filter questions based on types
        const finalQuestions = types === 'multiple-choice'
          ? filteredQuestionsWithIndex.filter((q) => q.options && q.options.length > 0)
          : types === 'free-response'
          ? filteredQuestionsWithIndex.filter((q) => !q.options || q.options.length === 0)
          : filteredQuestionsWithIndex;
  
        function shuffleArray<T>(array: T[]): T[] {
          const newArray = [...array];
          for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
          }
          return newArray;
        }
  
        const shuffledQuestions = shuffleArray(finalQuestions);
        const selectedQuestions = shuffledQuestions.slice(
          0,
          parseInt(questionCount || '0')
        );

        // Store only the indices of the selected questions for sharing
        localStorage.setItem('selectedIndices', JSON.stringify(selectedQuestions.map(q => q.originalIndex)));
        localStorage.setItem('testQuestions', JSON.stringify(selectedQuestions))
        setData(selectedQuestions);
      } catch (error) {
        console.error(error);
        setFetchError('Failed to load questions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchData();
  }, [router]);

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
        
        // Simple matching for MCQ
        const correct = Array.isArray(question.answers)
          ? question.answers
          : [question.answers];
        
        // Convert option index to 1-based for comparison with correct answers (if numeric)
        const userNumericAnswers = answer
          .map(ans => {
            const idx = question.options?.indexOf(ans ?? "");
            return idx !== undefined && idx >= 0 ? idx + 1 : -1;
          })
          .filter(idx => idx > 0);
        
        // Get the text of correct answers
        const correctTexts = correct
          .filter(ans => typeof ans === 'number')
          .map(ans => {
            const idx = (ans as number) - 1;
            return question.options && idx >= 0 && idx < question.options.length 
              ? question.options[idx] 
              : undefined;
          })
          .filter((text): text is string => text !== undefined);
        
        // If fully correct (exact match)
        if (
          // If user chose all correct options for multi-select...
          (isMultiSelectQuestion(question.question, question.answers) &&
            correct.every(correctAns => {
              if (typeof correctAns === 'number') {
                return userNumericAnswers.includes(correctAns);
              } else {
                return answer.some(ans => ans === correctAns);
              }
            }) &&
            userNumericAnswers.length === correct.filter(ans => typeof ans === 'number').length)
          ||
          // ...or single correct answer for single-select
          (!isMultiSelectQuestion(question.question, question.answers) &&
            (correct.includes(userNumericAnswers[0]) ||
             answer.some(ans => ans !== null && (correct.includes(ans as string) || correctTexts.includes(ans)))))
        ) {
          mcqScore++;
          // Store the grade for this question
          setGradingResults(prev => ({ ...prev, [i]: 1 }));
        } else {
          // Store that this question was incorrect
          setGradingResults(prev => ({ ...prev, [i]: 0 }));
        }
      } else {
        // For FRQ
        if (answer[0] !== null) {
          frqsToGrade.push({
            index: i,
            question: question.question,
            correctAnswers: question.answers,
            studentAnswer: answer[0] as string
          });
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
    
    // Set a flag in localStorage to indicate that the test has been submitted
    localStorage.setItem('testSubmitted', 'true');
    
    // Clear user answers from localStorage to allow a new test to be generated if the page is refreshed
    localStorage.removeItem('testUserAnswers');
    
    // Don't remove contestedQuestions from localStorage after submission
    // This ensures that if user views the same test again, they cannot re-contest questions
    
    // Update user metrics
    if (auth.currentUser && routerData.eventName) {
      updateMetrics(auth.currentUser.uid, {
        questionsAttempted: mcqTotal,
        correctAnswers: Math.round(mcqScore),
        eventName: routerData.eventName
      });
    }
  }, [data, userAnswers, gradingResults, routerData, setGradingResults]);

  useEffect(() => {
    if (timeLeft === null || isSubmitted) return;

    if (timeLeft === 0) {
      handleSubmit()
    }
    if (timeLeft === 30) {
      toast.warning("Warning: Thirty seconds left")
    }
    if (timeLeft === 60) {
      toast.warning("Warning: One minute left")
    }
    // Store timeLeft in localStorage whenever it changes
    if (timeLeft > 0) {
      localStorage.setItem('testTimeLeft', timeLeft.toString());
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted, handleSubmit]);

  const handleBackToMain = () => {
    router.push('/practice');
  };

  // Reset the test while preserving test parameters
  const handleResetTest = () => {
    setIsSubmitted(false);
    setUserAnswers({});
    setGradingResults({});
    setExplanations({});
    localStorage.removeItem('testQuestions');
    localStorage.removeItem('testUserAnswers');
    localStorage.removeItem('contestedQuestions');
    localStorage.setItem('testTimeLeft',JSON.parse(localStorage.getItem("testParams") ?? "{}")?.timeLimit.toString() || "30");
    window.location.reload()
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };
  const updateContext = (bool, msg) => {
    (bool ? toast.success : toast.error)(msg);
  }
  const handleReport = async (reason: string, action: 'remove' | 'edit', editedQuestion?: string, originalQuestion?: string) => {
    if (reportState.questionIndex === null) return;
    // Close the modal first
    setReportState({ isOpen: false, questionIndex: null });
    
    try {
      const question = data[reportState.questionIndex];
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
      updateContext(result.success,result.success ? `${action === 'remove' ? 'Report' : 'Edit'} submitted successfully!` : result.message || 'Failed to submit report')

    } catch {
      updateContext(false,'Failed to submit report. Please try again.');
    }
  };

  const getExplanation = async (index: number, question: Question) => {
    if (explanations[index]) return;
    
    const now = Date.now();
    if (now - lastCallTime < RATE_LIMIT_DELAY) {
      toast.error('Please wait a moment before requesting another explanation');
      return;
    }
    setLastCallTime(now);
    
    setLoadingExplanation((prev) => ({ ...prev, [index]: true }));
    
    try {
      console.log('Question data:', question);
      
      const prompt = `Question: ${question.question}${question.options && question.options.length > 0 ? `\nOptions: ${question.options.join(', ')}` : ''}\nAnswer:${question.answers[0]}
                      Solve this question. Start with the text "Explanation: ", providing a clear and informative explanation. Start off by giving a one paragraph explanation that leads to your answer, nothing else.`;


      console.log('Sending prompt:', prompt);
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
      console.log('API Response:', data);

      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response format from API');
      }

      const explanation = data.candidates[0].content.parts[0].text;
      setExplanations((prev) => ({ ...prev, [index]: explanation }));
    } catch (error) {
      console.error('Error in getExplanation:', error);
      setExplanations((prev) => ({
        ...prev,
        [index]: 'Failed to load explanation. Please try again later.',
      }));
      toast.error(`Failed to get explanation: ${(error as Error).message}`);
    } finally {
      setLoadingExplanation((prev) => ({ ...prev, [index]: false }));
    }
  };

  // Add this new function to check if a question has already been contested
  const hasQuestionBeenContested = (index: number): boolean => {
    const contestedQuestions = JSON.parse(localStorage.getItem('contestedQuestions') || '[]');
    return contestedQuestions.includes(index);
  };

  // Add this new function to mark a question as contested
  const markQuestionAsContested = (index: number): void => {
    const contestedQuestions = JSON.parse(localStorage.getItem('contestedQuestions') || '[]');
    if (!contestedQuestions.includes(index)) {
      contestedQuestions.push(index);
      localStorage.setItem('contestedQuestions', JSON.stringify(contestedQuestions));
    }
  };

  const validateContest = async (question: Question, userAnswer: (string | null)[]): Promise<boolean> => {
    if (!userAnswer.length) { 
      return false
    }
    toast.info("Judging...")
    const prompt = `You are grading a student's answer to a Science Olympiad question: ${question.question}.
${question.options ? `Options: ${question.options.join(', ')}\n` : ''}

Here's how they responded (if mcq, 1 based index): ${ userAnswer.filter(a => a !== null) }
Share a reasoning process to determine whether or not their response is valid or invalid. When you finish, end on either "VALID" or "INVALID" or "BAD QUESTION", and that should be the end of your response, not even a period to end.
Consider the nuances of a question, maybe it relies on previous (and unavailable) context, like when nouns are preceded by "the", in which case it is a bad question
`;

    try {
      // AIzaSyAkBDzzh7TQTJzmlLmzC7Yb5ls5SJqe05c
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=` + arr[Math.floor(Math.random() * arr.length)],
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
        return false;
      }

      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      console.log(prompt)
      console.log(question)
      console.log(resultText)
      if (resultText) {
         return !resultText.endsWith("INVALID")
      }
      return false;
    } catch (error) {
      console.error('Error validating contest:', error);
      return false;
    }
  };

  // Add helper functions for bookmark management
  const isQuestionBookmarked = (question: Question): boolean => {
    return bookmarkedQuestions[question.question] || false;
  };

  useEffect(() => {
    const loadUserBookmarks = async () => {
      if (auth.currentUser) {
        const bookmarks = await loadBookmarksFromFirebase(auth.currentUser.uid);
        
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

  const handleBookmark = async (question: Question) => {
    if (!auth.currentUser) {
      toast.info('Please sign in to bookmark questions');
      return;
    }
    
    try {
      // Update the local state immediately to make the UI responsive
      setBookmarkedQuestions(prev => ({
        ...prev,
        [question.question]: true
      }));
      
      // Then update Firebase in the background
      await addBookmark(auth.currentUser.uid, question, routerData.eventName || 'Unknown Event', 'test');
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
      // Update the local state immediately to make the UI responsive
      setBookmarkedQuestions(prev => ({
        ...prev,
        [question.question]: false
      }));
      
      // Then update Firebase in the background
      await removeBookmark(auth.currentUser.uid, question, 'test');
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

  if (!isMounted) {
    return null;
  }
  return (
    <>

      {/* <ToastContainer theme={`${darkMode ? "dark" : "light"}`} style={{zIndex:99999}}/> */}
      <div className="relative min-h-screen">
        {/* Background Layers */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${
            darkMode ? 'opacity-100' : 'opacity-0'
          } bg-gradient-to-br from-regalblue-100 to-regalred-100`}
        ></div>
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${
            darkMode ? 'opacity-0' : 'opacity-100'
          } bg-gradient-to-br from-blue-100 via-white to-cyan-100`}
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
              ? 'linear-gradient(to bottom, rgb(36, 36, 36), rgb(111, 35, 72))'
              : 'linear-gradient(to bottom, #3b82f6, #06b6d4)'};
            border-radius: 4px;
            transition: background 1s ease;
          }     
          ::-webkit-scrollbar-thumb:hover {
            background: ${darkMode
              ? 'linear-gradient(to bottom, rgb(23, 23, 23), rgb(83, 26, 54))'
              : 'linear-gradient(to bottom, #2563eb, #0891b2)'};
          }
        `}</style>

        {/* Page Content */}
        <div className="relative flex flex-col items-center p-6 transition-all duration-1000 ease-in-out">
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
          <header className="w-full max-w-3xl flex justify-between items-center py-4 transition-colors duration-1000 ease-in-out">
            <div className="flex items-center">
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent transition-colors duration-1000 ease-in-out">
                Scio.ly: {routerData.eventName ? routerData.eventName : 'Loading...'}
              </h1>
            </div>
            {timeLeft !== null && (
              <div
                className={`text-xl font-semibold transition-colors duration-1000 ease-in-out ${
                  timeLeft <= 300
                    ? 'text-red-600'
                    : darkMode
                    ? 'text-white'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent'
                }`}
              >
                {formatTime(timeLeft)}
              </div>
            )}
          </header>

          {/* Smooth Progress Bar */}
          <div
            className={`${
              isSubmitted ? '' : 'sticky top-6'
            } z-10 w-full max-w-3xl bg-white border-2 border-gray-300 rounded-full h-5 mb-6 shadow-lg transition-all duration-1000 ease-in-out`}
          >
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-4 rounded-full transition-[width] duration-700 ease-in-out shadow-md"
              style={{ width: `${(Object.keys(userAnswers).length / data.length) * 100}%` }}
            ></div>
          </div>

          <main
            className={`w-full max-w-3xl rounded-lg shadow-md p-6 mt-4 transition-all duration-1000 ease-in-out ${
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
                          <h3 className="font-semibold text-lg">Question {index + 1}</h3>
                          <div className="flex gap-2">
                            {isSubmitted && (
                              <button
                                onClick={async () => {
                                  // Check if question has already been contested
                                  if (hasQuestionBeenContested(index)) {
                                    toast.error('This question has already been contested', {
                                      autoClose: 5000
                                    });
                                    return;
                                  }

                                  const now = Date.now();
                                  if (now - lastCallTime < RATE_LIMIT_DELAY) {
                                    toast.error('Please wait a moment before contesting again');
                                    return;
                                  }
                                  setLastCallTime(now);
                              
                                  try {
                                    // Validate contest and wait for it to finish completely
                                    const isValid = await validateContest(question, userAnswers[index] ?? []);
                                    
                                    if (isValid) {
                                      setGradingResults(prev => ({ ...prev, [index]: 2 }));
                                      toast.success('Contest accepted! Your answer has been marked as correct.', {
                                        autoClose: 5000
                                      });
                                    } else {
                                      toast.error('Contest rejected. The original grade stands.', {
                                        autoClose: 5000
                                      });
                                    }
                                    
                                    // Mark as contested only after all notifications and processing is complete
                                    markQuestionAsContested(index);
                                  } catch (error) {
                                    console.error('Error during contest validation:', error);
                                    toast.error('An error occurred during contest validation', {
                                      autoClose: 5000
                                    });
                                  }
                                }}
                                className="text-gray-500 hover:text-blue-500 transition-colors duration-200"
                                title="Contest this question"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  viewBox="0 0 57 57"
                                  fill="currentColor"
                                >
                                  <path d="M57,0h-8.837L18.171,29.992l-4.076-4.076l-1.345-4.034c-0.22-0.663-0.857-1.065-1.55-0.98 c-0.693,0.085-1.214,0.63-1.268,1.327l-0.572,7.438l5.982,5.982L4.992,46H2.274C1.02,46,0,47.02,0,48.274v6.452 C0,55.98,1.02,57,2.274,57h6.452C9.98,57,11,55.98,11,54.726v-3.421l10-10l6.021,6.021l6.866-1.145 c0.685-0.113,1.182-0.677,1.21-1.37c0.028-0.693-0.422-1.295-1.096-1.464l-3.297-0.824l-4.043-4.043L57,8.489V0z M9,54.726 C9,54.877,8.877,55,8.726,55H2.274C2.123,55,2,54.877,2,54.726v-6.452C2,48.123,2.123,48,2.274,48h0.718h5.734 C8.877,48,9,48.123,9,48.274v5.031V54.726z M11,48.477v-0.203C11,47.02,9.98,46,8.726,46H7.82l8.938-8.938l1.417,1.417l1.411,1.411 L11,48.477z M30.942,44.645l-3.235,0.54l-5.293-5.293l0,0l-2.833-2.833l-8.155-8.155l0.292-3.796l0.63,1.89l4.41,4.41l0,0 l4.225,4.225l8.699,8.699L30.942,44.645z M25.247,37.066l-2.822-2.822l-2.839-2.839L48.991,2h4.243L23.829,31.406 c-0.391,0.391-0.391,1.023,0,1.414c0.195,0.195,0.451,0.293,0.707,0.293s0.512-0.098,0.707-0.293L55,3.062v4.592L25.247,37.066z" />
                                </svg>
                              </button>
                            )}
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
                              onClick={() => setReportState({ isOpen: true, questionIndex: index })}
                              className="text-gray-500 hover:text-red-500 transition-colors duration-200"
                              title="Report this question"
                            >
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
                            </button>
                          </div>
                        </div>
                        <p className="mb-4 break-words whitespace-normal overflow-x-auto">
                          {question.question}
                        </p>

                        {question.options && question.options.length > 0 ? (
                          <div className="space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <label
                                key={optionIndex}
                                className={`block p-2 rounded-md transition-colors duration-1000 ease-in-out ${
                                  (gradingResults[index] ?? 0) == 2
                                  ? darkMode ? 'bg-green-800' : 'bg-green-200'
                                  : isSubmitted && currentAnswers.includes(option) && currentAnswers[0]
                                    ? question.options?.length && question.answers.indexOf(optionIndex+1) != -1
                                      ? darkMode ? 'bg-green-800' : 'bg-green-200'
                                      : darkMode ? 'bg-red-900' : 'bg-red-200'
                                    : isSubmitted && question.options?.length && question.answers.indexOf(optionIndex+1) != -1
                                      ? question.answers?.length == 1 && currentAnswers[0]
                                      ? darkMode ? 'bg-green-800' : 'bg-green-200'
                                      : darkMode ? 'bg-blue-700' : 'bg-blue-200'
                                    : darkMode ? 'bg-gray-700' : 'bg-gray-200'
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
                            className={`w-full p-2 border rounded-md transition-all duration-1000 ease-in-out ${
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
                              } else if (score === 1 || score === 2) {
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
                              {!explanations[index] ? (
                                <button
                                  onClick={() => getExplanation(index, question)}
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
                  })}
                </div>

                {/* Submit Button */}
                <div className="text-center transition-all duration-1000 ease-in-out">
                  {isSubmitted ? (
                    <button
                      onClick={handleResetTest}
                      className={`w-full px-4 py-2 font-semibold rounded-lg transition-all duration-1000 transform hover:scale-105 ${
                        darkMode
                          ? 'bg-gradient-to-r from-regalblue-100 to-regalred-100 text-white'
                          : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                      }`}
                    >
                      Reset Test
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      className={`w-full px-4 py-2 font-semibold rounded-lg transition-all duration-1000 transform hover:scale-105 ${
                        darkMode
                          ? 'bg-gradient-to-r from-regalblue-100 to-regalred-100 text-white'
                          : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
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
      <ReportModal
        isOpen={reportState.isOpen}
        onClose={() => setReportState({ isOpen: false, questionIndex: null })}
        onSubmit={handleReport}
        darkMode={darkMode}
        question={data[reportState.questionIndex ?? 0]}
        event={routerData.eventName || 'Unknown Event'}
      />
      <ShareModal
        isOpen={shareModalOpen}
        onClose={closeShareModal}
        inputCode={inputCode}
        setInputCode={setInputCode}
        setRouterData={setRouterData}
        darkMode={darkMode}
      />


      {/* Fixed Back Button */}
      <button
        onClick={handleBackToMain}
        className={`fixed bottom-8 left-8 z-50 p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
          darkMode
            ? 'bg-gradient-to-r from-regalblue-100 to-regalred-100 text-white hover:shadow-regalblue-100/50'
            : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-blue-500/50'
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

      {/* Fixed Dark Mode Toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`fixed bottom-8 right-8 z-50 p-3 rounded-full shadow-lg transition-transform duration-300 hover:scale-110 ${
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
            <circle cx="12" cy="12" r="4" fill="currentColor" />
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

const ShareModal: React.FC<ShareModalProps> = React.memo(({ isOpen, onClose, inputCode, setInputCode, setRouterData, darkMode }) => {
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingLoad, setLoadingLoad] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const hasGeneratedRef = useRef(false);

  const generateShareCode = async () => {
    const selectedIndicesRaw = localStorage.getItem('selectedIndices');
    if (!selectedIndicesRaw) {
      toast.error('No selected test questions found to share.');
      return;
    }
    const testParamsRaw = localStorage.getItem('testParams');
    if (!testParamsRaw) {
      toast.error('No test parameters found.');
      return;
    }
    setLoadingGenerate(true);
    try {
      const indices = JSON.parse(selectedIndicesRaw) as number[];
      const testParams = JSON.parse(testParamsRaw);
      const response = await fetch('/api/share/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indices, testParamsRaw: testParams })
      });
      if (!response.ok) {
        throw new Error('Failed to generate share code');
      }
      const data = await response.json();
      setShareCode(data.code);
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message);
    } finally {
      setLoadingGenerate(false);
    }
  };

  const copyCodeToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareCode || '');
      toast.success('Code copied to clipboard!');
    } catch {
      toast.error('Failed to copy code');
    }
  };

  const loadSharedTest = async () => {
    let code = inputCode
    if (!code) {
      if (localStorage.getItem("shareCode")) {
        code = localStorage.getItem("shareCode") || ""
      } else {
      toast.error('Please enter a share code');
      return;
      }
    }
    setLoadingLoad(true);
    try {
      const response = await fetch(`/api/share?code=${code}`);
      if (!response.ok) {
        throw new Error('Invalid or expired share code');
      }
      const data = await response.json();
      if (!data.indices || !Array.isArray(data.indices)) {
        throw new Error('Invalid data received from share code');
      }

      if (data.testParamsRaw) {
        localStorage.setItem('testParams', JSON.stringify(data.testParamsRaw));
      }
      const storedParams = localStorage.getItem('testParams');
      if (!storedParams) {
        throw new Error('No test parameters found');
      }
      const routerParams = JSON.parse(storedParams);
      const { eventName, timeLimit } = routerParams;
      localStorage.setItem("testTimeLeft",timeLimit)
      setRouterData(routerParams);
      const freshResponse = await fetch(API_URL);
      if (!freshResponse.ok) {
        throw new Error('Failed to fetch data');
      }
      const jsonData = await freshResponse.json();
      let eventQuestions = jsonData[eventName] || [];
      eventQuestions = eventQuestions.map((q, idx) => ({ ...q, originalIndex: idx }));

      const newQuestions = data.indices
        .map((i: number) => eventQuestions[i])
        .filter((q: Question | undefined): q is Question => q !== undefined);

      if (newQuestions.length === 0) {
        throw new Error('No matching questions found for this share code');
      }
      localStorage.setItem("testQuestions",JSON.stringify(newQuestions))
      localStorage.setItem("loaded","1")
      window.location.reload()
      
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message);
    } finally {
      setLoadingLoad(false);
    }
  };
  // Listen for localStorage changes on testParams and regenerate share code if it changes
  useEffect(() => {
    if (localStorage.getItem("shareCode")) {
      loadSharedTest()
      localStorage.removeItem("shareCode")
    }
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'testParams') {
        generateShareCode();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  });

  useEffect(() => {
    if (isOpen && !hasGeneratedRef.current && !shareCode) {
      generateShareCode();
      hasGeneratedRef.current = true;
    }
  }, [isOpen, shareCode]);

  return (
    <div
      style={{ display: isOpen ? 'flex' : 'none' }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className={`relative rounded-lg p-6 w-96 transition-colors duration-300 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
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
          {loadingGenerate ? (
            <p>Generating...</p>
          ) : shareCode ? (
            <div className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
              <span className="break-all text-black">{shareCode}</span>
              <button onClick={copyCodeToClipboard} className="ml-2">
              <FaRegClipboard className="text-black"/>
            </button>
            </div>
          ) : (
            <p>No code available</p>
          )}
        </div>
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Load Shared Test</h4>
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Enter share code"
            className="w-full p-2 border rounded-md mb-2 text-black"
          />
          <button
            onClick={loadSharedTest}
            disabled={loadingLoad}
            className="w-full px-4 py-2 rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors duration-300"
          >
            {loadingLoad ? 'Loading...' : 'Load Shared Test'}
          </button>
        </div>
      </div>
    </div>
  );
});

ShareModal.displayName = 'ShareModal';
