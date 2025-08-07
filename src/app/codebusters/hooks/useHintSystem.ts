import { useCallback } from 'react';
import { QuoteData } from '../types';

export const useHintSystem = (
  quotes: QuoteData[],
  activeHints: {[questionIndex: number]: boolean},
  setActiveHints: (hints: {[questionIndex: number]: boolean}) => void,
  revealedLetters: {[questionIndex: number]: {[letter: string]: string}},
  setRevealedLetters: (letters: {[questionIndex: number]: {[letter: string]: string}}) => void,
  setQuotes: (quotes: QuoteData[]) => void
) => {
  // Helper functions to find cribs
  const find2LetterCrib = (cipherText: string, plainText: string) => {
    const commonPairs = ['TH', 'HE', 'AN', 'IN', 'ER', 'RE', 'ON', 'AT', 'ND', 'ST', 'ES', 'EN', 'OF', 'TE', 'ED', 'OR', 'TI', 'HI', 'AS', 'TO'];
    
    for (const pair of commonPairs) {
      const plainIndex = plainText.indexOf(pair);
      if (plainIndex !== -1 && plainIndex + 1 < cipherText.length) {
        const cipherPair = cipherText.substring(plainIndex, plainIndex + 2);
        return { cipher: cipherPair, plain: pair };
      }
    }
    return null;
  };

  const find3LetterCrib = (cipherText: string, plainText: string) => {
    const commonTriplets = ['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW'];
    
    for (const triplet of commonTriplets) {
      const plainIndex = plainText.indexOf(triplet);
      if (plainIndex !== -1 && plainIndex + 2 < cipherText.length) {
        const cipherTriplet = cipherText.substring(plainIndex, plainIndex + 3);
        return { cipher: cipherTriplet, plain: triplet };
      }
    }
    return null;
  };

  const find5LetterCrib = (cipherText: string, plainText: string) => {
    const commonWords = ['THEIR', 'WOULD', 'THERE', 'COULD', 'THINK', 'AFTER', 'NEVER', 'ABOUT', 'AGAIN', 'BEFORE', 'LITTLE', 'SHOULD', 'BECAUSE'];
    
    for (const word of commonWords) {
      const plainIndex = plainText.indexOf(word);
      if (plainIndex !== -1 && plainIndex + 4 < cipherText.length) {
        const cipherWord = cipherText.substring(plainIndex, plainIndex + 5);
        return { cipher: cipherWord, plain: word };
      }
    }
    return null;
  };

  const findSingleLetterCrib = (cipherText: string, plainText: string) => {
    // Find the most frequent letter in the plain text
    const letterCount: { [key: string]: number } = {};
    for (const char of plainText) {
      letterCount[char] = (letterCount[char] || 0) + 1;
    }
    
    const mostFrequent = Object.entries(letterCount)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (mostFrequent) {
      const [letter, count] = mostFrequent;
      if (count > 1) {
        const plainIndex = plainText.indexOf(letter);
        if (plainIndex !== -1 && plainIndex < cipherText.length) {
          return { cipher: cipherText[plainIndex], plain: letter };
        }
      }
    }
    return null;
  };

  const findWordCrib = (cipherText: string, plainText: string) => {
    const commonWords = ['THE', 'AND', 'THAT', 'HAVE', 'FOR', 'NOT', 'WITH', 'YOU', 'THIS', 'BUT', 'HIS', 'FROM', 'THEY', 'SAY', 'HER', 'SHE', 'WILL', 'ONE', 'ALL', 'WOULD', 'THERE', 'THEIR', 'WHAT', 'SO', 'UP', 'OUT', 'IF', 'ABOUT', 'WHO', 'GET', 'WHICH', 'GO', 'ME', 'WHEN', 'MAKE', 'CAN', 'LIKE', 'TIME', 'NO', 'JUST', 'HIM', 'KNOW', 'TAKE', 'PEOPLE', 'INTO', 'YEAR', 'YOUR', 'GOOD', 'SOME', 'COULD', 'THEM', 'SEE', 'OTHER', 'THAN', 'THEN', 'NOW', 'LOOK', 'ONLY', 'COME', 'ITS', 'OVER', 'THINK', 'ALSO', 'BACK', 'AFTER', 'USE', 'TWO', 'HOW', 'OUR', 'WORK', 'FIRST', 'WELL', 'WAY', 'EVEN', 'NEW', 'WANT', 'BECAUSE', 'ANY', 'THESE', 'GIVE', 'DAY', 'MOST', 'US'];
    
    for (const word of commonWords) {
      const plainIndex = plainText.indexOf(word);
      if (plainIndex !== -1 && plainIndex + word.length - 1 < cipherText.length) {
        const cipherWord = cipherText.substring(plainIndex, plainIndex + word.length);
        return { cipher: cipherWord, plain: word };
      }
    }
    return null;
  };

  const findSpanishWordCrib = (cipherText: string, plainText: string) => {
    // Normalize Spanish text for crib finding
    const normalizedPlainText = plainText
      .replace(/Á/g, 'A')
      .replace(/É/g, 'E')
      .replace(/Í/g, 'I')
      .replace(/Ó/g, 'O')
      .replace(/Ú/g, 'U')
      .replace(/Ü/g, 'U')
      .replace(/Ñ/g, 'N');
    
    const spanishWords = ['EL', 'LA', 'DE', 'QUE', 'Y', 'A', 'EN', 'UN', 'ES', 'SE', 'NO', 'TE', 'LO', 'LE', 'DA', 'SU', 'POR', 'SON', 'TRE', 'MAS', 'PARA', 'UNA', 'TAMBIEN', 'MI', 'PERO', 'SUS', 'ME', 'HA', 'SI', 'AL', 'COMO', 'BIEN', 'ESTA', 'ESTE', 'YA', 'CUANDO', 'TODO', 'ESTA', 'VAMOS', 'VER', 'DESPUES', 'HACE', 'DONDE', 'QUIEN', 'ESTAN', 'ASIA', 'HACIA', 'ESTOS', 'ESTAS', 'SINO', 'DURANTE', 'TODOS', 'PUEDE', 'TANTO', 'SIGLO', 'ANTES', 'MISMO', 'DESDE', 'PRIMERA', 'GRAN', 'PARTE', 'TODA', 'TENIA', 'TRES', 'SEGUN', 'MENOS', 'MUNDO', 'AÑO', 'BEN', 'MIENTRAS', 'CASO', 'NUNCA', 'PODER', 'OBRA', 'LUGAR', 'TAN', 'SEGURO', 'HORA', 'MANERA', 'AQUI', 'SER', 'DOS', 'PRIMERO', 'SOCIAL', 'REAL', 'FORMAR', 'TIEMPO', 'ELLA', 'MUCHO', 'GRUPO', 'SEGUIR', 'TIPO', 'ACTUAL', 'CONOCER', 'LADO', 'MOMENTO', 'MOSTRAR', 'PROBLEMA', 'SERVICIO', 'SENTIR', 'NACIONAL', 'HUMANO', 'SERIE', 'IMPORTANTE', 'CUERPO', 'ACTIVIDAD', 'PROCESO', 'INFORMACION', 'PRESENTAR', 'SISTEMA', 'POLITICO', 'ECONOMICO', 'CENTRO', 'COMUNIDAD', 'FINAL', 'RELACION', 'PROGRAMA', 'INTERES', 'NATURAL', 'CULTURA', 'PRODUCCION', 'AMERICA', 'CONDICION', 'PROYECTO', 'SOCIEDAD', 'ACTIVIDAD', 'ORGANIZACION', 'NECESARIO', 'DESARROLLO', 'PRESENTE', 'SITUACION', 'ESPECIAL', 'DIFERENTE', 'VARIO', 'SEGURO', 'ESPECIALMENTE', 'POSIBLE', 'ANTERIOR', 'PRINCIPAL', 'LARGO', 'CIENTIFICO', 'TECNICO', 'MEDICO', 'POLITICO', 'ECONOMICO', 'SOCIAL', 'CULTURAL', 'NATURAL', 'HISTORICO', 'GEOGRAFICO', 'LINGUISTICO', 'PSICOLOGICO', 'FILOSOFICO', 'MATEMATICO', 'FISICO', 'QUIMICO', 'BIOLOGICO', 'MEDICO', 'JURIDICO', 'MILITAR', 'RELIGIOSO', 'ARTISTICO', 'LITERARIO', 'MUSICAL', 'CINEMATOGRAFICO', 'TEATRAL', 'DANZARIO', 'PICTORICO', 'ESCULTORICO', 'ARQUITECTONICO', 'URBANISTICO', 'DISEÑADOR', 'INGENIERO', 'ARQUITECTO', 'MEDICO', 'ABOGADO', 'PROFESOR', 'MAESTRO', 'DOCTOR', 'INGENIERO', 'ARQUITECTO', 'ABOGADO', 'MEDICO', 'PROFESOR', 'MAESTRO', 'DOCTOR', 'INGENIERO', 'ARQUITECTO', 'ABOGADO', 'MEDICO', 'PROFESOR', 'MAESTRO', 'DOCTOR', 'INGENIERO', 'ARQUITECTO', 'ABOGADO', 'MEDICO', 'PROFESOR', 'MAESTRO', 'DOCTOR', 'INGENIERO', 'ARQUITECTO', 'ABOGADO', 'MEDICO', 'PROFESOR', 'MAESTRO', 'DOCTOR'];
    
    for (const word of spanishWords) {
      const plainIndex = normalizedPlainText.indexOf(word);
      if (plainIndex !== -1 && plainIndex + word.length - 1 < cipherText.length) {
        const cipherWord = cipherText.substring(plainIndex, plainIndex + word.length);
        return { cipher: cipherWord, plain: word };
      }
    }
    return null;
  };

  // Get hint content for different cipher types
  const getHintContent = useCallback((quote: QuoteData) => {
    const cleanCipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, '');
    const cleanPlainText = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
    
    switch (quote.cipherType) {
      case 'Porta':
        return quote.portaKeyword ? `Keyword: ${quote.portaKeyword}` : 'No keyword available';
      case 'Caesar':
        return quote.caesarShift !== undefined ? `Shift: ${quote.caesarShift}` : 'No shift available';
      case 'Affine':
        return quote.affineA !== undefined && quote.affineB !== undefined 
          ? `a = ${quote.affineA}, b = ${quote.affineB}` 
          : 'No coefficients available';
      case 'Hill 2x2':
      case 'Hill 3x3':
        // Find a 2-letter crib from the cipher text
        const hillCrib = find2LetterCrib(cleanCipherText, cleanPlainText);
        return hillCrib ? `Crib: ${hillCrib.cipher} → ${hillCrib.plain}` : 'No 2-letter crib found';
      case 'Fractionated Morse':
        // Find a 3-letter crib from the cipher text
        const morseCrib = find3LetterCrib(cleanCipherText, cleanPlainText);
        return morseCrib ? `Crib: ${morseCrib.cipher} → ${morseCrib.plain}` : 'No 3-letter crib found';
      case 'Baconian':
        // Find a 5-letter crib from the cipher text
        const baconianCrib = find5LetterCrib(cleanCipherText, cleanPlainText);
        return baconianCrib ? `Crib: ${baconianCrib.cipher} → ${baconianCrib.plain}` : 'No 5-letter crib found';
      case 'Nihilist':
        // Find a single letter crib
        const nihilistCrib = findSingleLetterCrib(cleanCipherText, cleanPlainText);
        return nihilistCrib ? `Crib: ${nihilistCrib.cipher} → ${nihilistCrib.plain}` : 'No single letter crib found';
      case 'Columnar Transposition':
        // Find the longest word in the original quote
        const words = quote.quote.toUpperCase().replace(/[^A-Z\s]/g, '').split(/\s+/).filter(word => word.length > 0);
        const longestWord = words.reduce((longest, current) => 
          current.length > longest.length ? current : longest, '');
        return longestWord ? `Crib: ${longestWord}` : 'No word crib found';
      case 'Xenocrypt':
        // Find a Spanish word crib
        const xenocryptCrib = findSpanishWordCrib(cleanCipherText, cleanPlainText);
        return xenocryptCrib ? `Crib: ${xenocryptCrib.cipher} → ${xenocryptCrib.plain}` : 'No Spanish word crib found';
      case 'K1 Aristocrat':
      case 'K2 Aristocrat':
      case 'K3 Aristocrat':
      case 'Random Aristocrat':
      case 'K1 Patristocrat':
      case 'K2 Patristocrat':
      case 'K3 Patristocrat':
      case 'Random Patristocrat':
        // Find a word crib for aristocrat/patristocrat
        const aristocratCrib = findWordCrib(cleanCipherText, cleanPlainText);
        return aristocratCrib ? `Crib: ${aristocratCrib.cipher} → ${aristocratCrib.plain}` : 'No word crib found';
      case 'Atbash':
        // Find a single letter crib for atbash
        const atbashCrib = findSingleLetterCrib(cleanCipherText, cleanPlainText);
        return atbashCrib ? `Crib: ${atbashCrib.cipher} → ${atbashCrib.plain}` : 'No single letter crib found';
      default:
        return 'Click for a random letter hint';
    }
  }, []);

  // Handle hint functionality
  const handleHintClick = useCallback((questionIndex: number) => {
    const quote = quotes[questionIndex];
    if (!quote) return;

    // Check if this cipher type has a crib available
    const hintContent = getHintContent(quote);
    const hasCrib = hintContent.includes('Crib:') && !hintContent.includes('No crib found');
    
    if (hasCrib) {
      // If crib is not shown yet, show it
      if (!activeHints[questionIndex]) {
        setActiveHints({
          ...activeHints,
          [questionIndex]: true
        });
      } else {
        // If crib is already shown, reveal a random letter
        revealRandomLetter(questionIndex);
      }
    } else {
      // For ciphers without cribs, always reveal a random correct letter
      revealRandomLetter(questionIndex);
    }
  }, [quotes, activeHints, setActiveHints, getHintContent, revealRandomLetter]);

  // Reveal a random correct letter for substitution ciphers
  const revealRandomLetter = useCallback((questionIndex: number) => {
    const quote = quotes[questionIndex];
    if (!quote) return;

    // Get all cipher letters that haven't been revealed yet
    const availableLetters = quote.encrypted
      .toUpperCase()
      .split('')
      .filter(char => /[A-Z]/.test(char))
      .filter(char => !revealedLetters[questionIndex]?.[char]);

    if (availableLetters.length === 0) return;

    // Pick a random cipher letter
    const randomCipherLetter = availableLetters[Math.floor(Math.random() * availableLetters.length)];
    
    // Get the correct plain letter for this cipher letter
    let correctPlainLetter = '';
    
    if (quote.cipherType === 'Caesar' && quote.caesarShift !== undefined) {
      const cipherIndex = randomCipherLetter.charCodeAt(0) - 65;
      const plainIndex = (cipherIndex - quote.caesarShift + 26) % 26;
      correctPlainLetter = String.fromCharCode(plainIndex + 65);
    } else if (quote.cipherType === 'Atbash') {
      const cipherIndex = randomCipherLetter.charCodeAt(0) - 65;
      const plainIndex = 25 - cipherIndex;
      correctPlainLetter = String.fromCharCode(plainIndex + 65);
    } else if (quote.cipherType === 'Affine' && quote.affineA !== undefined && quote.affineB !== undefined) {
      // For Affine cipher, we need to find the modular inverse
      const cipherIndex = randomCipherLetter.charCodeAt(0) - 65;
      // Find modular inverse of affineA mod 26
      let aInverse = 1;
      for (let i = 1; i < 26; i++) {
        if ((quote.affineA * i) % 26 === 1) {
          aInverse = i;
          break;
        }
      }
      const plainIndex = (aInverse * (cipherIndex - quote.affineB + 26)) % 26;
      correctPlainLetter = String.fromCharCode(plainIndex + 65);
    } else if (quote.key && ['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Patristocrat'].includes(quote.cipherType)) {
      // For aristocrat/patristocrat ciphers, find the plain letter from the key
      const keyIndex = quote.key.indexOf(randomCipherLetter);
      if (keyIndex !== -1) {
        correctPlainLetter = String.fromCharCode(keyIndex + 65);
      }
    } else if (quote.cipherType === 'Porta' && quote.portaKeyword) {
      // For Porta cipher, find the position and get the corresponding plain letter
      const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, '');
      const plainText = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
      const cipherIndex = cipherText.indexOf(randomCipherLetter);
      
      if (cipherIndex !== -1 && cipherIndex < plainText.length) {
        // Get the corresponding plain letter from the original text
        correctPlainLetter = plainText[cipherIndex];
      }
    } else if ((quote.cipherType === 'Hill 2x2' || quote.cipherType === 'Hill 3x3') && quote.matrix) {
      // For Hill cipher, we need to decrypt using the matrix inverse
      // This is complex, so we'll just reveal a letter from the original quote
      const originalQuote = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
      const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, '');
      
      // Find the position of the random cipher letter in the encrypted text
      const cipherIndex = cipherText.indexOf(randomCipherLetter);
      if (cipherIndex !== -1 && cipherIndex < originalQuote.length) {
        correctPlainLetter = originalQuote[cipherIndex];
      }
    } else if (quote.cipherType === 'Fractionated Morse' && quote.fractionationTable) {
      // For Fractionated Morse, reveal the triplet that maps to this cipher letter
      for (const [triplet, letter] of Object.entries(quote.fractionationTable)) {
        if (letter === randomCipherLetter) {
          // Instead of revealing a plain letter, reveal the triplet
          // This will be used to update the replacement table
          correctPlainLetter = triplet; // Store the triplet as the "plain letter"
          break;
        }
      }
    } else if (quote.cipherType === 'Xenocrypt') {
      // For Xenocrypt, handle Spanish text normalization
      const normalizedOriginal = quote.quote.toUpperCase()
        .replace(/Á/g, 'A')
        .replace(/É/g, 'E')
        .replace(/Í/g, 'I')
        .replace(/Ó/g, 'O')
        .replace(/Ú/g, 'U')
        .replace(/Ü/g, 'U')
        .replace(/Ñ/g, 'N')
        .replace(/[^A-Z]/g, '');
      const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, '');
      
      // Find the position of the random cipher letter in the encrypted text
      const cipherIndex = cipherText.indexOf(randomCipherLetter);
      if (cipherIndex !== -1 && cipherIndex < normalizedOriginal.length) {
        correctPlainLetter = normalizedOriginal[cipherIndex];
      }
    } else {
      // For any other cipher type, try to find the letter from the original quote
      const originalQuote = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
      const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, '');
      
      // Find the position of the random cipher letter in the encrypted text
      const cipherIndex = cipherText.indexOf(randomCipherLetter);
      if (cipherIndex !== -1 && cipherIndex < originalQuote.length) {
        correctPlainLetter = originalQuote[cipherIndex];
      }
    }

    if (correctPlainLetter) {
      // Update revealed letters state
      setRevealedLetters(prev => ({
        ...prev,
        [questionIndex]: {
          ...prev[questionIndex],
          [randomCipherLetter]: correctPlainLetter
        }
      }));

      // Update the solution - handle Fractionated Morse differently
      setQuotes(prev => prev.map((q, index) => {
        if (index === questionIndex) {
          if (q.cipherType === 'Fractionated Morse') {
            // For Fractionated Morse, update the replacement table AND the cipher inputs
            // The correctPlainLetter is actually a triplet
            const newSolution = { 
              ...q.solution, 
              [`replacement_${correctPlainLetter}`]: randomCipherLetter 
            };
            
            // Also update all cipher inputs that show this letter with the triplet
            newSolution[randomCipherLetter] = correctPlainLetter;
            
            return { 
              ...q, 
              solution: newSolution
            };
          } else {
            // For other ciphers, update normally
            return { 
              ...q, 
              solution: { ...q.solution, [randomCipherLetter]: correctPlainLetter } 
            };
          }
        }
        return q;
      }));
    }
  }, [quotes, revealedLetters, setRevealedLetters, setQuotes]);

  return {
    getHintContent,
    handleHintClick
  };
};
