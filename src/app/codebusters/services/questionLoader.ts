import { QuoteData } from '../types';
import { getEventOfflineQuestions } from '@/app/utils/storage';
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
  encryptXenocrypt,
  encryptCheckerboard
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
  setIsLoading(true);
  setError(null);
  
  // Always reset the timer and submission state for a new test
  const testParamsStr = localStorage.getItem('testParams');
  const testParams = testParamsStr ? JSON.parse(testParamsStr) : {};
  const eventName = testParams.eventName || 'Codebusters';
  const preferences = loadPreferences(eventName);
  setTimeLeft(preferences.timeLimit * 60); // Use preferences for time limit
  setIsTestSubmitted(false);
  setTestScore(null);
  localStorage.removeItem('codebustersTimeLeft');
  localStorage.removeItem('codebustersIsTestSubmitted');
  localStorage.removeItem('codebustersTestScore');

  try {
    // Get test parameters from localStorage
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
    
    // Map subtopic names to cipher type names for Codebusters
    if (testParams.eventName === 'Codebusters') {
      const subtopicToCipherMap: { [key: string]: string } = {
        // Handle lowercase versions (from old format)
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
        'xenocrypt': 'Xenocrypt',
        'checkerboard': 'Checkerboard',
        // Handle correct format (from practice page)
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
        'Xenocrypt': 'Xenocrypt',
        'Checkerboard': 'Checkerboard',
        // Handle standalone entries (should be mapped to Misc variants)
        'aristocrat': 'Random Aristocrat',
        'patristocrat': 'Random Patristocrat'
      };
    
      cipherTypes = cipherTypes.map(subtopic => 
        subtopicToCipherMap[subtopic] || subtopic
      );
    }

    // Determine cipher types in advance for each question
    const division = testParams.division || 'any';
    
    // Define division-based cipher types
    const divisionBCipherTypes = {
              'B': ['K1 Aristocrat', 'K2 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'Random Patristocrat', 'Baconian', 'Fractionated Morse', 'Complete Columnar', 'Xenocrypt', 'Porta', 'Nihilist', 'Atbash', 'Caesar', 'Affine', 'Checkerboard'],
              'C': ['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Patristocrat', 'Baconian', 'Xenocrypt', 'Fractionated Morse', 'Porta', 'Complete Columnar', 'Nihilist', 'Hill 2x2', 'Hill 3x3', 'Checkerboard']
    };
    
    const availableCipherTypes = cipherTypes && cipherTypes.length > 0 
      ? cipherTypes 
      : (division === 'B' || division === 'C') 
        ? divisionBCipherTypes[division] 
        : ['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine', 'Hill 2x2', 'Hill 3x3', 'Porta', 'Baconian', 'Nihilist', 'Fractionated Morse', 'Complete Columnar', 'Xenocrypt'];

    // Determine cipher types for each question in advance
    const questionCipherTypes: QuoteData['cipherType'][] = [];
    for (let i = 0; i < questionCount; i++) {
      const cipherType = availableCipherTypes[Math.floor(Math.random() * availableCipherTypes.length)] as QuoteData['cipherType'];
      questionCipherTypes.push(cipherType);
    }

    // Count xenocrypt vs non-xenocrypt questions
    const xenocryptCount = questionCipherTypes.filter(type => type === 'Xenocrypt').length;
    const nonXenocryptCount = questionCount - xenocryptCount;
    
    console.log(`🔍 Quote requirements: ${nonXenocryptCount} English, ${xenocryptCount} Spanish, total: ${questionCount}`);
    console.log(`🔍 Cipher types:`, questionCipherTypes);

    // Fetch quotes (check offline first, then try network)
    let englishQuotes: Array<{id: string, author: string, quote: string}> = [];
    let spanishQuotes: Array<{id: string, author: string, quote: string}> = [];
    
    // Check if we're offline first
    const isOffline = !navigator.onLine;
    if (isOffline) {
      // Use offline data immediately when offline
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
          throw new Error(`Not enough offline English quotes. Need ${nonXenocryptCount}, got ${storedEn.length}`);
        }
        englishQuotes = storedEn.slice(0, nonXenocryptCount);
      }
      if (xenocryptCount > 0) {
        if (storedEs.length < xenocryptCount) {
          throw new Error(`Not enough offline Spanish quotes. Need ${xenocryptCount}, got ${storedEs.length}`);
        }
        spanishQuotes = storedEs.slice(0, xenocryptCount);
      }
    } else {
      // Online: try API first, fallback to offline
      try {
        if (nonXenocryptCount > 0) {
          const englishResponse = await fetch(`/api/quotes?language=en&limit=${Math.min(nonXenocryptCount, 200)}`);
          if (!englishResponse.ok) throw new Error('en failed');
          const englishData = await englishResponse.json();
          englishQuotes = englishData.data?.quotes || englishData.quotes || [];
        }
        if (xenocryptCount > 0) {
          const spanishResponse = await fetch(`/api/quotes?language=es&limit=${Math.min(xenocryptCount, 200)}`);
          if (!spanishResponse.ok) throw new Error('es failed');
          const spanishData = await spanishResponse.json();
          spanishQuotes = spanishData.data?.quotes || spanishData.quotes || [];
        }
      } catch {
        // Fallback to offline data
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
            throw new Error(`Not enough offline English quotes. Need ${nonXenocryptCount}, got ${storedEn.length}`);
          }
          englishQuotes = storedEn.slice(0, nonXenocryptCount);
        }
        if (xenocryptCount > 0) {
          if (storedEs.length < xenocryptCount) {
            throw new Error(`Not enough offline Spanish quotes. Need ${xenocryptCount}, got ${storedEs.length}`);
          }
          spanishQuotes = storedEs.slice(0, xenocryptCount);
        }
      }
    }

    // Verify we have enough quotes before processing
    if (nonXenocryptCount > 0 && englishQuotes.length < nonXenocryptCount) {
      throw new Error(`Not enough English quotes. Need ${nonXenocryptCount}, got ${englishQuotes.length}`);
    }
    if (xenocryptCount > 0 && spanishQuotes.length < xenocryptCount) {
      throw new Error(`Not enough Spanish quotes. Need ${xenocryptCount}, got ${spanishQuotes.length}`);
    }
    
    console.log(`🔍 Quote validation passed: ${englishQuotes.length} English, ${spanishQuotes.length} Spanish quotes available`);
    
    // Prepare quotes for processing
    const processedQuotes: QuoteData[] = [];
    const quoteUUIDs: Array<{id: string, language: string, cipherType: string}> = [];
    let englishQuoteIndex = 0;
    let spanishQuoteIndex = 0;

    for (let i = 0; i < questionCount; i++) {
      const cipherType = questionCipherTypes[i];
      // Normalize cipher type to handle case sensitivity
      const normalizedCipherType = cipherType.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      let quoteData: { quote: string; author: string; originalIndex: number; isSpanish?: boolean; id?: string };

      if (cipherType === 'Xenocrypt') {
        // Use Spanish quote for xenocrypt
        if (spanishQuoteIndex >= spanishQuotes.length) {
          throw new Error(`Not enough Spanish quotes available for xenocrypt questions. Need ${xenocryptCount}, got ${spanishQuotes.length}`);
        }
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
      } else {
        // Use English quote for non-xenocrypt
        if (englishQuoteIndex >= englishQuotes.length) {
          throw new Error(`Not enough English quotes available for non-xenocrypt questions. Need ${nonXenocryptCount}, got ${englishQuotes.length}`);
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

      // Encrypt the quote based on cipher type
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
          cipherResult = encryptK1Aristocrat(quoteData.quote);
          break;
        case 'K2 Aristocrat':
          cipherResult = encryptK2Aristocrat(quoteData.quote);
          break;
        case 'K3 Aristocrat':
          cipherResult = encryptK3Aristocrat(quoteData.quote);
          break;
        case 'K1 Patristocrat':
          cipherResult = encryptK1Patristocrat(quoteData.quote);
          break;
        case 'K2 Patristocrat':
          cipherResult = encryptK2Patristocrat(quoteData.quote);
          break;
        case 'K3 Patristocrat':
          cipherResult = encryptK3Patristocrat(quoteData.quote);
          break;
        case 'Random Aristocrat':
          cipherResult = encryptRandomAristocrat(quoteData.quote);
          break;
        case 'Random Patristocrat':
          cipherResult = encryptRandomPatristocrat(quoteData.quote);
          break;
        case 'Caesar':
          cipherResult = encryptCaesar(quoteData.quote);
          break;
        case 'Atbash':
          cipherResult = encryptAtbash(quoteData.quote);
          break;
        case 'Affine':
          cipherResult = encryptAffine(quoteData.quote);
          break;
        case 'Hill 2x2':
          cipherResult = encryptHill2x2(quoteData.quote);
          break;
        case 'Hill 3x3':
          cipherResult = encryptHill3x3(quoteData.quote);
          break;
        case 'Porta':
          cipherResult = encryptPorta(quoteData.quote);
          break;
        case 'Baconian':
          cipherResult = encryptBaconian(quoteData.quote);
          break;
        case 'Nihilist':
          cipherResult = encryptNihilist(quoteData.quote);
          break;
        case 'Fractionated Morse':
          cipherResult = encryptFractionatedMorse(quoteData.quote);
          break;
        case 'Complete Columnar':
          cipherResult = encryptColumnarTransposition(quoteData.quote);
          break;
        case 'Xenocrypt':
          cipherResult = encryptXenocrypt(quoteData.quote);
          break;
        case 'Checkerboard':
          cipherResult = encryptCheckerboard(quoteData.quote);
          break;
        default:
          throw new Error(`Unknown cipher type: ${cipherType} (normalized: ${normalizedCipherType})`);
      }

      processedQuotes.push({
        author: quoteData.author,
        quote: quoteData.quote,
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
        difficulty: Math.random() * 0.8 + 0.2,
      });
    }

    // Store the complete quote data for sharing (including encryption details)
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
        difficulty: quote.difficulty
      }))
    };
    localStorage.setItem('codebustersShareData', JSON.stringify(shareData));

    setQuotes(processedQuotes);
    setIsLoading(false);
  } catch (error) {
    console.error('Error loading questions from database:', error);
    setError('Failed to load questions from database');
    setIsLoading(false);
  }
};
