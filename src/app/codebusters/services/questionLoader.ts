import type { QuoteData } from "@/app/codebusters/types";
import { getCustomWordBank, setCustomWordBank } from "@/app/codebusters/utils/common";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import logger from "@/lib/utils/logger";
import { getAvailableCipherTypes, mapSubtopicsToCipherTypes } from "./utils/cipherMapping";
import { encryptQuoteByType } from "./utils/encryptionMapping";
import { createQuestionFromQuote, selectQuoteForCipher } from "./utils/questionCreation";
import { loadQuotesForQuestions } from "./utils/quoteLoading";

// Extract restoration logic to reduce complexity
function restoreSubmittedTest(
  setQuotes: (quotes: QuoteData[]) => void,
  setIsTestSubmitted: (submitted: boolean) => void,
  setTestScore: (score: number | null) => void,
  setTimeLeft: (time: number) => void,
  setIsLoading: (loading: boolean) => void
): boolean {
  const testAlreadySubmitted = SyncLocalStorage.getItem("codebustersIsTestSubmitted") === "true";
  const existingQuotes = SyncLocalStorage.getItem("codebustersQuotes");
  if (testAlreadySubmitted && existingQuotes) {
    try {
      const restored = JSON.parse(existingQuotes);
      setIsTestSubmitted(true);
      const savedTestScore = SyncLocalStorage.getItem("codebustersTestScore");
      const savedTimeLeft = SyncLocalStorage.getItem("codebustersTimeLeft");
      setTestScore(savedTestScore ? Number.parseFloat(savedTestScore) : 0);
      setTimeLeft(savedTimeLeft ? Number.parseInt(savedTimeLeft) : 0);
      setQuotes(restored);
      setIsLoading(false);
      return true;
    } catch (e) {
      logger.error("Failed to restore submitted test, continuing with fresh load", e);
    }
  }
  return false;
}

// Extract quote processing logic to reduce complexity
const processQuotesIntoQuestions = (
  questionCipherTypes: QuoteData["cipherType"][],
  englishQuotes: Array<{ id: string; author: string; quote: string }>,
  spanishQuotes: Array<{ id: string; author: string; quote: string }>,
  questionCount: number
): {
  processedQuotes: QuoteData[];
  quoteUuiDs: Array<{ id: string; language: string; cipherType: string }>;
} => {
  const processedQuotes: QuoteData[] = [];
  const quoteUuiDs: Array<{ id: string; language: string; cipherType: string }> = [];
  let englishQuoteIndex = 0;
  let spanishQuoteIndex = 0;

  const availableEnglishQuotes = englishQuotes.length;
  const availableSpanishQuotes = spanishQuotes.length;
  const actualQuestionCount = Math.min(
    questionCount,
    availableEnglishQuotes + availableSpanishQuotes
  );

  if (actualQuestionCount < questionCount) {
    logger.warn(
      `⚠️ Not enough quotes available. Requested ${questionCount} questions, but only ${actualQuestionCount} can be created.`
    );
  }

  for (let i = 0; i < actualQuestionCount; i++) {
    const cipherType = questionCipherTypes[i];
    if (!cipherType) {
      logger.warn(`⚠️ No cipher type at index ${i}. Stopping.`);
      break;
    }

    const normalizedCipherType = cipherType
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    const quoteSelection = selectQuoteForCipher(
      cipherType,
      englishQuotes,
      spanishQuotes,
      englishQuoteIndex,
      spanishQuoteIndex
    );

    if (!quoteSelection) {
      logger.warn(`⚠️ No more quotes available. Stopping at ${i} questions.`);
      break;
    }

    englishQuoteIndex = quoteSelection.newEnglishIndex;
    spanishQuoteIndex = quoteSelection.newSpanishIndex;
    quoteUuiDs.push({
      id: quoteSelection.quoteData.id || "",
      language: quoteSelection.language,
      cipherType,
    });

    const cipherResult = encryptQuoteByType(normalizedCipherType, quoteSelection.quoteData.quote);
    const questionEntry = createQuestionFromQuote(
      quoteSelection.quoteData,
      normalizedCipherType,
      cipherResult
    );
    processedQuotes.push(questionEntry);
  }

  return { processedQuotes, quoteUuiDs };
};

// Extract word bank loading to reduce complexity
const loadWordBankIfNeeded = async (): Promise<void> => {
  try {
    if (!getCustomWordBank()) {
      const resp = await fetch("/words.json");
      if (resp.ok) {
        const words = await resp.json();
        if (Array.isArray(words) && words.length > 0) {
          setCustomWordBank(words);
        }
      }
    }
  } catch {
    // Ignore errors when loading custom word bank
  }
};

