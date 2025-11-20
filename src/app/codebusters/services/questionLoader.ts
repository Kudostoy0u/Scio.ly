import { getEventOfflineQuestions } from "@/app/utils/storage";
import SyncLocalStorage from "@/lib/database/localStorage-replacement";
import logger from "@/lib/utils/logger";
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
import { computeCipherDifficulty } from "./utils/difficulty";
import { isLangObject } from "./utils/langGuards";

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
      return;
    } catch (e) {
      logger.error("Failed to restore submitted test, continuing with fresh load", e);
    }
  }

  setIsLoading(true);
  setError(null);

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
  } catch {}

  const testParamsStr = SyncLocalStorage.getItem("testParams");
  const testParams = testParamsStr ? JSON.parse(testParamsStr) : {};
  const eventName = testParams.eventName || "Codebusters";
  const preferences = loadPreferences(eventName);

  const wasTestSubmitted = SyncLocalStorage.getItem("codebustersIsTestSubmitted") === "true";
  const savedTestScore = SyncLocalStorage.getItem("codebustersTestScore");
  const savedTimeLeft = SyncLocalStorage.getItem("codebustersTimeLeft");

  if (wasTestSubmitted) {
    setIsTestSubmitted(true);
    setTestScore(savedTestScore ? Number.parseFloat(savedTestScore) : 0);
    setTimeLeft(savedTimeLeft ? Number.parseInt(savedTimeLeft) : 0);
  } else {
    setTimeLeft(preferences.timeLimit * 60);
    setIsTestSubmitted(false);
    setTestScore(null);
    SyncLocalStorage.removeItem("codebustersTimeLeft");
    SyncLocalStorage.removeItem("codebustersIsTestSubmitted");
    SyncLocalStorage.removeItem("codebustersTestScore");
  }

  try {
    const testParamsStr = SyncLocalStorage.getItem("testParams");
    if (!testParamsStr) {
      setError("No test parameters found. Please configure a test from the practice page.");
      setIsLoading(false);
      return;
    }

    const testParams = JSON.parse(testParamsStr);
    const eventName = testParams.eventName || "Codebusters";
    const preferences = loadPreferences(eventName);
    const questionCount = Number.parseInt(testParams.questionCount) || preferences.questionCount;
    let cipherTypes = (testParams.cipherTypes || testParams.subtopics || []).map((type: string) =>
      type.toLowerCase()
    );

    if (testParams.eventName === "Codebusters") {
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

      cipherTypes = cipherTypes.map((subtopic: string) => subtopicToCipherMap[subtopic] || subtopic);
    }

    const division = testParams.division || "any";

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
      // Fallback to non-disabled basics if user/division choices filter to nothing
      availableCipherTypes = filterEnabledCiphers(baseDefault);
      if (availableCipherTypes.length === 0) {
        // As a last resort, allow K1/K2 Aristocrat
        availableCipherTypes = ["K1 Aristocrat", "K2 Aristocrat"];
      }
    }

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

    let englishQuotes: Array<{ id: string; author: string; quote: string }> = [];
    let spanishQuotes: Array<{ id: string; author: string; quote: string }> = [];

    const isOffline = !navigator.onLine;
    if (isOffline) {
      const stored = await getEventOfflineQuestions("codebusters");
      logger.log("🔍 Retrieved codebusters data from IndexedDB:", stored);
      logger.log("🔍 Data type:", typeof stored);
      logger.log("🔍 Is array:", Array.isArray(stored));
      if (stored && typeof stored === "object") {
        logger.log("🔍 Has en property:", "en" in stored);
        logger.log("🔍 Has es property:", "es" in stored);
        logger.log(
          "🔍 en length:",
          isLangObject(stored) ? stored.en.length : "not array"
        );
        logger.log(
          "🔍 es length:",
          isLangObject(stored) ? stored.es.length : "not array"
        );
      }

      const storedEn = isLangObject(stored) ? stored.en : Array.isArray(stored) ? stored : [];
      const storedEs = isLangObject(stored) ? stored.es : [];

      logger.log("🔍 Parsed storedEn length:", storedEn.length);
      logger.log("🔍 Parsed storedEs length:", storedEs.length);

      if (nonXenocryptCount > 0) {
        if (storedEn.length < nonXenocryptCount) {
          logger.warn(
            `⚠️ Not enough offline English quotes. Need ${nonXenocryptCount}, got ${storedEn.length}. Using all available quotes.`
          );

          englishQuotes = storedEn;
        } else {
          englishQuotes = storedEn.slice(0, nonXenocryptCount);
        }
      }
      if (xenocryptCount > 0) {
        if (storedEs.length < xenocryptCount) {
          logger.warn(
            `⚠️ Not enough offline Spanish quotes. Need ${xenocryptCount}, got ${storedEs.length}. Using all available quotes.`
          );

          spanishQuotes = storedEs;
        } else {
          spanishQuotes = storedEs.slice(0, xenocryptCount);
        }
      }
    } else {
      try {
        const charLengthParams =
          testParams.charLengthMin && testParams.charLengthMax
            ? `&charLengthMin=${testParams.charLengthMin}&charLengthMax=${testParams.charLengthMax}`
            : "";

        if (nonXenocryptCount > 0) {
          const englishResponse = await fetch(
            `/api/quotes?language=en&limit=${Math.min(nonXenocryptCount, 200)}${charLengthParams}`
          );
          if (!englishResponse.ok) {
            throw new Error("en failed");
          }
          const englishData = await englishResponse.json();
          englishQuotes = englishData.data?.quotes || englishData.quotes || [];
        }
        if (xenocryptCount > 0) {
          const spanishResponse = await fetch(
            `/api/quotes?language=es&limit=${Math.min(xenocryptCount, 200)}${charLengthParams}`
          );
          if (!spanishResponse.ok) {
            throw new Error("es failed");
          }
          const spanishData = await spanishResponse.json();
          spanishQuotes = spanishData.data?.quotes || spanishData.quotes || [];
        }
      } catch {
        const stored = await getEventOfflineQuestions("codebusters");
        logger.log("🔍 Fallback: Retrieved codebusters data from IndexedDB:", stored);
        logger.log("🔍 Fallback: Data type:", typeof stored);
        logger.log("🔍 Fallback: Is array:", Array.isArray(stored));
        if (stored && typeof stored === "object") {
          logger.log("🔍 Fallback: Has en property:", "en" in stored);
          logger.log("🔍 Fallback: Has es property:", "es" in stored);
          logger.log(
            "🔍 Fallback: en length:",
            isLangObject(stored) ? stored.en.length : "not array"
          );
          logger.log(
            "🔍 Fallback: es length:",
            isLangObject(stored) ? stored.es.length : "not array"
          );
        }

        const storedEn = isLangObject(stored) ? stored.en : Array.isArray(stored) ? stored : [];
        const storedEs = isLangObject(stored) ? stored.es : [];

        logger.log("🔍 Fallback: Parsed storedEn length:", storedEn.length);
        logger.log("🔍 Fallback: Parsed storedEs length:", storedEs.length);

        if (nonXenocryptCount > 0) {
          if (storedEn.length < nonXenocryptCount) {
            logger.warn(
              `⚠️ Not enough offline English quotes in fallback. Need ${nonXenocryptCount}, got ${storedEn.length}. Using all available quotes.`
            );

            englishQuotes = storedEn;
          } else {
            englishQuotes = storedEn.slice(0, nonXenocryptCount);
          }
        }
        if (xenocryptCount > 0) {
          if (storedEs.length < xenocryptCount) {
            logger.warn(
              `⚠️ Not enough offline Spanish quotes in fallback. Need ${xenocryptCount}, got ${storedEs.length}. Using all available quotes.`
            );

            spanishQuotes = storedEs;
          } else {
            spanishQuotes = storedEs.slice(0, xenocryptCount);
          }
        }
      }
    }

    if (nonXenocryptCount > 0 && englishQuotes.length < nonXenocryptCount) {
      logger.warn(
        `⚠️ Not enough English quotes in selected range. Need ${nonXenocryptCount}, got ${englishQuotes.length}. Trying fallback...`
      );

      try {
        const fallbackResponse = await fetch(
          `/api/quotes?language=en&limit=${Math.min(nonXenocryptCount, 200)}`
        );
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const fallbackQuotes = fallbackData.data?.quotes || fallbackData.quotes || [];
          if (fallbackQuotes.length >= nonXenocryptCount) {
            englishQuotes = fallbackQuotes;
            logger.log(
              `✅ Fallback successful: Found ${fallbackQuotes.length} English quotes without length restrictions`
            );
          } else {
            throw new Error(
              `Not enough English quotes available. Your character length range (${testParams.charLengthMin || 1}-${testParams.charLengthMax || 100}) is too restrictive. Try expanding the range or reducing the number of questions. Available: ${englishQuotes.length}, needed: ${nonXenocryptCount}.`
            );
          }
        } else {
          throw new Error(
            `Not enough English quotes available. Your character length range (${testParams.charLengthMin || 1}-${testParams.charLengthMax || 100}) is too restrictive. Try expanding the range or reducing the number of questions. Available: ${englishQuotes.length}, needed: ${nonXenocryptCount}.`
          );
        }
      } catch (fallbackError) {
        if (
          fallbackError instanceof Error &&
          fallbackError.message.includes("character length range")
        ) {
          throw fallbackError;
        }
        throw new Error(
          `Not enough English quotes available. Your character length range (${testParams.charLengthMin || 1}-${testParams.charLengthMax || 100}) is too restrictive. Try expanding the range or reducing the number of questions. Available: ${englishQuotes.length}, needed: ${nonXenocryptCount}.`
        );
      }
    }

    if (xenocryptCount > 0 && spanishQuotes.length < xenocryptCount) {
      logger.warn(
        `⚠️ Not enough Spanish quotes in selected range. Need ${xenocryptCount}, got ${spanishQuotes.length}. Trying fallback...`
      );

      try {
        const fallbackResponse = await fetch(
          `/api/quotes?language=es&limit=${Math.min(xenocryptCount, 200)}`
        );
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const fallbackQuotes = fallbackData.data?.quotes || fallbackData.quotes || [];
          if (fallbackQuotes.length >= xenocryptCount) {
            spanishQuotes = fallbackQuotes;
            logger.log(
              `✅ Fallback successful: Found ${fallbackQuotes.length} Spanish quotes without length restrictions`
            );
          } else {
            throw new Error(
              `Not enough Spanish quotes available. Your character length range (${testParams.charLengthMin || 1}-${testParams.charLengthMax || 100}) is too restrictive. Try expanding the range or reducing the number of questions. Available: ${spanishQuotes.length}, needed: ${xenocryptCount}.`
            );
          }
        } else {
          throw new Error(
            `Not enough Spanish quotes available. Your character length range (${testParams.charLengthMin || 1}-${testParams.charLengthMax || 100}) is too restrictive. Try expanding the range or reducing the number of questions. Available: ${spanishQuotes.length}, needed: ${xenocryptCount}.`
          );
        }
      } catch (fallbackError) {
        if (
          fallbackError instanceof Error &&
          fallbackError.message.includes("character length range")
        ) {
          throw fallbackError;
        }
        throw new Error(
          `Not enough Spanish quotes available. Your character length range (${testParams.charLengthMin || 1}-${testParams.charLengthMax || 100}) is too restrictive. Try expanding the range or reducing the number of questions. Available: ${spanishQuotes.length}, needed: ${xenocryptCount}.`
        );
      }
    }

    logger.log(
      `🔍 Quote validation passed: ${englishQuotes.length} English, ${spanishQuotes.length} Spanish quotes available`
    );

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
      let quoteData: {
        quote: string;
        author: string;
        originalIndex: number;
        isSpanish?: boolean;
        id?: string;
      };

      if (
        cipherType === "Random Xenocrypt" ||
        cipherType === "K1 Xenocrypt" ||
        cipherType === "K2 Xenocrypt" ||
        cipherType === "K3 Xenocrypt"
      ) {
        if (spanishQuoteIndex >= spanishQuotes.length) {
          logger.warn("⚠️ Not enough Spanish quotes for xenocrypt. Using English quote instead.");

          if (englishQuoteIndex >= englishQuotes.length) {
            logger.warn(`⚠️ No more quotes available. Stopping at ${i} questions.`);
            break;
          }
          const englishQuote = englishQuotes[englishQuoteIndex];
          if (!englishQuote) {
            logger.warn(`⚠️ No English quote at index ${englishQuoteIndex}. Stopping.`);
            break;
          }
          quoteData = {
            quote: englishQuote.quote,
            author: englishQuote.author,
            originalIndex: englishQuoteIndex,
            isSpanish: false,
            id: englishQuote.id,
          };
          quoteUuiDs.push({ id: englishQuote.id || "", language: "en", cipherType });
          englishQuoteIndex++;
        } else {
          const spanishQuote = spanishQuotes[spanishQuoteIndex];
          if (!spanishQuote) {
            logger.warn(`⚠️ No Spanish quote at index ${spanishQuoteIndex}. Stopping.`);
            break;
          }
          quoteData = {
            quote: spanishQuote.quote,
            author: spanishQuote.author,
            originalIndex: spanishQuoteIndex,
            isSpanish: true,
            id: spanishQuote.id,
          };
          quoteUuiDs.push({ id: spanishQuote.id || "", language: "es", cipherType });
          spanishQuoteIndex++;
        }
      } else {
        if (englishQuoteIndex >= englishQuotes.length) {
          logger.warn(`⚠️ Not enough English quotes. Stopping at ${i} questions.`);
          break;
        }
        const englishQuote = englishQuotes[englishQuoteIndex];
        if (!englishQuote) {
          logger.warn(`⚠️ No English quote at index ${englishQuoteIndex}. Stopping.`);
          break;
        }
        quoteData = {
          quote: englishQuote.quote,
          author: englishQuote.author,
          originalIndex: englishQuoteIndex,
          isSpanish: false,
          id: englishQuote.id,
        };
        quoteUuiDs.push({ id: englishQuote.id || "", language: "en", cipherType });
        englishQuoteIndex++;
      }

      const cleanedQuote = cleanQuote(quoteData.quote);

      let cipherResult: CipherResult;

      switch (normalizedCipherType) {
        case "K1 Aristocrat":
          cipherResult = encryptK1Aristocrat(cleanedQuote);
          break;
        case "K2 Aristocrat":
          cipherResult = encryptK2Aristocrat(cleanedQuote);
          break;
        case "K3 Aristocrat":
          cipherResult = encryptK3Aristocrat(cleanedQuote);
          break;
        case "K1 Patristocrat":
          cipherResult = encryptK1Patristocrat(cleanedQuote);
          break;
        case "K2 Patristocrat":
          cipherResult = encryptK2Patristocrat(cleanedQuote);
          break;
        case "K3 Patristocrat":
          cipherResult = encryptK3Patristocrat(cleanedQuote);
          break;
        case "Random Aristocrat":
          cipherResult = encryptRandomAristocrat(cleanedQuote);
          break;
        case "Random Patristocrat":
          cipherResult = encryptRandomPatristocrat(cleanedQuote);
          break;
        case "Caesar":
          cipherResult = encryptCaesar(cleanedQuote);
          break;
        case "Atbash":
          cipherResult = encryptAtbash(cleanedQuote);
          break;
        case "Affine":
          cipherResult = encryptAffine(cleanedQuote);
          break;
        case "Hill 2x2":
          cipherResult = encryptHill2x2(cleanedQuote);
          break;
        case "Hill 3x3":
          cipherResult = encryptHill3x3(cleanedQuote);
          break;
        case "Porta":
          cipherResult = encryptPorta(cleanedQuote);
          break;
        case "Baconian":
          cipherResult = encryptBaconian(cleanedQuote);
          break;
        case "Nihilist":
          cipherResult = encryptNihilist(cleanedQuote);
          break;
        case "Fractionated Morse":
          cipherResult = encryptFractionatedMorse(cleanedQuote);
          break;
        case "Complete Columnar":
          cipherResult = encryptColumnarTransposition(cleanedQuote);
          break;
        case "Random Xenocrypt":
          cipherResult = encryptRandomXenocrypt(cleanedQuote);
          break;
        case "K1 Xenocrypt":
          cipherResult = encryptK1Xenocrypt(cleanedQuote);
          break;
        case "K2 Xenocrypt":
          cipherResult = encryptK2Xenocrypt(cleanedQuote);
          break;
        case "K3 Xenocrypt":
          cipherResult = encryptK3Xenocrypt(cleanedQuote);
          break;
        case "Checkerboard":
          cipherResult = encryptCheckerboard(cleanedQuote);
          break;
        case "Cryptarithm":
          cipherResult = encryptCryptarithm(cleanedQuote);
          break;
        default:
          throw new Error(
            `Unknown cipher type: ${cipherType} (normalized: ${normalizedCipherType})`
          );
      }

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
        quote: cleanedQuote,
        encrypted: cipherResult.encrypted,
        cipherType: normalizedCipherType,
        key: cipherResult.key || undefined,
        kShift:
          cipherResult.kShift || (normalizedCipherType.includes("K3") ? 1 : undefined),
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
      processedQuotes.push(questionEntry);
    }

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
  } catch (error) {
    logger.error("Error loading questions from database:", error);
    setError("Failed to load questions from database");
    setIsLoading(false);
  }
};
