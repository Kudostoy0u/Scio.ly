import { QuoteData } from '../types';
import { getEventOfflineQuestions } from '@/app/utils/storage';
import { cleanQuote } from '../utils/quoteCleaner';
import { filterEnabledCiphers } from '../config';
import {
  encryptK1Aristocrat,
  encryptK2Aristocrat,
  encryptK3Aristocrat,
  encryptK1Patristocrat,
  encryptK2Patristocrat,
  encryptK3Patristocrat,
  encryptRandomAristocrat,
  encryptRandomPatristocrat,
  encryptCaesar,
  encryptAtbash,
  encryptAffine,
  encryptHill2x2,
  encryptHill3x3,
  encryptPorta,
  encryptBaconian,
  encryptNihilist,
  encryptFractionatedMorse,
  encryptColumnarTransposition,
  encryptRandomXenocrypt,
  encryptK1Xenocrypt,
  encryptK2Xenocrypt,
  encryptK3Xenocrypt,
  encryptCheckerboard,
  encryptCryptarithm,
  setCustomWordBank,
  getCustomWordBank
} from '../cipher-utils';

export const loadQuestionsFromDatabase = async (
  setIsLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  setQuotes: (quotes: QuoteData[]) => void,
  setTimeLeft: (time: number) => void,
  setIsTestSubmitted: (submitted: boolean) => void,
  setTestScore: (score: number | null) => void,
  loadPreferences: (eventName: string) => { questionCount: number; timeLimit: number }
) => {
  console.log('loadQuestionsFromDatabase called');
  

  const testAlreadySubmitted = localStorage.getItem('codebustersIsTestSubmitted') === 'true';
  const existingQuotes = localStorage.getItem('codebustersQuotes');
  if (testAlreadySubmitted && existingQuotes) {
    try {
      const restored = JSON.parse(existingQuotes);
      setIsTestSubmitted(true);
      const savedTestScore = localStorage.getItem('codebustersTestScore');
      const savedTimeLeft = localStorage.getItem('codebustersTimeLeft');
      setTestScore(savedTestScore ? parseFloat(savedTestScore) : 0);
      setTimeLeft(savedTimeLeft ? parseInt(savedTimeLeft) : 0);
      setQuotes(restored);
      setIsLoading(false);
      return;
    } catch (e) {
      console.error('Failed to restore submitted test, continuing with fresh load', e);
    }
  }
  
  setIsLoading(true);
  setError(null);


  try {
    if (!getCustomWordBank()) {
      const resp = await fetch('/words.json');
      if (resp.ok) {
        const words = await resp.json();
        if (Array.isArray(words) && words.length > 0) setCustomWordBank(words);
      }
    }
  } catch {}
  

  const testParamsStr = localStorage.getItem('testParams');
  const testParams = testParamsStr ? JSON.parse(testParamsStr) : {};
  const eventName = testParams.eventName || 'Codebusters';
  const preferences = loadPreferences(eventName);
  

  const wasTestSubmitted = localStorage.getItem('codebustersIsTestSubmitted') === 'true';
  const savedTestScore = localStorage.getItem('codebustersTestScore');
  const savedTimeLeft = localStorage.getItem('codebustersTimeLeft');
  
  if (wasTestSubmitted) {

    setIsTestSubmitted(true);
    setTestScore(savedTestScore ? parseFloat(savedTestScore) : 0);
    setTimeLeft(savedTimeLeft ? parseInt(savedTimeLeft) : 0);
  } else {

    setTimeLeft(preferences.timeLimit * 60);
    setIsTestSubmitted(false);
    setTestScore(null);
    localStorage.removeItem('codebustersTimeLeft');
    localStorage.removeItem('codebustersIsTestSubmitted');
    localStorage.removeItem('codebustersTestScore');
  }

  try {

    const testParamsStr = localStorage.getItem('testParams');
    if (!testParamsStr) {
      setError('No test parameters found. Please configure a test from the practice page.');
      setIsLoading(false);
      return;
    }

    const testParams = JSON.parse(testParamsStr);
    const eventName = testParams.eventName || 'Codebusters';
    const preferences = loadPreferences(eventName);
    const questionCount = parseInt(testParams.questionCount) || preferences.questionCount;
    let cipherTypes = (testParams.cipherTypes || testParams.subtopics || []).map((type: string) => type.toLowerCase());
    

    if (testParams.eventName === 'Codebusters') {
      const subtopicToCipherMap: { [key: string]: string } = {

        'k1 aristocrat': 'K1 Aristocrat',
        'k2 aristocrat': 'K2 Aristocrat',
        'k3 aristocrat': 'K3 Aristocrat',
        'k1 patristocrat': 'K1 Patristocrat',
        'k2 patristocrat': 'K2 Patristocrat',
        'k3 patristocrat': 'K3 Patristocrat',
        'misc aristocrat': 'Random Aristocrat',
        'misc patristocrat': 'Random Patristocrat',
        'caesar': 'Caesar',
        'atbash': 'Atbash',
        'affine': 'Affine',
        'hill': 'Hill 2x2',
        'baconian': 'Baconian',
        'porta': 'Porta',
        'nihilist': 'Nihilist',
        'fractionated morse': 'Fractionated Morse',
        'columnar transposition': 'Complete Columnar',
        'random xenocrypt': 'Random Xenocrypt',
        'k1 xenocrypt': 'K1 Xenocrypt',
        'k2 xenocrypt': 'K2 Xenocrypt',
        'k3 xenocrypt': 'K3 Xenocrypt',
        'checkerboard': 'Checkerboard',

        'K1 Aristocrat': 'K1 Aristocrat',
        'K2 Aristocrat': 'K2 Aristocrat',
        'K3 Aristocrat': 'K3 Aristocrat',
        'K1 Patristocrat': 'K1 Patristocrat',
        'K2 Patristocrat': 'K2 Patristocrat',
        'K3 Patristocrat': 'K3 Patristocrat',
        'Misc. Aristocrat': 'Random Aristocrat',
        'Misc. Patristocrat': 'Random Patristocrat',
        'Caesar': 'Caesar',
        'Atbash': 'Atbash',
        'Affine': 'Affine',
        'Hill': 'Hill 2x2',
        'Baconian': 'Baconian',
        'Porta': 'Porta',
        'Nihilist': 'Nihilist',
        'Fractionated Morse': 'Fractionated Morse',
        'Columnar Transposition': 'Complete Columnar',
        'Random Xenocrypt': 'Random Xenocrypt',
        'K1 Xenocrypt': 'K1 Xenocrypt',
        'K2 Xenocrypt': 'K2 Xenocrypt',
        'K3 Xenocrypt': 'K3 Xenocrypt',
        'Checkerboard': 'Checkerboard',
        'Cryptarithm': 'Cryptarithm',

        'aristocrat': 'Random Aristocrat',
        'patristocrat': 'Random Patristocrat'
      };
    
      cipherTypes = cipherTypes.map(subtopic => 
        subtopicToCipherMap[subtopic] || subtopic
      );
    }


    const division = testParams.division || 'any';
    

    const divisionBCipherTypes = {
              'B': ['K1 Aristocrat', 'K2 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'Random Patristocrat', 'Baconian', 'Fractionated Morse', 'Complete Columnar', 'Random Xenocrypt', 'K1 Xenocrypt', 'K2 Xenocrypt', 'Porta', 'Nihilist', 'Atbash', 'Caesar', 'Affine', 'Checkerboard', 'Cryptarithm'] as QuoteData['cipherType'][],
              'C': ['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Patristocrat', 'Baconian', 'Random Xenocrypt', 'K1 Xenocrypt', 'K2 Xenocrypt', 'Fractionated Morse', 'Porta', 'Complete Columnar', 'Nihilist', 'Hill 2x2', 'Hill 3x3', 'Checkerboard', 'Cryptarithm'] as QuoteData['cipherType'][]
    };
    
    const baseDefault: QuoteData['cipherType'][] = ['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine', 'Hill 2x2', 'Hill 3x3', 'Porta', 'Baconian', 'Nihilist', 'Fractionated Morse', 'Complete Columnar', 'Random Xenocrypt', 'K1 Xenocrypt', 'K2 Xenocrypt', 'Cryptarithm'];

    const preFiltered = (cipherTypes && cipherTypes.length > 0)
      ? (cipherTypes as QuoteData['cipherType'][])
      : ((division === 'B' || division === 'C') ? divisionBCipherTypes[division] : baseDefault);

    let availableCipherTypes = filterEnabledCiphers(preFiltered);
    if (availableCipherTypes.length === 0) {
      // Fallback to non-disabled basics if user/division choices filter to nothing
      availableCipherTypes = filterEnabledCiphers(baseDefault);
      if (availableCipherTypes.length === 0) {
        // As a last resort, allow K1/K2 Aristocrat
        availableCipherTypes = ['K1 Aristocrat', 'K2 Aristocrat'];
      }
    }


    const questionCipherTypes: QuoteData['cipherType'][] = [];
    for (let i = 0; i < questionCount; i++) {
      const cipherType = availableCipherTypes[Math.floor(Math.random() * availableCipherTypes.length)] as QuoteData['cipherType'];
      questionCipherTypes.push(cipherType);
    }


    const xenocryptCount = questionCipherTypes.filter(type => type === 'Random Xenocrypt' || type === 'K1 Xenocrypt' || type === 'K2 Xenocrypt' || type === 'K3 Xenocrypt').length;
    const nonXenocryptCount = questionCount - xenocryptCount;
    
    console.log(`🔍 Quote requirements: ${nonXenocryptCount} English, ${xenocryptCount} Spanish, total: ${questionCount}`);
    console.log(`🔍 Cipher types:`, questionCipherTypes);


    let englishQuotes: Array<{id: string, author: string, quote: string}> = [];
    let spanishQuotes: Array<{id: string, author: string, quote: string}> = [];
    

    const isOffline = !navigator.onLine;
    if (isOffline) {

      const stored = await getEventOfflineQuestions('codebusters');
      console.log('🔍 Retrieved codebusters data from IndexedDB:', stored);
      console.log('🔍 Data type:', typeof stored);
      console.log('🔍 Is array:', Array.isArray(stored));
      if (stored && typeof stored === 'object') {
        console.log('🔍 Has en property:', 'en' in stored);
        console.log('🔍 Has es property:', 'es' in stored);
        console.log('🔍 en length:', Array.isArray((stored as any).en) ? (stored as any).en.length : 'not array');
        console.log('🔍 es length:', Array.isArray((stored as any).es) ? (stored as any).es.length : 'not array');
      }
      
      const isLangObject = (val: unknown): val is { en: any[]; es: any[] } =>
        !!val && typeof val === 'object' && Array.isArray((val as any).en) && Array.isArray((val as any).es);
      const storedEn = isLangObject(stored) ? stored.en : Array.isArray(stored) ? stored : [];
      const storedEs = isLangObject(stored) ? stored.es : [];
      
      console.log('🔍 Parsed storedEn length:', storedEn.length);
      console.log('🔍 Parsed storedEs length:', storedEs.length);
      
      if (nonXenocryptCount > 0) {
        if (storedEn.length < nonXenocryptCount) {
          console.warn(`⚠️ Not enough offline English quotes. Need ${nonXenocryptCount}, got ${storedEn.length}. Using all available quotes.`);

          englishQuotes = storedEn;
        } else {
          englishQuotes = storedEn.slice(0, nonXenocryptCount);
        }
      }
      if (xenocryptCount > 0) {
        if (storedEs.length < xenocryptCount) {
          console.warn(`⚠️ Not enough offline Spanish quotes. Need ${xenocryptCount}, got ${storedEs.length}. Using all available quotes.`);

          spanishQuotes = storedEs;
        } else {
          spanishQuotes = storedEs.slice(0, xenocryptCount);
        }
      }
    } else {

      try {

        const charLengthParams = testParams.charLengthMin && testParams.charLengthMax 
          ? `&charLengthMin=${testParams.charLengthMin}&charLengthMax=${testParams.charLengthMax}`
          : '';
        
        if (nonXenocryptCount > 0) {
          const englishResponse = await fetch(`/api/quotes?language=en&limit=${Math.min(nonXenocryptCount, 200)}${charLengthParams}`);
          if (!englishResponse.ok) throw new Error('en failed');
          const englishData = await englishResponse.json();
          englishQuotes = englishData.data?.quotes || englishData.quotes || [];
        }
        if (xenocryptCount > 0) {
          const spanishResponse = await fetch(`/api/quotes?language=es&limit=${Math.min(xenocryptCount, 200)}${charLengthParams}`);
          if (!spanishResponse.ok) throw new Error('es failed');
          const spanishData = await spanishResponse.json();
          spanishQuotes = spanishData.data?.quotes || spanishData.quotes || [];
        }
      } catch {

        const stored = await getEventOfflineQuestions('codebusters');
        console.log('🔍 Fallback: Retrieved codebusters data from IndexedDB:', stored);
        console.log('🔍 Fallback: Data type:', typeof stored);
        console.log('🔍 Fallback: Is array:', Array.isArray(stored));
        if (stored && typeof stored === 'object') {
          console.log('🔍 Fallback: Has en property:', 'en' in stored);
          console.log('🔍 Fallback: Has es property:', 'es' in stored);
          console.log('🔍 Fallback: en length:', Array.isArray((stored as any).en) ? (stored as any).en.length : 'not array');
          console.log('🔍 Fallback: es length:', Array.isArray((stored as any).es) ? (stored as any).es.length : 'not array');
        }
        
        const isLangObject = (val: unknown): val is { en: any[]; es: any[] } =>
          !!val && typeof val === 'object' && Array.isArray((val as any).en) && Array.isArray((val as any).es);
        const storedEn = isLangObject(stored) ? stored.en : Array.isArray(stored) ? stored : [];
        const storedEs = isLangObject(stored) ? stored.es : [];
        
        console.log('🔍 Fallback: Parsed storedEn length:', storedEn.length);
        console.log('🔍 Fallback: Parsed storedEs length:', storedEs.length);
        
        if (nonXenocryptCount > 0) {
          if (storedEn.length < nonXenocryptCount) {
            console.warn(`⚠️ Not enough offline English quotes in fallback. Need ${nonXenocryptCount}, got ${storedEn.length}. Using all available quotes.`);

            englishQuotes = storedEn;
          } else {
            englishQuotes = storedEn.slice(0, nonXenocryptCount);
          }
        }
        if (xenocryptCount > 0) {
          if (storedEs.length < xenocryptCount) {
            console.warn(`⚠️ Not enough offline Spanish quotes in fallback. Need ${xenocryptCount}, got ${storedEs.length}. Using all available quotes.`);

            spanishQuotes = storedEs;
          } else {
            spanishQuotes = storedEs.slice(0, xenocryptCount);
          }
        }
      }
    }


    if (nonXenocryptCount > 0 && englishQuotes.length < nonXenocryptCount) {
      console.warn(`⚠️ Not enough English quotes in selected range. Need ${nonXenocryptCount}, got ${englishQuotes.length}. Trying fallback...`);
      

      try {
        const fallbackResponse = await fetch(`/api/quotes?language=en&limit=${Math.min(nonXenocryptCount, 200)}`);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const fallbackQuotes = fallbackData.data?.quotes || fallbackData.quotes || [];
          if (fallbackQuotes.length >= nonXenocryptCount) {
            englishQuotes = fallbackQuotes;
            console.log(`✅ Fallback successful: Found ${fallbackQuotes.length} English quotes without length restrictions`);
          } else {
            throw new Error(`Not enough English quotes available. Your character length range (${testParams.charLengthMin || 1}-${testParams.charLengthMax || 100}) is too restrictive. Try expanding the range or reducing the number of questions. Available: ${englishQuotes.length}, needed: ${nonXenocryptCount}.`);
          }
        } else {
          throw new Error(`Not enough English quotes available. Your character length range (${testParams.charLengthMin || 1}-${testParams.charLengthMax || 100}) is too restrictive. Try expanding the range or reducing the number of questions. Available: ${englishQuotes.length}, needed: ${nonXenocryptCount}.`);
        }
      } catch (fallbackError) {
        if (fallbackError instanceof Error && fallbackError.message.includes('character length range')) {
          throw fallbackError;
        }
        throw new Error(`Not enough English quotes available. Your character length range (${testParams.charLengthMin || 1}-${testParams.charLengthMax || 100}) is too restrictive. Try expanding the range or reducing the number of questions. Available: ${englishQuotes.length}, needed: ${nonXenocryptCount}.`);
      }
    }
    
    if (xenocryptCount > 0 && spanishQuotes.length < xenocryptCount) {
      console.warn(`⚠️ Not enough Spanish quotes in selected range. Need ${xenocryptCount}, got ${spanishQuotes.length}. Trying fallback...`);
      

      try {
        const fallbackResponse = await fetch(`/api/quotes?language=es&limit=${Math.min(xenocryptCount, 200)}`);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const fallbackQuotes = fallbackData.data?.quotes || fallbackData.quotes || [];
          if (fallbackQuotes.length >= xenocryptCount) {
            spanishQuotes = fallbackQuotes;
            console.log(`✅ Fallback successful: Found ${fallbackQuotes.length} Spanish quotes without length restrictions`);
          } else {
            throw new Error(`Not enough Spanish quotes available. Your character length range (${testParams.charLengthMin || 1}-${testParams.charLengthMax || 100}) is too restrictive. Try expanding the range or reducing the number of questions. Available: ${spanishQuotes.length}, needed: ${xenocryptCount}.`);
          }
        } else {
          throw new Error(`Not enough Spanish quotes available. Your character length range (${testParams.charLengthMin || 1}-${testParams.charLengthMax || 100}) is too restrictive. Try expanding the range or reducing the number of questions. Available: ${spanishQuotes.length}, needed: ${xenocryptCount}.`);
        }
      } catch (fallbackError) {
        if (fallbackError instanceof Error && fallbackError.message.includes('character length range')) {
          throw fallbackError;
        }
        throw new Error(`Not enough Spanish quotes available. Your character length range (${testParams.charLengthMin || 1}-${testParams.charLengthMax || 100}) is too restrictive. Try expanding the range or reducing the number of questions. Available: ${spanishQuotes.length}, needed: ${xenocryptCount}.`);
      }
    }
    
    console.log(`🔍 Quote validation passed: ${englishQuotes.length} English, ${spanishQuotes.length} Spanish quotes available`);
    

    const processedQuotes: QuoteData[] = [];
    const quoteUUIDs: Array<{id: string, language: string, cipherType: string}> = [];
    let englishQuoteIndex = 0;
    let spanishQuoteIndex = 0;


    const availableEnglishQuotes = englishQuotes.length;
    const availableSpanishQuotes = spanishQuotes.length;
    const actualQuestionCount = Math.min(questionCount, availableEnglishQuotes + availableSpanishQuotes);
    
    if (actualQuestionCount < questionCount) {
      console.warn(`⚠️ Not enough quotes available. Requested ${questionCount} questions, but only ${actualQuestionCount} can be created.`);
    }
    

    const computeDifficulty = (q: {
      cipherType: string;
      quote: string;
      baconianBinaryType?: string;
    }): number => {
      const baseByType: Record<string, number> = {
        'Atbash': 0.15,
        'Caesar': 0.2,
        'Affine': 0.35,
        'Porta': 0.45,
        'Checkerboard': 0.55,
        'Baconian': 0.45,
        'Complete Columnar': 0.55,
        'Fractionated Morse': 0.65,
        'Hill 2x2': 0.6,
        'Hill 3x3': 0.8,
        'K1 Aristocrat': 0.55,
        'K2 Aristocrat': 0.7,
        'K3 Aristocrat': 0.75,
        'Random Aristocrat': 0.8,
        'K1 Patristocrat': 0.65,
        'K2 Patristocrat': 0.78,
        'K3 Patristocrat': 0.82,
        'Random Patristocrat': 0.9,
        'Random Xenocrypt': 0.95,
        'K1 Xenocrypt': 0.8,
        'K2 Xenocrypt': 0.85,
        'K3 Xenocrypt': 0.9,
        'Cryptarithm': 0.7,
      };
      let d = baseByType[q.cipherType] ?? 0.5;

      const len = q.quote.replace(/[^A-Za-z]/g, '').length;
      const norm = Math.max(0, Math.min(1, (len - 40) / 160)); // 0 at 40, 1 at 200
      d += (norm - 0.5) * 0.25; // +/-0.125

      if (q.cipherType === 'Baconian' && q.baconianBinaryType) {
        const t = q.baconianBinaryType;
        if (t === 'A/B') d -= 0.15;
        else if (t === 'Vowels/Consonants') d += 0.05;
        else if (t === 'Odd/Even') d += 0.08;
        else if (t.includes(' vs ')) d += 0.12; // emoji/symbol set groupings
        d = Math.max(0.1, Math.min(0.98, d));
      }
      return Math.max(0.1, Math.min(0.98, d));
    };

    for (let i = 0; i < actualQuestionCount; i++) {
      const cipherType = questionCipherTypes[i];

      const normalizedCipherType = cipherType.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      let quoteData: { quote: string; author: string; originalIndex: number; isSpanish?: boolean; id?: string };

      if (cipherType === 'Random Xenocrypt' || cipherType === 'K1 Xenocrypt' || cipherType === 'K2 Xenocrypt' || cipherType === 'K3 Xenocrypt') {

        if (spanishQuoteIndex >= spanishQuotes.length) {
          console.warn(`⚠️ Not enough Spanish quotes for xenocrypt. Using English quote instead.`);

          if (englishQuoteIndex >= englishQuotes.length) {
            console.warn(`⚠️ No more quotes available. Stopping at ${i} questions.`);
            break;
          }
          const englishQuote = englishQuotes[englishQuoteIndex];
          quoteData = { 
            quote: englishQuote.quote, 
            author: englishQuote.author, 
            originalIndex: englishQuoteIndex,
            isSpanish: false,
            id: englishQuote.id
          };
          quoteUUIDs.push({ id: englishQuote.id, language: 'en', cipherType });
          englishQuoteIndex++;
        } else {
          const spanishQuote = spanishQuotes[spanishQuoteIndex];
          quoteData = { 
            quote: spanishQuote.quote, 
            author: spanishQuote.author, 
            originalIndex: spanishQuoteIndex,
            isSpanish: true,
            id: spanishQuote.id
          };
          quoteUUIDs.push({ id: spanishQuote.id, language: 'es', cipherType });
          spanishQuoteIndex++;
        }
      } else {

        if (englishQuoteIndex >= englishQuotes.length) {
          console.warn(`⚠️ Not enough English quotes. Stopping at ${i} questions.`);
          break;
        }
        const englishQuote = englishQuotes[englishQuoteIndex];
        quoteData = { 
          quote: englishQuote.quote, 
          author: englishQuote.author, 
          originalIndex: englishQuoteIndex,
          isSpanish: false,
          id: englishQuote.id
        };
        quoteUUIDs.push({ id: englishQuote.id, language: 'en', cipherType });
        englishQuoteIndex++;
      }


      const cleanedQuote = cleanQuote(quoteData.quote);
      

      let cipherResult: { 
        encrypted: string; 
        key?: string; 
        matrix?: number[][]; 
        keyword?: string; 
        fractionationTable?: { [key: string]: string }; 
        shift?: number; 
        a?: number; 
        b?: number; 
      };

      switch (normalizedCipherType) {
        case 'K1 Aristocrat':
          cipherResult = encryptK1Aristocrat(cleanedQuote);
          break;
        case 'K2 Aristocrat':
          cipherResult = encryptK2Aristocrat(cleanedQuote);
          break;
        case 'K3 Aristocrat':
          cipherResult = encryptK3Aristocrat(cleanedQuote);
          break;
        case 'K1 Patristocrat':
          cipherResult = encryptK1Patristocrat(cleanedQuote);
          break;
        case 'K2 Patristocrat':
          cipherResult = encryptK2Patristocrat(cleanedQuote);
          break;
        case 'K3 Patristocrat':
          cipherResult = encryptK3Patristocrat(cleanedQuote);
          break;
        case 'Random Aristocrat':
          cipherResult = encryptRandomAristocrat(cleanedQuote);
          break;
        case 'Random Patristocrat':
          cipherResult = encryptRandomPatristocrat(cleanedQuote);
          break;
        case 'Caesar':
          cipherResult = encryptCaesar(cleanedQuote);
          break;
        case 'Atbash':
          cipherResult = encryptAtbash(cleanedQuote);
          break;
        case 'Affine':
          cipherResult = encryptAffine(cleanedQuote);
          break;
        case 'Hill 2x2':
          cipherResult = encryptHill2x2(cleanedQuote);
          break;
        case 'Hill 3x3':
          cipherResult = encryptHill3x3(cleanedQuote);
          break;
        case 'Porta':
          cipherResult = encryptPorta(cleanedQuote);
          break;
        case 'Baconian':
          cipherResult = encryptBaconian(cleanedQuote);
          break;
        case 'Nihilist':
          cipherResult = encryptNihilist(cleanedQuote);
          break;
        case 'Fractionated Morse':
          cipherResult = encryptFractionatedMorse(cleanedQuote);
          break;
        case 'Complete Columnar':
          cipherResult = encryptColumnarTransposition(cleanedQuote);
          break;
        case 'Random Xenocrypt':
          cipherResult = encryptRandomXenocrypt(cleanedQuote);
          break;
        case 'K1 Xenocrypt':
          cipherResult = encryptK1Xenocrypt(cleanedQuote);
          break;
        case 'K2 Xenocrypt':
          cipherResult = encryptK2Xenocrypt(cleanedQuote);
          break;
        case 'K3 Xenocrypt':
          cipherResult = encryptK3Xenocrypt(cleanedQuote);
          break;
        case 'Checkerboard':
          cipherResult = encryptCheckerboard(cleanedQuote);
          break;
        case 'Cryptarithm':
          cipherResult = encryptCryptarithm(cleanedQuote);
          break;
        default:
          throw new Error(`Unknown cipher type: ${cipherType} (normalized: ${normalizedCipherType})`);
      }


      const isK1K2K3Cipher = ['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'K1 Xenocrypt', 'K2 Xenocrypt', 'K3 Xenocrypt'].includes(normalizedCipherType);
      const askForKeyword = isK1K2K3Cipher && Math.random() < 0.15;


      const questionEntry = {
        author: quoteData.author,
        quote: cleanedQuote,
        encrypted: cipherResult.encrypted,
        cipherType: normalizedCipherType,
        key: cipherResult.key || undefined,
        matrix: cipherResult.matrix || undefined,
        decryptionMatrix: 'decryptionMatrix' in cipherResult ? (cipherResult as { decryptionMatrix: number[][] }).decryptionMatrix : undefined,
        portaKeyword: cipherResult.keyword || undefined,
        nihilistPolybiusKey: 'polybiusKey' in cipherResult ? (cipherResult as { polybiusKey: string }).polybiusKey : undefined,
        nihilistCipherKey: 'cipherKey' in cipherResult ? (cipherResult as { cipherKey: string }).cipherKey : undefined,
        checkerboardKeyword: (cipherResult as any).checkerboardKeyword,
        checkerboardR1: (cipherResult as any).checkerboardR1,
        checkerboardR2: (cipherResult as any).checkerboardR2,
        columnarKey: normalizedCipherType === 'Complete Columnar' ? cipherResult.key : undefined,
        fractionationTable: cipherResult.fractionationTable || undefined,
        caesarShift: cipherResult.shift || undefined,
        affineA: cipherResult.a || undefined,
        affineB: cipherResult.b || undefined,
        baconianBinaryType: 'binaryType' in cipherResult ? (cipherResult as { binaryType: string }).binaryType : undefined,
        cryptarithmData: 'cryptarithmData' in cipherResult ? (cipherResult as { cryptarithmData: any }).cryptarithmData : undefined,
        difficulty: 0,
        askForKeyword: askForKeyword,
        points: undefined,
      } as any;

      questionEntry.difficulty = computeDifficulty({
        cipherType: questionEntry.cipherType,
        quote: questionEntry.quote,
        baconianBinaryType: questionEntry.baconianBinaryType,
      });
      questionEntry.points = Math.max(5, Math.round(5 + 25 * questionEntry.difficulty));
      processedQuotes.push(questionEntry);
    }


    const shareData = {
      quoteUUIDs,
      processedQuotes: processedQuotes.map(quote => ({
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
            checkerboardKeyword: (quote as any).checkerboardKeyword,
            checkerboardR1: (quote as any).checkerboardR1,
            checkerboardR2: (quote as any).checkerboardR2,
        columnarKey: quote.columnarKey,
        fractionationTable: quote.fractionationTable,
        caesarShift: quote.caesarShift,
        affineA: quote.affineA,
        affineB: quote.affineB,
        baconianBinaryType: quote.baconianBinaryType,
        cryptarithmData: quote.cryptarithmData,
        difficulty: quote.difficulty
      }))
    };
    localStorage.setItem('codebustersShareData', JSON.stringify(shareData));
    localStorage.setItem('codebustersQuotes', JSON.stringify(processedQuotes));

    setQuotes(processedQuotes);
    setIsLoading(false);
  } catch (error) {
    console.error('Error loading questions from database:', error);
    setError('Failed to load questions from database');
    setIsLoading(false);
  }
};