// Extract main processing logic to reduce complexity
const processQuestions = async (
  testParams: { [key: string]: unknown },
  loadPreferences: (eventName: string) => { questionCount: number; timeLimit: number },
  setQuotes: (quotes: QuoteData[]) => void,
  setIsLoading: (loading: boolean) => void
): Promise<void> => {
  const eventName = (testParams.eventName as string) || "Codebusters";
  const preferences = loadPreferences(eventName);
  const questionCount =
    Number.parseInt((testParams.questionCount as string) || String(preferences.questionCount)) ||
    preferences.questionCount;
  let cipherTypes = (((testParams.cipherTypes || testParams.subtopics) as string[]) || []).map(
    (type: string) => type.toLowerCase()
  );

  if (testParams.eventName === "Codebusters") {
    cipherTypes = mapSubtopicsToCipherTypes(cipherTypes);
  }

  const division = (testParams.division as string) || "any";
  const availableCipherTypes = getAvailableCipherTypes(cipherTypes, division);

  const questionCipherTypes: QuoteData["cipherType"][] = [];
  for (let i = 0; i < questionCount; i++) {
    const cipherType = availableCipherTypes[
      Math.floor(Math.random() * availableCipherTypes.length)
    ] as QuoteData["cipherType"];
    questionCipherTypes.push(cipherType);
  }

  const xenocryptCount = questionCipherTypes.filter(
    (type) =>
      type === "Random Xenocrypt" ||
      type === "K1 Xenocrypt" ||
      type === "K2 Xenocrypt" ||
      type === "K3 Xenocrypt"
  ).length;
  const nonXenocryptCount = questionCount - xenocryptCount;

  logger.log(
    `🔍 Quote requirements: ${nonXenocryptCount} English, ${xenocryptCount} Spanish, total: ${questionCount}`
  );
  logger.log("🔍 Cipher types:", questionCipherTypes);

  const { englishQuotes, spanishQuotes } = await loadQuotesForQuestions(
    nonXenocryptCount,
    xenocryptCount,
    testParams as { charLengthMin?: number; charLengthMax?: number }
  );

  logger.log(
    `🔍 Quote validation passed: ${englishQuotes.length} English, ${spanishQuotes.length} Spanish quotes available`
  );

  const { processedQuotes, quoteUuiDs } = processQuotesIntoQuestions(
    questionCipherTypes,
    englishQuotes,
    spanishQuotes,
    questionCount
  );

  const shareData = {
    quoteUUIDs: quoteUuiDs,
    processedQuotes: processedQuotes.map((quote) => ({
      author: quote.author,
      quote: quote.quote,
      encrypted: quote.encrypted,
      cipherType: quote.cipherType,
      key: quote.key,
      matrix: quote.matrix,
      decryptionMatrix: quote.decryptionMatrix,
      portaKeyword: quote.portaKeyword,
      nihilistPolybiusKey: quote.nihilistPolybiusKey,
      nihilistCipherKey: quote.nihilistCipherKey,
      checkerboardRowKey: quote.checkerboardRowKey,
      checkerboardColKey: quote.checkerboardColKey,
      checkerboardPolybiusKey: quote.checkerboardPolybiusKey,
      checkerboardUsesIJ: quote.checkerboardUsesIJ,
      blockSize: quote.blockSize,
      columnarKey: quote.columnarKey,
      fractionationTable: quote.fractionationTable,
      caesarShift: quote.caesarShift,
      affineA: quote.affineA,
      affineB: quote.affineB,
      baconianBinaryType: quote.baconianBinaryType,
      cryptarithmData: quote.cryptarithmData,
      difficulty: quote.difficulty,
    })),
  };
  SyncLocalStorage.setItem("codebustersShareData", JSON.stringify(shareData));
  SyncLocalStorage.setItem("codebustersQuotes", JSON.stringify(processedQuotes));

  setQuotes(processedQuotes);
  setIsLoading(false);
};

export const loadQuestionsFromDatabase = async (
  setIsLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  setQuotes: (quotes: QuoteData[]) => void,
  setTimeLeft: (time: number) => void,
  setIsTestSubmitted: (submitted: boolean) => void,
  setTestScore: (score: number | null) => void,
  loadPreferences: (eventName: string) => { questionCount: number; timeLimit: number }
) => {
  logger.log("loadQuestionsFromDatabase called");

  if (
    restoreSubmittedTest(setQuotes, setIsTestSubmitted, setTestScore, setTimeLeft, setIsLoading)
  ) {
    return;
  }

  setIsLoading(true);
  setError(null);

  await loadWordBankIfNeeded();

  try {
    const testParamsStr = SyncLocalStorage.getItem("testParams");
    if (!testParamsStr) {
      setError("No test parameters found. Please configure a test from the practice page.");
      setIsLoading(false);
      return;
    }

    const testParams = JSON.parse(testParamsStr);
    await processQuestions(testParams, loadPreferences, setQuotes, setIsLoading);
  } catch (error) {
    logger.error("Error loading questions from database:", error);
    setError("Failed to load questions from database");
    setIsLoading(false);
  }
};
