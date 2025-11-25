"use client";
import { useTheme } from "@/app/contexts/themeContext";
import SyncLocalStorage from "@/lib/database/localStorage-replacement";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FaShareAlt } from "react-icons/fa";
import { toast } from "react-toastify";

import MainHeader from "@/app/components/Header";

import ShareModal from "@/app/components/ShareModal";
import { updateMetrics } from "@/app/utils/metrics";
import {
  clearTestSession,
  getCurrentTestSession,
  initializeTestSession,
  markTestSubmitted,
  pauseTestSession,
  resumeFromPause,
  setupVisibilityHandling,
  updateTimeLeft,
} from "@/app/utils/timeManagement";
import { supabase } from "@/lib/supabase";
import CipherInfoModal from "./CipherInfoModal";

// Types for assignment questions
interface AssignmentQuestion {
  id?: string;
  question_text?: string;
  question_type?: string;
  parameters?: CodebustersParams;
  quote?: string;
  author?: string;
  cipherType?: string;
  difficulty?: number | string;
  division?: string;
  charLength?: number;
  encrypted?: string;
  key?: string;
  hint?: string;
  solution?: string | Record<string, string>;
  correct_answer?: string;
}

interface CodebustersParams {
  questionCount: number;
  charLengthMin: number;
  charLengthMax: number;
  division?: string;
  cipherTypes?: string[];
}
import {
  encryptAffine,
  encryptAtbash,
  encryptBaconian,
  encryptCaesar,
  encryptCheckerboard,
  encryptColumnarTransposition,
  encryptCryptarithm,
  encryptFractionatedMorse,
  encryptHill2x2,
  encryptHill3x3,
  k1Aristo as encryptK1Aristocrat,
  k1Patri as encryptK1Patristocrat,
  k1Xeno as encryptK1Xenocrypt,
  k2Aristo as encryptK2Aristocrat,
  k2Patri as encryptK2Patristocrat,
  k2Xeno as encryptK2Xenocrypt,
  k3Aristo as encryptK3Aristocrat,
  k3Patri as encryptK3Patristocrat,
  k3Xeno as encryptK3Xenocrypt,
  encryptNihilist,
  encryptPorta,
  encryptRandomAristocrat,
  encryptRandomPatristocrat,
  encryptRandomXenocrypt,
} from "./cipher-utils";
import { loadQuestionsFromDatabase } from "./services/questionLoader";
import type { CipherResult, QuoteData } from "./types";
import { calculateCipherGrade } from "./utils/gradingUtils";
import { cleanQuote } from "./utils/quoteCleaner";

// Import hooks
import { useAnswerChecking } from "./hooks/useAnswerChecking";
import { useCodebustersState } from "./hooks/useCodebustersState";
import { useHintSystem } from "./hooks/useHintSystem";
import { useProgressCalculation } from "./hooks/useProgressCalculation";
import { useSolutionHandlers } from "./hooks/useSolutionHandlers";

import { FloatingActionButtons } from "@/app/components/FloatingActionButtons";
// Import components
import {
  CodebustersSummary,
  EmptyState,
  Header,
  LoadingState,
  PDFModal,
  PrintConfigModal,
  QuestionCard,
  SubmitButton,
} from "./components";
import { createCodebustersPrintContent } from "./utils/print/content";
import {
  createCodebustersAnswerKey,
  formatCodebustersQuestionsForPrint,
} from "./utils/print/formatQuestions";
import { setupCodebustersPrintWindow } from "./utils/print/setupWindow";
import { createCodebustersPrintStyles } from "./utils/print/styles";

// Helper function to check if cipher type is substitution (moved outside component to reduce complexity)
const isSubstitutionCipher = (cipherType: string | undefined): boolean => {
  const substitutionTypes = [
    "K1 Aristocrat",
    "K2 Aristocrat",
    "K3 Aristocrat",
    "K1 Patristocrat",
    "K2 Patristocrat",
    "K3 Patristocrat",
    "Random Aristocrat",
    "Random Patristocrat",
    "Caesar",
    "Atbash",
    "Affine",
    "Xenocrypt",
  ];
  return substitutionTypes.includes(cipherType || "");
};

