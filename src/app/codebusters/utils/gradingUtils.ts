import { QuoteData } from '../types';


const generateKeywordAlphabet = (keyword: string): string => {
  const cleanKeyword = keyword.toUpperCase().replace(/[^A-Z]/g, '');
  const used = new Set<string>();
  const result: string[] = [];
  

  for (const char of cleanKeyword) {
    if (!used.has(char)) {
      used.add(char);
      result.push(char);
    }
  }
  

  for (const char of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    if (!used.has(char)) {
      result.push(char);
    }
  }
  
  return result.join('');
};

export interface GradingResult {
  totalInputs: number;
  correctInputs: number;
  filledInputs: number;
  score: number;
  maxScore: number;
  attemptedScore: number;
}

/**
 * Calculate the grade for a single cipher question
 * Returns the number of correct inputs out of total inputs
 */

function getSuggestedPoints(quote: QuoteData): number {

  const cipherMultipliers: { [key: string]: number } = {

    'Atbash': 1.0,
    'Caesar': 1.0,
    'Baconian': 1.2,
    

    'Affine': 1.8,
    'Porta': 1.6,
    'Checkerboard': 1.7,
    

    'K1 Aristocrat': 2.2,
    'K1 Patristocrat': 2.8,
    'K1 Xenocrypt': 2.5,
    'Hill 2x2': 2.8,
    'Nihilist': 2.3,
    

    'K2 Aristocrat': 3.2,
    'K2 Patristocrat': 3.8,
    'K2 Xenocrypt': 3.5,
    'Hill 3x3': 3.8,
    'Fractionated Morse': 3.6,
    'Complete Columnar': 3.4,
    

    'K3 Aristocrat': 4.2,
    'K3 Patristocrat': 4.8,
    'K3 Xenocrypt': 4.5,
    'Random Aristocrat': 4.0,
    'Random Patristocrat': 4.2,
    'Random Xenocrypt': 4.8,
    'Cryptarithm': 4.5
  };


  const baseMultiplier = cipherMultipliers[quote.cipherType] || 2.0;
  

  let baconianMultiplier = baseMultiplier;
  if (quote.cipherType === 'Baconian' && quote.baconianBinaryType) {
    const binaryType = quote.baconianBinaryType;
    

    if (binaryType === 'A/B') {
      baconianMultiplier = 1.0;
    } else if (binaryType === 'Vowels/Consonants' || binaryType === 'Odd/Even') {
      baconianMultiplier = 1.3;
    } else if (binaryType.includes(' vs ')) {

      baconianMultiplier = 1.4;
    } else {

      baconianMultiplier = 1.8;
    }
  }
  

  const quoteLength = quote.quote.replace(/[^A-Za-z]/g, '').length;
  let lengthMultiplier = 1.0;
  
  if (quoteLength < 50) {
    lengthMultiplier = 0.8;
  } else if (quoteLength < 100) {
    lengthMultiplier = 1.0;
  } else if (quoteLength < 200) {
    lengthMultiplier = 1.2;
  } else {
    lengthMultiplier = 1.4;
  }
  

  const finalPoints = Math.round(50 * baconianMultiplier * lengthMultiplier);
  

  return Math.max(2.5, Math.min(20, Number((finalPoints / 7).toFixed(1))));
}

