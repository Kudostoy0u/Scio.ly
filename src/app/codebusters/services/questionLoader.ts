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
} from "@/app/codebusters/cipher-utils";
import { filterEnabledCiphers } from "@/app/codebusters/config";
import type { CipherResult, QuoteData } from "@/app/codebusters/types";
import { getCustomWordBank, setCustomWordBank } from "@/app/codebusters/utils/common";
import { cleanQuote } from "@/app/codebusters/utils/quoteCleaner";
import { getEventOfflineQuestions } from "@/app/utils/storage";
import SyncLocalStorage from "@/lib/database/localStorage-replacement";
import logger from "@/lib/utils/logger";
import { computeCipherDifficulty } from "./utils/difficulty";
import { isLangObject } from "./utils/langGuards";

// Extract cipher type mapping to reduce complexity
const mapSubtopicsToCipherTypes = (cipherTypes: string[]): string[] => {
  const subtopicToCipherMap: { [key: string]: string } = {
    "k1 aristocrat": "K1 Aristocrat",
    "k2 aristocrat": "K2 Aristocrat",
    "k3 aristocrat": "K3 Aristocrat",
    "k1 patristocrat": "K1 Patristocrat",
    "k2 patristocrat": "K2 Patristocrat",
    "k3 patristocrat": "K3 Patristocrat",
    "misc aristocrat": "Random Aristocrat",
    "misc patristocrat": "Random Patristocrat",
    caesar: "Caesar",
    atbash: "Atbash",
    affine: "Affine",
    hill: "Hill 2x2",
    baconian: "Baconian",
    porta: "Porta",
    nihilist: "Nihilist",
    "fractionated morse": "Fractionated Morse",
    "columnar transposition": "Complete Columnar",
    "random xenocrypt": "Random Xenocrypt",
    "k1 xenocrypt": "K1 Xenocrypt",
    "k2 xenocrypt": "K2 Xenocrypt",
    "k3 xenocrypt": "K3 Xenocrypt",
    checkerboard: "Checkerboard",
    "K1 Aristocrat": "K1 Aristocrat",
    "K2 Aristocrat": "K2 Aristocrat",
    "K3 Aristocrat": "K3 Aristocrat",
    "K1 Patristocrat": "K1 Patristocrat",
    "K2 Patristocrat": "K2 Patristocrat",
    "K3 Patristocrat": "K3 Patristocrat",
    "Misc. Aristocrat": "Random Aristocrat",
    "Misc. Patristocrat": "Random Patristocrat",
    Caesar: "Caesar",
    Atbash: "Atbash",
    Affine: "Affine",
    Hill: "Hill 2x2",
    Baconian: "Baconian",
    Porta: "Porta",
    Nihilist: "Nihilist",
    "Fractionated Morse": "Fractionated Morse",
    "Columnar Transposition": "Complete Columnar",
    "Random Xenocrypt": "Random Xenocrypt",
    "K1 Xenocrypt": "K1 Xenocrypt",
    "K2 Xenocrypt": "K2 Xenocrypt",
    "K3 Xenocrypt": "K3 Xenocrypt",
    Checkerboard: "Checkerboard",
    Cryptarithm: "Cryptarithm",
    aristocrat: "Random Aristocrat",
    patristocrat: "Random Patristocrat",
  };
  return cipherTypes.map((subtopic: string) => subtopicToCipherMap[subtopic] || subtopic);
};

// Extract quote loading from offline storage to reduce complexity
const loadOfflineQuotes = async (
  nonXenocryptCount: number,
  xenocryptCount: number
): Promise<{
  englishQuotes: Array<{ id: string; author: string; quote: string }>;
  spanishQuotes: Array<{ id: string; author: string; quote: string }>;
}> => {
  const stored = await getEventOfflineQuestions("codebusters");
  const storedEn = isLangObject(stored) ? stored.en : Array.isArray(stored) ? stored : [];
  const storedEs = isLangObject(stored) ? stored.es : [];
  const englishQuotes: Array<{ id: string; author: string; quote: string }> = [];
  const spanishQuotes: Array<{ id: string; author: string; quote: string }> = [];
  if (nonXenocryptCount > 0) {
    englishQuotes.push(
      ...(storedEn.length < nonXenocryptCount ? storedEn : storedEn.slice(0, nonXenocryptCount))
    );
  }
  if (xenocryptCount > 0) {
    spanishQuotes.push(
      ...(storedEs.length < xenocryptCount ? storedEs : storedEs.slice(0, xenocryptCount))
    );
  }
  return { englishQuotes, spanishQuotes };
};