// Extract action buttons component to reduce complexity
const CodebustersActionButtons = ({
  darkMode,
  isOffline,
  quotesLength,
  onReset,
  onPrint,
  onShare,
}: {
  darkMode: boolean;
  isOffline: boolean;
  quotesLength: number;
  onReset: () => void;
  onPrint: () => void;
  onShare: () => void;
}) => (
  <div className="flex justify-between items-center mb-4">
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={onReset}
        title="Reset Test"
        className={`flex items-center transition-all duration-200 ${
          darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-label="Reset icon"
        >
          <title>Reset icon</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span className="text-sm">Reset</span>
      </button>
      <button
        type="button"
        onClick={onPrint}
        disabled={isOffline || quotesLength === 0}
        title={isOffline ? "Print feature not available offline" : "Print Test"}
        className={`flex items-center transition-all duration-200 ${
          isOffline || quotesLength === 0
            ? "text-gray-400 cursor-not-allowed"
            : darkMode
              ? "text-gray-400 hover:text-gray-300"
              : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-label="Print icon"
        >
          <title>Print icon</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
          />
        </svg>
        <span className="text-sm">Print</span>
      </button>
    </div>
    <button
      type="button"
      onClick={onShare}
      disabled={isOffline}
      title={isOffline ? "Share feature not available offline" : "Share Test"}
    >
      <div
        className={`flex items-center transition-all duration-200 ${
          isOffline ? "text-gray-400 cursor-not-allowed" : "text-blue-400 hover:text-blue-500"
        }`}
      >
        <FaShareAlt className="transition-all duration-500 mr-2" />
        <span className="text-sm">Take together</span>
      </div>
    </button>
  </div>
);

// Extract questions list component to reduce complexity
const CodebustersQuestionsList = ({
  quotes,
  darkMode,
  isTestSubmitted,
  activeHints,
  getHintContent,
  handleHintClick,
  setSelectedCipherType,
  setInfoModalOpen,
  handleSolutionChange,
  handleBaconianSolutionChange,
  handleHillSolutionChange,
  handleNihilistSolutionChange,
  handleCheckerboardSolutionChange,
  handleCryptarithmSolutionChange,
  handleKeywordSolutionChange,
  hintedLetters,
  _hintCounts,
}: {
  quotes: QuoteData[];
  darkMode: boolean;
  isTestSubmitted: boolean;
  activeHints: { [questionIndex: number]: boolean };
  getHintContent: (quote: QuoteData) => string;
  handleHintClick: (questionIndex: number) => void;
  setSelectedCipherType: (type: string) => void;
  setInfoModalOpen: (open: boolean) => void;
  handleSolutionChange: (quoteIndex: number, cipherLetter: string, plainLetter: string) => void;
  handleBaconianSolutionChange: (quoteIndex: number, position: number, plainLetter: string) => void;
  handleHillSolutionChange: (
    quoteIndex: number,
    type: "matrix" | "plaintext",
    value: string[][] | { [key: number]: string }
  ) => void;
  handleNihilistSolutionChange: (quoteIndex: number, position: number, plainLetter: string) => void;
  handleCheckerboardSolutionChange: (
    quoteIndex: number,
    position: number,
    plainLetter: string
  ) => void;
  handleCryptarithmSolutionChange: (
    quoteIndex: number,
    position: number,
    plainLetter: string
  ) => void;
  handleKeywordSolutionChange: (quoteIndex: number, keyword: string) => void;
  hintedLetters: { [questionIndex: number]: { [letter: string]: boolean } };
  _hintCounts: { [questionIndex: number]: number };
}) => {
  const quotesWithPositions = quotes.map((item, position) => ({ item, position }));
  return (
    <>
      {quotesWithPositions.map(({ item, position }) => (
        <QuestionCard
          key={`question-${position}-${item.cipherType || ""}-${item.quote?.substring(0, 10) || ""}`}
          item={item}
          index={position}
          darkMode={darkMode}
          isTestSubmitted={isTestSubmitted}
          quotes={quotes}
          activeHints={activeHints}
          getHintContent={getHintContent}
          handleHintClick={handleHintClick}
          setSelectedCipherType={setSelectedCipherType}
          setInfoModalOpen={setInfoModalOpen}
          handleSolutionChange={handleSolutionChange}
          handleBaconianSolutionChange={handleBaconianSolutionChange}
          handleHillSolutionChange={handleHillSolutionChange}
          handleNihilistSolutionChange={handleNihilistSolutionChange}
          handleCheckerboardSolutionChange={handleCheckerboardSolutionChange}
          handleCryptarithmSolutionChange={handleCryptarithmSolutionChange}
          handleKeywordSolutionChange={handleKeywordSolutionChange}
          hintedLetters={hintedLetters}
          _hintCounts={_hintCounts}
        />
      ))}
    </>
  );
};

export default function CodeBusters() {
  const { darkMode } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOffline, setIsOffline] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [tournamentName, setTournamentName] = useState("");
  const [questionPoints, setQuestionPoints] = useState<{ [key: number]: number }>({});

  // Check for assignment parameter in URL
  const assignmentId = searchParams.get("assignment");

  // Detect offline status - extracted to reduce complexity
  useEffect(() => {
    const updateOnline = () => setIsOffline(!navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  // Use custom hooks for state management
  const {
    quotes,
    setQuotes,
    isTestSubmitted,
    setIsTestSubmitted,
    setTestScore,
    timeLeft,
    setTimeLeft,
    isLoading,
    setIsLoading,
    error,
    setError,
    showPDFViewer,
    setShowPDFViewer,
    shareModalOpen,
    setShareModalOpen,
    inputCode,
    setInputCode,

    hasAttemptedLoad,
    activeHints,
    setActiveHints,
    revealedLetters,
    setRevealedLetters,
    hintedLetters,
    setHintedLetters,
    hintCounts,
    setHintCounts,
    infoModalOpen,
    setInfoModalOpen,
    selectedCipherType,
    setSelectedCipherType,
    loadPreferences,
  } = useCodebustersState(assignmentId);

  // Use custom hooks for functionality
  const {
    checkSubstitutionAnswer,
    checkHillAnswer,
    checkPortaAnswer,
    checkBaconianAnswer,
    checkCheckerboardAnswer,
  } = useAnswerChecking(quotes);
  const { getHintContent, handleHintClick } = useHintSystem(
    quotes,
    activeHints,
    setActiveHints,
    revealedLetters,
    setRevealedLetters,
    setQuotes,
    hintedLetters,
    setHintedLetters,
    hintCounts,
    setHintCounts
  );
  const {
    handleSolutionChange,
    handleBaconianSolutionChange,
    handleHillSolutionChange,
    handleNihilistSolutionChange,
    handleCheckerboardSolutionChange,
    handleKeywordSolutionChange,
    handleCryptarithmSolutionChange,
  } = useSolutionHandlers(quotes, setQuotes);
  const { totalProgress, calculateQuoteProgress } = useProgressCalculation(quotes);

  // Extract initialization effects to reduce complexity
  useEffect(() => {
    const cleanup = setupVisibilityHandling();
    try {
      resumeFromPause();
    } catch {
      // Ignore errors when resuming from pause
    }
    return () => {
      cleanup();
      try {
        pauseTestSession();
      } catch {
        // Ignore errors when pausing session on unmount
      }
    };
  }, []);

  // Helper function to check if a quote answer is correct (extracted to reduce complexity)
  const checkQuoteCorrectness = useCallback(
    (quote: QuoteData, index: number): boolean => {
      if (isSubstitutionCipher(quote.cipherType)) {
        return checkSubstitutionAnswer(index);
      }
      if (quote.cipherType === "Hill 2x2" || quote.cipherType === "Hill 3x3") {
        return checkHillAnswer(index);
      }
      if (quote.cipherType === "Porta") {
        return checkPortaAnswer(index);
      }
      if (quote.cipherType === "Baconian") {
        return checkBaconianAnswer(index);
      }
      if (quote.cipherType === "Checkerboard") {
        return checkCheckerboardAnswer(index);
      }
      return false;
    },
    [
      checkSubstitutionAnswer,
      checkHillAnswer,
      checkPortaAnswer,
      checkBaconianAnswer,
      checkCheckerboardAnswer,
    ]
  );

  // Helper function to submit assignment results (extracted to reduce complexity)
  const submitAssignmentResults = useCallback(
    async (
      assignmentId: string,
      quotes: QuoteData[],
      score: number,
      codebustersPoints: {
        totalPointsEarned: number;
        totalPointsAttempted: number;
        totalInputs: number;
      },
      checkQuoteCorrectnessFn: (quote: QuoteData, index: number) => boolean,
      calculateQuoteProgressFn: (quote: QuoteData) => number
    ) => {
      try {
        // Prepare submission data
        const submissionData = {
          assignmentId: assignmentId,
          answers: quotes.map((quote: QuoteData, index: number) => ({
            questionId: quote.id,
            answer: quote.solution || "",
            isCorrect: checkQuoteCorrectnessFn(quote, index),
            points: quote.points || 10,
            timeSpent: 0, // Could track time per question if needed
            // Add progress and difficulty for proper point calculation
            progress: calculateQuoteProgressFn(quote),
            difficulty: typeof quote.difficulty === "number" ? quote.difficulty : 0.5,
          })),
          totalScore: score,
          timeSpent: 0, // Could track total time if needed
          submittedAt: new Date().toISOString(),
          isDynamicCodebusters: true, // Flag to indicate this is a dynamic Codebusters assignment
          // Send the exact same values as the test summary
          codebustersPoints: codebustersPoints,
        };

        const response = await fetch(`/api/assignments/${assignmentId}/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(submissionData),
        });

        if (response.ok) {
          toast.success("Assignment submitted successfully!");

          // Remove assignment query parameter from URL after successful submission
          const url = new URL(window.location.href);
          url.searchParams.delete("assignment");
          window.history.replaceState({}, "", url.pathname + url.search);
        } else {
          toast.error("Failed to submit assignment");
        }
      } catch (_error) {
        toast.error("Error submitting assignment");
      }
    },
    []
  );

  // Extract score calculation to reduce complexity
  const calculateTestScore = useCallback((): number => {
    let correctCount = 0;
    quotes.forEach((quote: QuoteData, index: number) => {
      if (checkQuoteCorrectness(quote, index)) {
        correctCount++;
      }
    });
    return (correctCount / Math.max(1, quotes.length)) * 100;
  }, [quotes, checkQuoteCorrectness]);

  // Extract points calculation to reduce complexity
  const calculateCodebustersPoints = useCallback(() => {
    let totalPointsEarned = 0;
    let totalPointsAttempted = 0;
    let totalInputs = 0;
    quotes.forEach((quote: QuoteData, quoteIndex: number) => {
      const gradeResult = calculateCipherGrade(quote, quoteIndex, {}, {});
      totalPointsEarned += gradeResult.score;
      totalPointsAttempted += gradeResult.attemptedScore;
      totalInputs += gradeResult.totalInputs;
    });
    return {
      totalPointsEarned: Math.round(totalPointsEarned),
      totalPointsAttempted: Math.round(totalPointsAttempted),
      totalInputs: totalInputs,
    };
  }, [quotes]);

  // Extract metrics update to reduce complexity
  const updateUserMetrics = useCallback(
    async (codebustersPoints: {
      totalPointsEarned: number;
      totalPointsAttempted: number;
      totalInputs: number;
    }) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        await updateMetrics(user?.id || null, {
          questionsAttempted: Math.round(codebustersPoints.totalPointsAttempted),
          correctAnswers: Math.round(codebustersPoints.totalPointsEarned),
          eventName: "Codebusters",
        });
      } catch {
        // Ignore errors when saving test state
      }
    },
    []
  );

  // Handle test submission
  const handleSubmitTest = useCallback(async () => {
    const score = calculateTestScore();
    setTestScore(score);
    setIsTestSubmitted(true);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 200);
    markTestSubmitted();
    const codebustersPoints = calculateCodebustersPoints();
    await updateUserMetrics(codebustersPoints);
    if (assignmentId) {
      await submitAssignmentResults(
        assignmentId,
        quotes,
        score,
        codebustersPoints,
        checkQuoteCorrectness,
        calculateQuoteProgress
      );
    }
  }, [
    calculateTestScore,
    setTestScore,
    setIsTestSubmitted,
    calculateCodebustersPoints,
    updateUserMetrics,
    assignmentId,
    quotes,
    checkQuoteCorrectness,
    calculateQuoteProgress,
    submitAssignmentResults,
  ]);

  // Extract time warning logic to reduce complexity
  const showTimeWarnings = useCallback((time: number) => {
    if (time === 300) {
      toast.warning("Warning: Five minutes left");
    } else if (time === 60) {
      toast.warning("Warning: One minute left");
    } else if (time === 30) {
      toast.warning("Warning: Thirty seconds left");
    }
  }, []);

  // Extract timer update logic to reduce complexity
  const updateTimer = useCallback(() => {
    const session = getCurrentTestSession();
    if (!session) {
      return;
    }
    if (
      session.timeState.isTimeSynchronized &&
      session.timeState.syncTimestamp &&
      session.timeState.originalTimeAtSync
    ) {
      const now = Date.now();
      const elapsedMs = now - session.timeState.syncTimestamp;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const newTimeLeft = Math.max(0, session.timeState.originalTimeAtSync - elapsedSeconds);
      setTimeLeft(newTimeLeft);
      updateTimeLeft(newTimeLeft);
    } else if (!session.timeState.isPaused) {
      const newTimeLeft = Math.max(0, (session.timeState.timeLeft || 0) - 1);
      setTimeLeft(newTimeLeft);
      updateTimeLeft(newTimeLeft);
    }
  }, [setTimeLeft]);

  // Handle time management
  useEffect(() => {
    if (timeLeft === null || isTestSubmitted) {
      return;
    }
    if (timeLeft === 0) {
      handleSubmitTest();
      return;
    }
    showTimeWarnings(timeLeft);
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isTestSubmitted, handleSubmitTest, showTimeWarnings, updateTimer]);

  // Helper functions to reduce complexity
  const setAssignmentTimeLimit = useCallback(
    (assignment: { time_limit_minutes?: number }) => {
      const timeLimit = assignment.time_limit_minutes || 15;
      setTimeLeft(timeLimit * 60);
    },
    [setTimeLeft]
  );

  // Helper function to encrypt quote based on cipher type (extracted to reduce complexity)
  const encryptQuoteByType = useCallback(
    (cipherType: string, cleanedQuote: string): CipherResult => {
      const cipherMap: Record<string, (quote: string) => CipherResult> = {
        "K1 Aristocrat": encryptK1Aristocrat,
        "K2 Aristocrat": encryptK2Aristocrat,
        "K3 Aristocrat": encryptK3Aristocrat,
        "K1 Patristocrat": encryptK1Patristocrat,
        "K2 Patristocrat": encryptK2Patristocrat,
        "K3 Patristocrat": encryptK3Patristocrat,
        "Random Aristocrat": encryptRandomAristocrat,
        "Random Patristocrat": encryptRandomPatristocrat,
        Caesar: encryptCaesar,
        Atbash: encryptAtbash,
        Affine: encryptAffine,
        "Hill 2x2": encryptHill2x2,
        "Hill 3x3": encryptHill3x3,
        Porta: encryptPorta,
        Baconian: encryptBaconian,
        Nihilist: encryptNihilist,
        "Fractionated Morse": encryptFractionatedMorse,
        "Complete Columnar": encryptColumnarTransposition,
        "Random Xenocrypt": encryptRandomXenocrypt,
        "K1 Xenocrypt": encryptK1Xenocrypt,
        "K2 Xenocrypt": encryptK2Xenocrypt,
        "K3 Xenocrypt": encryptK3Xenocrypt,
        Checkerboard: encryptCheckerboard,
        Cryptarithm: encryptCryptarithm,
      };
      const encryptFunction = cipherMap[cipherType] || encryptCaesar;
      return encryptFunction(cleanedQuote);
    },
    []
  );

  // Extract question creation logic to reduce complexity
  const createQuestionFromQuote = useCallback(
    (
      quote: { quote: string; author: string },
      cipherType: string,
      cipherResult: CipherResult,
      index: number,
      division: string
    ): QuoteData => {
      return {
        id: `assignment-${index}`,
        author: quote.author,
        quote: quote.quote,
        encrypted: cipherResult.encrypted,
        cipherType: cipherType as QuoteData["cipherType"],
        difficulty: 0.5,
        division: division,
        charLength: quote.quote.length,
        key: cipherResult.key || "",
        hint: "",
        solution: {},
        points: 10,
        ...(cipherResult.matrix && { matrix: cipherResult.matrix }),
        ...(cipherResult.keyword && { portaKeyword: cipherResult.keyword }),
        ...(cipherResult.shift && { caesarShift: cipherResult.shift }),
        ...(cipherResult.a &&
          cipherResult.b && { affineA: cipherResult.a, affineB: cipherResult.b }),
        ...(cipherResult.fractionationTable && {
          fractionationTable: cipherResult.fractionationTable,
        }),
      };
    },
    []
  );

  // Generate Codebusters questions from assignment parameters
  const generateCodebustersQuestionsFromParams = useCallback(
    async (params: CodebustersParams): Promise<QuoteData[]> => {
      const quotesResponse = await fetch(
        `/api/quotes?language=en&limit=${params.questionCount * 2}&charLengthMin=${params.charLengthMin}&charLengthMax=${params.charLengthMax}`
      );
      if (!quotesResponse.ok) {
        throw new Error("Failed to fetch quotes");
      }
      const quotesData = await quotesResponse.json();
      const quotes = quotesData.data?.quotes || quotesData.quotes || [];
      if (quotes.length === 0) {
        throw new Error("No quotes available");
      }
      const generatedQuestions: QuoteData[] = [];
      const cipherTypes = params.cipherTypes || ["Caesar"];
      for (let i = 0; i < params.questionCount; i++) {
        const quote = quotes[i % quotes.length];
        if (!quote?.quote) {
          continue;
        }
        const cipherType = cipherTypes[i % cipherTypes.length];
        if (!cipherType) {
          continue;
        }
        const cleanedQuote = cleanQuote(quote.quote);
        const cipherResult = encryptQuoteByType(cipherType, cleanedQuote);
        const division = params.division || "C";
        if (!division) {
          continue;
        }
        const question = createQuestionFromQuote(quote, cipherType, cipherResult, i, division);
        generatedQuestions.push(question);
      }
      return generatedQuestions;
    },
    [encryptQuoteByType, createQuestionFromQuote]
  );

  const handleParamsBasedQuestions = useCallback(
    async (
      paramsQuestion: AssignmentQuestion,
      assignment: { time_limit_minutes?: number }
    ): Promise<boolean> => {
      try {
        if (!paramsQuestion.parameters) {
          return false;
        }
        const generatedQuestions = await generateCodebustersQuestionsFromParams(
          paramsQuestion.parameters
        );
        setQuotes(generatedQuestions);
        setAssignmentTimeLimit(assignment);
        setIsLoading(false);
        return true;
      } catch (_error) {
        setError("Failed to generate questions for this assignment");
        setIsLoading(false);
        return false;
      }
    },
    [
      setQuotes,
      setAssignmentTimeLimit,
      setIsLoading,
      setError,
      generateCodebustersQuestionsFromParams,
    ]
  );

  const handlePreGeneratedQuestions = useCallback(
    (questions: AssignmentQuestion[], assignment: { time_limit_minutes?: number }): void => {
      const codebustersQuotes: QuoteData[] = questions.map(
        (q: AssignmentQuestion, index: number) => ({
          id: q.id || `assignment-${index}`,
          quote: q.quote || q.question_text || "",
          author: q.author || "Unknown",
          cipherType: (q.cipherType || "Random Aristocrat") as QuoteData["cipherType"],
          difficulty: typeof q.difficulty === "number" ? q.difficulty : undefined,
          division: q.division || "C",
          charLength: q.charLength || 100,
          encrypted: q.encrypted || "",
          key: q.key || "",
          hint: q.hint || "",
          solution:
            typeof q.solution === "object" && q.solution !== null
              ? (q.solution as { [key: string]: string })
              : typeof q.correct_answer === "object" && q.correct_answer !== null
                ? (q.correct_answer as { [key: string]: string })
                : undefined,
        })
      );
      setQuotes(codebustersQuotes);
      setAssignmentTimeLimit(assignment);
      setIsLoading(false);
    },
    [setQuotes, setAssignmentTimeLimit, setIsLoading]
  );

  // Handle loading assignment questions
  const handleLoadAssignmentQuestions = useCallback(
    async (assignmentId: string) => {
      try {
        const response = await fetch(`/api/assignments/${assignmentId}`);
        if (!response.ok) {
          setError("Failed to load assignment");
          setIsLoading(false);
          return;
        }
        const data = await response.json();
        const assignment = data.assignment;
        const questions = assignment.questions;
        if (!questions || questions.length === 0) {
          setError("No questions found in this assignment");
          setIsLoading(false);
          return;
        }
        const paramsQuestion = questions.find(
          (q: AssignmentQuestion) => q.question_type === "codebusters_params"
        );
        if (paramsQuestion?.parameters) {
          await handleParamsBasedQuestions(paramsQuestion, assignment);
          return;
        }
        handlePreGeneratedQuestions(questions, assignment);
      } catch (_error) {
        setError("Failed to load assignment");
        setIsLoading(false);
      }
    },
    [setError, setIsLoading, handleParamsBasedQuestions, handlePreGeneratedQuestions]
  );

  // Handle loading questions from database
  const handleLoadQuestions = useCallback(async () => {
    await loadQuestionsFromDatabase(
      setIsLoading,
      setError,
      setQuotes,
      setTimeLeft,
      setIsTestSubmitted,
      setTestScore,
      loadPreferences
    );
  }, [
    setIsLoading,
    setError,
    setQuotes,
    setTimeLeft,
    setIsTestSubmitted,
    setTestScore,
    loadPreferences,
  ]);

  // Extract localStorage clearing logic to reduce complexity
  const clearCodebustersStorage = useCallback(() => {
    const itemsToRemove = [
      "codebustersQuotes",
      "codebustersQuoteIndices",
      "codebustersQuoteUUIDs",
      "codebustersShareData",
      "codebustersIsTestSubmitted",
      "codebustersTestScore",
      "codebustersTimeLeft",
      "codebustersRevealedLetters",
      "codebustersHintedLetters",
      "codebustersHintCounts",
      "shareCode",
    ];
    for (const item of itemsToRemove) {
      SyncLocalStorage.removeItem(item);
    }
    SyncLocalStorage.setItem("codebustersForceRefresh", "true");
  }, []);

  // Extract reset state updates to reduce complexity
  const resetTestState = useCallback(
    (timeLimit: number) => {
      setIsResetting(true);
      setIsTestSubmitted(false);
      setTestScore(0);
      setTimeLeft(timeLimit * 60);
      setActiveHints({});
      setRevealedLetters({});
      setHintedLetters({});
      setHintCounts({});
    },
    [
      setIsTestSubmitted,
      setTestScore,
      setTimeLeft,
      setActiveHints,
      setRevealedLetters,
      setHintedLetters,
      setHintCounts,
    ]
  );

  // Handle reset functionality
  const handleReset = useCallback(() => {
    const testParams = JSON.parse(SyncLocalStorage.getItem("testParams") || "{}");
    const eventName = testParams.eventName || "Codebusters";
    const preferences = loadPreferences(eventName);
    const timeLimit = Number.parseInt(testParams.timeLimit) || preferences.timeLimit;
    clearCodebustersStorage();
    clearTestSession();
    initializeTestSession(eventName, timeLimit, false);
    resetTestState(timeLimit);
    const customSetLoading = (loading: boolean) => {
      if (!loading) {
        setIsLoading(false);
      }
    };
    const customSetQuotes = (newQuotes: QuoteData[]) => {
      setQuotes(newQuotes);
      setIsResetting(false);
    };
    loadQuestionsFromDatabase(
      customSetLoading,
      setError,
      customSetQuotes,
      setTimeLeft,
      setIsTestSubmitted,
      setTestScore,
      loadPreferences
    );
  }, [
    loadPreferences,
    clearCodebustersStorage,
    resetTestState,
    setQuotes,
    setIsLoading,
    setError,
    setTimeLeft,
    setIsTestSubmitted,
    setTestScore,
  ]);

  // Handle back navigation: preserve Codebusters progress for resume banner on Practice
  const handleBack = useCallback(() => {
    try {
      // Ensure timer is paused when exiting
      pauseTestSession();
      // Only clear unrelated unlimited cache; keep Codebusters keys and testParams so Practice can detect progress
      SyncLocalStorage.removeItem("unlimitedQuestions");
    } catch {
      // Ignore errors when clearing cache
    }
    router.push("/practice");
  }, [router]);

  // Handle retry loading
  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    handleLoadQuestions();
  }, [setError, setIsLoading, handleLoadQuestions]);

  // Handle navigation to practice page
  const handleGoToPractice = useCallback(() => {
    router.push("/practice");
  }, [router]);

  // Handle print configuration
  const handlePrintConfig = () => {
    setPrintModalOpen(true);
  };

  // Extract print content creation to reduce complexity
  const createPrintContent = useCallback(() => {
    const getStylesheets = () => "";
    const printStyles = createCodebustersPrintStyles(getStylesheets);
    const questionsHtml =
      formatCodebustersQuestionsForPrint(quotes, questionPoints) +
      createCodebustersAnswerKey(quotes);
    return createCodebustersPrintContent(
      {
        tournamentName,
        questionsHtml,
        questionPoints,
      },
      printStyles
    );
  }, [quotes, questionPoints, tournamentName]);

  // Handle actual printing
  const handleActualPrint = useCallback(async () => {
    if (!tournamentName.trim()) {
      toast.error("Tournament name is required");
      return;
    }
    try {
      const printContent = createPrintContent();
      await setupCodebustersPrintWindow(printContent);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to print test");
    }
    setPrintModalOpen(false);
  }, [tournamentName, createPrintContent]);

  // Handle test reset after submission
  const handleTestReset = useCallback(() => {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 200);
    handleReset();
  }, [handleReset]);

  // Load questions if needed
  useEffect(() => {
    if (hasAttemptedLoad && quotes.length === 0 && !isLoading && !error) {
      if (assignmentId) {
        handleLoadAssignmentQuestions(assignmentId);
      } else {
        handleLoadQuestions();
      }
    }
  }, [
    hasAttemptedLoad,
    quotes.length,
    isLoading,
    error,
    handleLoadQuestions,
    handleLoadAssignmentQuestions,
    assignmentId,
  ]);

  return (
    <>
      <MainHeader />
      <div className="relative min-h-screen">
        {/* Background */}
        <div className={`absolute inset-0 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`} />

        {/* Global scrollbar theme is centralized in globals.css */}

        {/* Page Content */}
        <div className="relative flex flex-col items-center p-3 md:p-6 pt-24 md:pt-24">
          <Header darkMode={darkMode} timeLeft={timeLeft} isTestSubmitted={isTestSubmitted} />

          {/* Inline back link to Practice */}
          <div className="w-full max-w-[90vw] md:max-w-6xl mt-0 mb-3">
            <button
              type="button"
              onClick={handleBack}
              className={`group inline-flex items-center text-base font-medium ${darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}
            >
              <span className="transition-transform duration-200 group-hover:-translate-x-1">
                ←
              </span>
              <span className="ml-2">Go back</span>
            </button>
          </div>

          {/* Progress Bar or Summary */}
          {isTestSubmitted ? (
            <div className="w-full">
              <CodebustersSummary
                quotes={quotes}
                darkMode={darkMode}
                hintedLetters={hintedLetters}
                _hintCounts={hintCounts}
              />
            </div>
          ) : (
            <div
              className={
                "sticky top-4 z-10 w-full max-w-[90vw] md:max-w-6xl bg-white border-2 border-gray-300 rounded-full h-5 mb-6 shadow-lg"
              }
            >
              <div
                className="bg-blue-500 h-4 rounded-full transition-[width] duration-700 ease-in-out shadow-md"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
          )}

          <main
            className={`w-full max-w-[90vw] md:max-w-6xl rounded-lg shadow-md p-3 md:p-6 mt-4 ${
              darkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <LoadingState
              isLoading={isLoading && !isResetting}
              error={error}
              darkMode={darkMode}
              onRetry={handleRetry}
              onGoToPractice={handleGoToPractice}
            />

            <EmptyState
              darkMode={darkMode}
              hasAttemptedLoad={hasAttemptedLoad}
              isLoading={isLoading && !isResetting}
              error={error}
              quotes={quotes}
            />

            {/* Action buttons - positioned right above questions */}
            {!(isLoading || error) && quotes.length > 0 && hasAttemptedLoad && (
              <CodebustersActionButtons
                darkMode={darkMode}
                isOffline={isOffline}
                quotesLength={quotes.length}
                onReset={handleReset}
                onPrint={handlePrintConfig}
                onShare={() => setShareModalOpen(true)}
              />
            )}

            {!(isLoading || error) && hasAttemptedLoad && quotes.length > 0 && (
              <CodebustersQuestionsList
                quotes={quotes}
                darkMode={darkMode}
                isTestSubmitted={isTestSubmitted}
                activeHints={activeHints}
                getHintContent={getHintContent}
                handleHintClick={handleHintClick}
                setSelectedCipherType={setSelectedCipherType}
                setInfoModalOpen={setInfoModalOpen}
                handleSolutionChange={handleSolutionChange}
                handleBaconianSolutionChange={handleBaconianSolutionChange}
                handleHillSolutionChange={handleHillSolutionChange}
                handleNihilistSolutionChange={handleNihilistSolutionChange}
                handleCheckerboardSolutionChange={handleCheckerboardSolutionChange}
                handleCryptarithmSolutionChange={handleCryptarithmSolutionChange}
                handleKeywordSolutionChange={handleKeywordSolutionChange}
                hintedLetters={hintedLetters}
                _hintCounts={hintCounts}
              />
            )}

            {/* Submit Button */}
            {!(isLoading || error) && quotes.length > 0 && hasAttemptedLoad && !isResetting && (
              <SubmitButton
                isTestSubmitted={isTestSubmitted}
                darkMode={darkMode}
                onSubmit={handleSubmitTest}
                onReset={handleTestReset}
                onGoBack={handleGoToPractice}
                isAssignment={!!assignmentId}
              />
            )}
          </main>

          {/* Floating Action Buttons */}
          <FloatingActionButtons
            darkMode={darkMode}
            showReferenceButton={true}
            onShowReference={() => setShowPDFViewer(true)}
            eventName="Codebusters"
          />

          {/* Custom PDF Modal */}
          <PDFModal
            showPDFViewer={showPDFViewer}
            darkMode={darkMode}
            onClose={() => setShowPDFViewer(false)}
          />

          {/* Share Modal */}
          <ShareModal
            isOpen={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
            inputCode={inputCode}
            setInputCode={setInputCode}
            darkMode={darkMode}
            isCodebusters={true}
            encryptedQuotes={quotes}
          />

          {/* Cipher Info Modal */}
          <CipherInfoModal
            isOpen={infoModalOpen}
            onClose={() => setInfoModalOpen(false)}
            cipherType={selectedCipherType}
            darkMode={darkMode}
          />

          {/* Print Configuration Modal */}
          <PrintConfigModal
            isOpen={printModalOpen}
            onClose={() => setPrintModalOpen(false)}
            onPrint={handleActualPrint}
            quotes={quotes}
            tournamentName={tournamentName}
            setTournamentName={setTournamentName}
            questionPoints={questionPoints}
            setQuestionPoints={setQuestionPoints}
            darkMode={darkMode}
          />
        </div>
      </div>

      {/* Global ToastContainer handles notifications */}
    </>
  );
}