export function calculateCipherGrade(quote: QuoteData, quoteIndex: number, hintedLetters: {[questionIndex: number]: {[letter: string]: boolean}} = {}, questionPoints: {[key: number]: number} = {}): GradingResult {
  const questionPointValue = questionPoints[quoteIndex] || getSuggestedPoints(quote);
  let totalInputs = 0;
  let correctInputs = 0;
  let filledInputs = 0;


  if (['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Aristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine', 'Random Xenocrypt', 'K1 Xenocrypt', 'K2 Xenocrypt'].includes(quote.cipherType)) {
    if (quote.solution && Object.keys(quote.solution).length > 0) {

      const uniqueLetters = new Set(quote.encrypted.replace(/[^A-Z]/g, ''));
      totalInputs = uniqueLetters.size;
      

      for (const cipherLetter of uniqueLetters) {
        const userAnswer = quote.solution[cipherLetter];
        const isHinted = Boolean(hintedLetters[quoteIndex]?.[cipherLetter]);
        

        if (isHinted === true) {
          continue;
        }
        

        if (userAnswer && userAnswer.trim().length > 0) {
          filledInputs++;
        }
        

        let isCorrect = false;
        
        if (quote.cipherType === 'Caesar' && quote.caesarShift !== undefined) {
          const shift = quote.caesarShift;
          const expectedPlainLetter = String.fromCharCode(((cipherLetter.charCodeAt(0) - 65 - shift + 26) % 26) + 65);
          isCorrect = userAnswer === expectedPlainLetter;
        } else if (quote.cipherType === 'Atbash') {
          const atbashMap = 'ZYXWVUTSRQPONMLKJIHGFEDCBA';
          const expectedPlainLetter = atbashMap[cipherLetter.charCodeAt(0) - 65];
          isCorrect = userAnswer === expectedPlainLetter;
        } else if (quote.cipherType === 'Affine' && quote.affineA !== undefined && quote.affineB !== undefined) {
          const a = quote.affineA;
          const b = quote.affineB;

          let aInverse = 0;
          for (let i = 1; i < 26; i++) {
            if ((a * i) % 26 === 1) {
              aInverse = i;
              break;
            }
          }
          const expectedPlainLetter = String.fromCharCode(((aInverse * (cipherLetter.charCodeAt(0) - 65 - b + 26)) % 26) + 65);
          isCorrect = userAnswer === expectedPlainLetter;
        } else if (['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'K1 Xenocrypt', 'K2 Xenocrypt'].includes(quote.cipherType)) {

          const keyword = quote.key || '';
          const plainAlphabet = generateKeywordAlphabet(keyword);
          const cipherAlphabet = quote.cipherType.includes('K1') || quote.cipherType.includes('K3') 
            ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' 
            : generateKeywordAlphabet(keyword);
          

          const shift = quote.cipherType.includes('K3') ? 1 : 0;
          const shiftedCipherAlphabet = cipherAlphabet.slice(shift) + cipherAlphabet.slice(0, shift);
          
          const cipherIndex = shiftedCipherAlphabet.indexOf(cipherLetter);
          if (cipherIndex !== -1) {
            const expectedPlainLetter = plainAlphabet[cipherIndex];
            isCorrect = userAnswer === expectedPlainLetter;
          }
        } else if (['Random Aristocrat', 'Random Patristocrat', 'Random Xenocrypt'].includes(quote.cipherType) && quote.key) {

          const keyIndex = quote.key.indexOf(cipherLetter);
          if (keyIndex !== -1) {
            const expectedPlainLetter = String.fromCharCode(keyIndex + 65);
            isCorrect = userAnswer === expectedPlainLetter;
          } else {
            isCorrect = false;
          }
        } else {

          isCorrect = false;
        }
        
        if (isCorrect) {
          correctInputs++;
        }
      }
    }
  }
  

  else if (quote.cipherType === 'Hill 2x2' || quote.cipherType === 'Hill 3x3') {
    if (quote.hillSolution) {
      const matrixSize = quote.cipherType === 'Hill 2x2' ? 2 : 3;
      
      if (quote.cipherType === 'Hill 2x2') {

        const matrixWeight = 0.5;
        const plaintextWeight = 0.5;
        

        const expectedMatrix = quote.matrix;
        let matrixInputs = 0;
        let matrixFilled = 0;
        let matrixCorrect = 0;
        
        if (expectedMatrix) {
          for (let i = 0; i < expectedMatrix.length; i++) {
            for (let j = 0; j < expectedMatrix[i].length; j++) {
              matrixInputs++;
              const userAnswer = quote.hillSolution.matrix[i]?.[j] || '';
              const expected = expectedMatrix[i][j].toString();
              
              if (userAnswer && userAnswer.trim().length > 0) {
                matrixFilled++;
                if (userAnswer.trim() === expected) {
                  matrixCorrect++;
                }
              }
            }
          }
        }
        

        const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
        let plaintextInputs = 0;
        let plaintextFilled = 0;
        let plaintextCorrect = 0;
        

        const cleanPlainLength = expectedPlaintext.length;
        const requiredLength = Math.ceil(cleanPlainLength / matrixSize) * matrixSize;
        const paddingCount = requiredLength - cleanPlainLength;
        const actualPlaintextSlots = requiredLength - paddingCount;
        
        for (let i = 0; i < actualPlaintextSlots; i++) {
          plaintextInputs++;
          const userAnswer = quote.hillSolution.plaintext[i] || '';
          const expected = expectedPlaintext[i] || '';
          
          if (userAnswer && userAnswer.trim().length > 0) {
            plaintextFilled++;
            if (userAnswer.trim() === expected) {
              plaintextCorrect++;
            }
          }
        }
        

        totalInputs = matrixInputs + plaintextInputs;
        filledInputs = matrixFilled + plaintextFilled;
        correctInputs = matrixCorrect + plaintextCorrect;
        

        const matrixAttemptedScore = matrixInputs > 0 ? (matrixFilled / matrixInputs) * questionPointValue * matrixWeight : 0;
        const plaintextAttemptedScore = plaintextInputs > 0 ? (plaintextFilled / plaintextInputs) * questionPointValue * plaintextWeight : 0;
        const hillAttemptedScore = matrixAttemptedScore + plaintextAttemptedScore;
        

        const matrixFinalScore = matrixFilled > 0 ? (matrixCorrect / matrixFilled) * matrixAttemptedScore : 0;
        const plaintextFinalScore = plaintextFilled > 0 ? (plaintextCorrect / plaintextFilled) * plaintextAttemptedScore : 0;
        const hillScore = matrixFinalScore + plaintextFinalScore;
        

        return {
          totalInputs,
          correctInputs,
          filledInputs,
          score: hillScore,
          maxScore: questionPointValue,
          attemptedScore: hillAttemptedScore
        };
      } else {

        const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
        let plaintextInputs = 0;
        let plaintextFilled = 0;
        let plaintextCorrect = 0;
        

        const cleanPlainLength = expectedPlaintext.length;
        const requiredLength = Math.ceil(cleanPlainLength / matrixSize) * matrixSize;
        const paddingCount = requiredLength - cleanPlainLength;
        const actualPlaintextSlots = requiredLength - paddingCount;
        
        for (let i = 0; i < actualPlaintextSlots; i++) {
          plaintextInputs++;
          const userAnswer = quote.hillSolution.plaintext[i] || '';
          const expected = expectedPlaintext[i] || '';
          
          if (userAnswer && userAnswer.trim().length > 0) {
            plaintextFilled++;
            if (userAnswer.trim() === expected) {
              plaintextCorrect++;
            }
          }
        }
        

        totalInputs = plaintextInputs;
        filledInputs = plaintextFilled;
        correctInputs = plaintextCorrect;
        

        const attemptedScore = totalInputs > 0 ? (filledInputs / totalInputs) * questionPointValue : 0;
        

        const score = filledInputs > 0 ? (correctInputs / filledInputs) * attemptedScore : 0;
        

        return {
          totalInputs,
          correctInputs,
          filledInputs,
          score,
          maxScore: questionPointValue,
          attemptedScore
        };
      }
    }
  }
  

  else if (quote.cipherType === 'Complete Columnar') {
    if (quote.solution?.decryptedText) {
      const decryptedText = quote.solution.decryptedText.trim();
      const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
      const expectedLength = expectedPlaintext.length;
      totalInputs = expectedLength;
      

      for (let i = 0; i < expectedLength; i++) {
        const userChar = i < decryptedText.length ? decryptedText[i] : '';
        const expectedChar = expectedPlaintext[i];
        
        if (userChar && userChar.trim().length > 0) {
          filledInputs++;
          if (userChar.trim() === expectedChar) {
            correctInputs++;
          }
        }
      }
    }
  }
  

  else if (quote.cipherType === 'Nihilist') {
    if (quote.nihilistSolution && Object.keys(quote.nihilistSolution).length > 0) {

      const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
      totalInputs = expectedPlaintext.length;
      

      for (let i = 0; i < totalInputs; i++) {
        const userAnswer = quote.nihilistSolution[i];
        if (userAnswer && userAnswer.trim().length > 0) {
          filledInputs++;

          if (userAnswer.trim() === expectedPlaintext[i]) {
            correctInputs++;
          }
        }
      }
    }
  }
  

  else if (quote.cipherType === 'Baconian') {
    if (quote.solution && Object.keys(quote.solution).length > 0) {

      const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
      totalInputs = expectedPlaintext.length;
      

      for (let i = 0; i < totalInputs; i++) {
        const userAnswer = quote.solution[i];
        if (userAnswer && userAnswer.trim().length > 0) {
          filledInputs++;

          if (userAnswer.trim() === expectedPlaintext[i]) {
            correctInputs++;
          }
        }
      }
    }
  }
  

  else if (quote.cipherType === 'Porta') {
    if (quote.solution && Object.keys(quote.solution).length > 0) {

      const uniqueLetters = new Set(quote.encrypted.replace(/[^A-Z]/g, ''));
      totalInputs = uniqueLetters.size;
      

      for (const cipherLetter of uniqueLetters) {
        const plainLetter = quote.solution[cipherLetter];
        if (plainLetter && plainLetter.trim().length > 0) {
          filledInputs++;


          let isCorrect = false;
          

          const portaTable = {
            'AB': 'NOPQRSTUVWXYZABCDEFGHIJKLM',
            'CD': 'OPQRSTUVWXYZNABCDEFGHIJKLM', 
            'EF': 'PQRSTUVWXYZNOABCDEFGHIJKLM',
            'GH': 'QRSTUVWXYZNOPABCDEFGHIJKLM',
            'IJ': 'RSTUVWXYZNOPQABCDEFGHIJKLM',
            'KL': 'STUVWXYZNOPQRABCDEFGHIJKLM',
            'MN': 'TUVWXYZNOPQRSABCDEFGHIJKLM',
            'OP': 'UVWXYZNOPQRSTABCDEFGHIJKLM',
            'QR': 'VWXYZNOPQRSTUABCDEFGHIJKLM',
            'ST': 'WXYZNOPQRSTUVABCDEFGHIJKLM',
            'UV': 'XYZNOPQRSTUVWABCDEFGHIJKLM',
            'WX': 'YZNOPQRSTUVWXABCDEFGHIJKLM',
            'YZ': 'ZNOPQRSTUVWXYABCDEFGHIJKLM'
          };
          

          const charToPair: { [key: string]: string } = {
            'A': 'AB', 'B': 'AB',
            'C': 'CD', 'D': 'CD',
            'E': 'EF', 'F': 'EF',
            'G': 'GH', 'H': 'GH',
            'I': 'IJ', 'J': 'IJ',
            'K': 'KL', 'L': 'KL',
            'M': 'MN', 'N': 'MN',
            'O': 'OP', 'P': 'OP',
            'Q': 'QR', 'R': 'QR',
            'S': 'ST', 'T': 'ST',
            'U': 'UV', 'V': 'UV',
            'W': 'WX', 'X': 'WX',
            'Y': 'YZ', 'Z': 'YZ'
          };
          

          const encryptedLetters = quote.encrypted.replace(/[^A-Z]/g, '');
          const cipherLetterIndex = encryptedLetters.indexOf(cipherLetter);
          
          if (cipherLetterIndex !== -1 && quote.portaKeyword) {

            const keywordChar = quote.portaKeyword[cipherLetterIndex % quote.portaKeyword.length];
            const pair = charToPair[keywordChar];
            const portaRow = portaTable[pair];
            

            const headerRow = 'ABCDEFGHIJKLM';
            let expectedPlainChar;
            

            const headerIndex = headerRow.indexOf(cipherLetter);
            if (headerIndex !== -1) {

              expectedPlainChar = portaRow[headerIndex];
            } else {

              const keyRowIndex = portaRow.indexOf(cipherLetter);
              if (keyRowIndex !== -1) {
                expectedPlainChar = headerRow[keyRowIndex];
              }
            }
            

            isCorrect = expectedPlainChar && plainLetter.trim().toUpperCase() === expectedPlainChar;
          }
          if (isCorrect) {
            correctInputs++;
          }
        }
      }
    }
  }
  

  else if (quote.cipherType === 'Fractionated Morse') {
    if (quote.solution && Object.keys(quote.solution).length > 0) {

      const uniqueLetters = new Set(quote.encrypted.replace(/[^A-Z]/g, ''));
      totalInputs = uniqueLetters.size;
      

      for (const [cipherLetter, triplet] of Object.entries(quote.solution)) {
        const isHinted = Boolean(hintedLetters[quoteIndex]?.[cipherLetter]);

        if (!isHinted && triplet && triplet.trim().length === 3) {
          filledInputs++;

          if (quote.fractionationTable && quote.fractionationTable[triplet] === cipherLetter) {
            correctInputs++;
          }
        }
      }
    }
  }
  

  else if (quote.cipherType === 'Checkerboard') {
    if (quote.checkerboardSolution && Object.keys(quote.checkerboardSolution).length > 0) {

      const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
      totalInputs = expectedPlaintext.length;
      

      for (let i = 0; i < totalInputs; i++) {
        const userAnswer = quote.checkerboardSolution[i];
        if (userAnswer && userAnswer.trim().length > 0) {
          filledInputs++;

          if (userAnswer.trim() === expectedPlaintext[i]) {
            correctInputs++;
          }
        }
      }
    }
  }
  

  else if (quote.cipherType === 'Cryptarithm') {
    if (quote.cryptarithmSolution && Object.keys(quote.cryptarithmSolution).length > 0) {

      const expectedWords = quote.cryptarithmData?.digitGroups.map(group => group.word.replace(/\s/g, '')) || [];
      const allExpectedLetters = expectedWords.join('');
      totalInputs = allExpectedLetters.length;
      

      for (let i = 0; i < totalInputs; i++) {
        const userAnswer = quote.cryptarithmSolution[i];
        const isHinted = Boolean((quote as any).cryptarithmHinted?.[i]);
        if (!isHinted && userAnswer && userAnswer.trim().length > 0) {
          filledInputs++;

          if (userAnswer.trim() === allExpectedLetters[i]) {
            correctInputs++;
          }
        }
      }
    }
  }


  const attemptedScore = totalInputs > 0 ? (filledInputs / totalInputs) * questionPointValue : 0;
  const score = filledInputs > 0 ? (correctInputs / filledInputs) * attemptedScore : 0;
  
  return {
    totalInputs,
    correctInputs,
    filledInputs,
    score,
    maxScore: questionPointValue,
    attemptedScore
  };
}