// Extract online quote loading to reduce complexity
const loadOnlineQuotes = async (
  nonXenocryptCount: number,
  xenocryptCount: number,
  charLengthParams: string
): Promise<{
  englishQuotes: Array<{ id: string; author: string; quote: string }>;
  spanishQuotes: Array<{ id: string; author: string; quote: string }>;
}> => {
  const englishQuotes: Array<{ id: string; author: string; quote: string }> = [];
  const spanishQuotes: Array<{ id: string; author: string; quote: string }> = [];
  if (nonXenocryptCount > 0) {
    const englishResponse = await fetch(
      `/api/quotes?language=en&limit=${Math.min(nonXenocryptCount, 200)}${charLengthParams}`
    );
    if (englishResponse.ok) {
      const englishData = await englishResponse.json();
      englishQuotes.push(...(englishData.data?.quotes || englishData.quotes || []));
    }
  }
  if (xenocryptCount > 0) {
    const spanishResponse = await fetch(
      `/api/quotes?language=es&limit=${Math.min(xenocryptCount, 200)}${charLengthParams}`
    );
    if (spanishResponse.ok) {
      const spanishData = await spanishResponse.json();
      spanishQuotes.push(...(spanishData.data?.quotes || spanishData.quotes || []));
    }
  }
  return { englishQuotes, spanishQuotes };
};

// Extract quote validation and fallback to reduce complexity
const validateAndFallbackQuotes = async (
  quotes: Array<{ id: string; author: string; quote: string }>,
  requiredCount: number,
  language: "en" | "es",
  testParams: { charLengthMin?: number; charLengthMax?: number }
): Promise<Array<{ id: string; author: string; quote: string }>> => {
  if (quotes.length >= requiredCount) {
    return quotes;
  }
  try {
    const fallbackResponse = await fetch(
      `/api/quotes?language=${language}&limit=${Math.min(requiredCount, 200)}`
    );
    if (fallbackResponse.ok) {
      const fallbackData = await fallbackResponse.json();
      const fallbackQuotes = fallbackData.data?.quotes || fallbackData.quotes || [];
      if (fallbackQuotes.length >= requiredCount) {
        logger.log(
          `✅ Fallback successful: Found ${fallbackQuotes.length} ${language === "en" ? "English" : "Spanish"} quotes without length restrictions`
        );
        return fallbackQuotes;
      }
    }
  } catch {
    // Ignore fallback errors
  }
  const errorMessage = `Not enough ${language === "en" ? "English" : "Spanish"} quotes available. Your character length range (${testParams.charLengthMin || 1}-${testParams.charLengthMax || 100}) is too restrictive. Try expanding the range or reducing the number of questions. Available: ${quotes.length}, needed: ${requiredCount}.`;
  throw new Error(errorMessage);
};

// Extract helper functions to reduce complexity
const isXenocryptCipher = (cipherType: string): boolean => {
  return (
    cipherType === "Random Xenocrypt" ||
    cipherType === "K1 Xenocrypt" ||
    cipherType === "K2 Xenocrypt" ||
    cipherType === "K3 Xenocrypt"
  );
};

const createQuoteData = (
  quote: { id?: string; author: string; quote: string },
  index: number,
  isSpanish: boolean
) => ({
  quote: quote.quote,
  author: quote.author,
  originalIndex: index,
  isSpanish,
  id: quote.id,
});

const selectSpanishQuote = (
  spanishQuotes: Array<{ id: string; author: string; quote: string }>,
  spanishQuoteIndex: number,
  englishQuoteIndex: number
) => {
  if (spanishQuoteIndex >= spanishQuotes.length) {
    return null;
  }
  const spanishQuote = spanishQuotes[spanishQuoteIndex];
  if (!spanishQuote) {
    return null;
  }
  return {
    quoteData: createQuoteData(spanishQuote, spanishQuoteIndex, true),
    newEnglishIndex: englishQuoteIndex,
    newSpanishIndex: spanishQuoteIndex + 1,
    language: "es" as const,
  };
};

const selectEnglishQuote = (
  englishQuotes: Array<{ id: string; author: string; quote: string }>,
  englishQuoteIndex: number,
  spanishQuoteIndex: number
) => {
  if (englishQuoteIndex >= englishQuotes.length) {
    return null;
  }
  const englishQuote = englishQuotes[englishQuoteIndex];
  if (!englishQuote) {
    return null;
  }
  return {
    quoteData: createQuoteData(englishQuote, englishQuoteIndex, false),
    newEnglishIndex: englishQuoteIndex + 1,
    newSpanishIndex: spanishQuoteIndex,
    language: "en" as const,
  };
};

// Extract quote selection logic to reduce complexity
const selectQuoteForCipher = (
  cipherType: string,
  englishQuotes: Array<{ id: string; author: string; quote: string }>,
  spanishQuotes: Array<{ id: string; author: string; quote: string }>,
  englishQuoteIndex: number,
  spanishQuoteIndex: number
): {
  quoteData: {
    quote: string;
    author: string;
    originalIndex: number;
    isSpanish?: boolean;
    id?: string;
  };
  newEnglishIndex: number;
  newSpanishIndex: number;
  language: string;
} | null => {
  if (isXenocryptCipher(cipherType)) {
    return (
      selectSpanishQuote(spanishQuotes, spanishQuoteIndex, englishQuoteIndex) ||
      selectEnglishQuote(englishQuotes, englishQuoteIndex, spanishQuoteIndex)
    );
  }
  return selectEnglishQuote(englishQuotes, englishQuoteIndex, spanishQuoteIndex);
};

// Extract question creation logic to reduce complexity
const createQuestionFromQuote = (
  quoteData: {
    quote: string;
    author: string;
    originalIndex: number;
    isSpanish?: boolean;
    id?: string;
  },
  normalizedCipherType: string,
  cipherResult: CipherResult
): QuoteData => {
  const isK1K2K3Cipher = [
    "K1 Aristocrat",
    "K2 Aristocrat",
    "K3 Aristocrat",
    "K1 Patristocrat",
    "K2 Patristocrat",
    "K3 Patristocrat",
    "K1 Xenocrypt",
    "K2 Xenocrypt",
    "K3 Xenocrypt",
  ].includes(normalizedCipherType);
  const askForKeyword = isK1K2K3Cipher && Math.random() < 0.15;

  const questionEntry = {
    author: quoteData.author,
    quote: cleanQuote(quoteData.quote),
    encrypted: cipherResult.encrypted,
    cipherType: normalizedCipherType,
    key: cipherResult.key || undefined,
    kShift: cipherResult.kShift || (normalizedCipherType.includes("K3") ? 1 : undefined),
    plainAlphabet: cipherResult.plainAlphabet,
    cipherAlphabet: cipherResult.cipherAlphabet,
    matrix: cipherResult.matrix || undefined,
    decryptionMatrix: cipherResult.decryptionMatrix,
    portaKeyword: cipherResult.portaKeyword || cipherResult.keyword || undefined,
    nihilistPolybiusKey: cipherResult.polybiusKey,
    nihilistCipherKey: cipherResult.cipherKey,
    checkerboardRowKey: cipherResult.checkerboardRowKey,
    checkerboardColKey: cipherResult.checkerboardColKey,
    checkerboardPolybiusKey: cipherResult.checkerboardPolybiusKey,
    checkerboardUsesIJ: cipherResult.checkerboardUsesIJ,
    blockSize: cipherResult.blockSize,
    columnarKey: normalizedCipherType === "Complete Columnar" ? cipherResult.key : undefined,
    fractionationTable: cipherResult.fractionationTable || undefined,
    caesarShift: cipherResult.shift || cipherResult.caesarShift || undefined,
    affineA: cipherResult.a || cipherResult.affineA || undefined,
    affineB: cipherResult.b || cipherResult.affineB || undefined,
    baconianBinaryType: cipherResult.binaryType,
    cryptarithmData: cipherResult.cryptarithmData,
    difficulty: 0,
    askForKeyword: askForKeyword,
    points: undefined,
  } as QuoteData;

  questionEntry.difficulty = computeCipherDifficulty({
    cipherType: questionEntry.cipherType,
    quote: questionEntry.quote,
    baconianBinaryType: questionEntry.baconianBinaryType,
  });
  questionEntry.points = Math.max(5, Math.round(5 + 25 * questionEntry.difficulty));
  return questionEntry;
};

// Extract restoration logic to reduce complexity
const restoreSubmittedTest = (
  setQuotes: (quotes: QuoteData[]) => void,
  setIsTestSubmitted: (submitted: boolean) => void,
  setTestScore: (score: number | null) => void,
  setTimeLeft: (time: number) => void,
  setIsLoading: (loading: boolean) => void
): boolean => {
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
};

// Extract cipher type filtering logic to reduce complexity
const getAvailableCipherTypes = (
  cipherTypes: string[],
  division: string
): QuoteData["cipherType"][] => {
  const divisionBCipherTypes = {
    B: [
      "K1 Aristocrat",
      "K2 Aristocrat",
      "Random Aristocrat",
      "K1 Patristocrat",
      "K2 Patristocrat",
      "Random Patristocrat",
      "Baconian",
      "Fractionated Morse",
      "Complete Columnar",
      "Random Xenocrypt",
      "K1 Xenocrypt",
      "K2 Xenocrypt",
      "Porta",
      "Nihilist",
      "Atbash",
      "Caesar",
      "Affine",
      "Checkerboard",
      "Cryptarithm",
    ] as QuoteData["cipherType"][],
    C: [
      "K1 Aristocrat",
      "K2 Aristocrat",
      "K3 Aristocrat",
      "Random Aristocrat",
      "K1 Patristocrat",
      "K2 Patristocrat",
      "K3 Patristocrat",
      "Random Patristocrat",
      "Baconian",
      "Random Xenocrypt",
      "K1 Xenocrypt",
      "K2 Xenocrypt",
      "Fractionated Morse",
      "Porta",
      "Complete Columnar",
      "Nihilist",
      "Hill 2x2",
      "Hill 3x3",
      "Checkerboard",
      "Cryptarithm",
    ] as QuoteData["cipherType"][],
  };

  const baseDefault: QuoteData["cipherType"][] = [
    "K1 Aristocrat",
    "K2 Aristocrat",
    "K3 Aristocrat",
    "Random Aristocrat",
    "K1 Patristocrat",
    "K2 Patristocrat",
    "K3 Patristocrat",
    "Random Patristocrat",
    "Caesar",
    "Atbash",
    "Affine",
    "Hill 2x2",
    "Hill 3x3",
    "Porta",
    "Baconian",
    "Nihilist",
    "Fractionated Morse",
    "Complete Columnar",
    "Random Xenocrypt",
    "K1 Xenocrypt",
    "K2 Xenocrypt",
    "Cryptarithm",
  ];

  const preFiltered =
    cipherTypes && cipherTypes.length > 0
      ? (cipherTypes as QuoteData["cipherType"][])
      : division === "B" || division === "C"
        ? divisionBCipherTypes[division as "B" | "C"]
        : baseDefault;

  let availableCipherTypes = filterEnabledCiphers(preFiltered);
  if (availableCipherTypes.length === 0) {
    availableCipherTypes = filterEnabledCiphers(baseDefault);
    if (availableCipherTypes.length === 0) {
      availableCipherTypes = ["K1 Aristocrat", "K2 Aristocrat"];
    }
  }
  return availableCipherTypes;
};

// Extract quote loading logic to reduce complexity
const loadQuotesForQuestions = async (
  nonXenocryptCount: number,
  xenocryptCount: number,
  testParams: { charLengthMin?: number; charLengthMax?: number }
): Promise<{
  englishQuotes: Array<{ id: string; author: string; quote: string }>;
  spanishQuotes: Array<{ id: string; author: string; quote: string }>;
}> => {
  const charLengthParams =
    testParams.charLengthMin && testParams.charLengthMax
      ? `&charLengthMin=${testParams.charLengthMin}&charLengthMax=${testParams.charLengthMax}`
      : "";

  const isOffline = !navigator.onLine;
  let englishQuotes: Array<{ id: string; author: string; quote: string }> = [];
  let spanishQuotes: Array<{ id: string; author: string; quote: string }> = [];

  if (isOffline) {
    const result = await loadOfflineQuotes(nonXenocryptCount, xenocryptCount);
    englishQuotes = result.englishQuotes;
    spanishQuotes = result.spanishQuotes;
  } else {
    try {
      const result = await loadOnlineQuotes(nonXenocryptCount, xenocryptCount, charLengthParams);
      englishQuotes = result.englishQuotes;
      spanishQuotes = result.spanishQuotes;
    } catch {
      const result = await loadOfflineQuotes(nonXenocryptCount, xenocryptCount);
      englishQuotes = result.englishQuotes;
      spanishQuotes = result.spanishQuotes;
    }
  }

  if (nonXenocryptCount > 0 && englishQuotes.length < nonXenocryptCount) {
    logger.warn(
      `⚠️ Not enough English quotes in selected range. Need ${nonXenocryptCount}, got ${englishQuotes.length}. Trying fallback...`
    );
    englishQuotes = await validateAndFallbackQuotes(
      englishQuotes,
      nonXenocryptCount,
      "en",
      testParams
    );
  }

  if (xenocryptCount > 0 && spanishQuotes.length < xenocryptCount) {
    logger.warn(
      `⚠️ Not enough Spanish quotes in selected range. Need ${xenocryptCount}, got ${spanishQuotes.length}. Trying fallback...`
    );
    spanishQuotes = await validateAndFallbackQuotes(
      spanishQuotes,
      xenocryptCount,
      "es",
      testParams
    );
  }

  return { englishQuotes, spanishQuotes };
};

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

// Extract encryption logic to reduce complexity
const encryptQuoteByType = (cipherType: string, cleanedQuote: string): CipherResult => {
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
  const encryptFunction = cipherMap[cipherType];
  if (!encryptFunction) {
    throw new Error(`Unknown cipher type: ${cipherType}`);
  }
  return encryptFunction(cleanedQuote);
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
