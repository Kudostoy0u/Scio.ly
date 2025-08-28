import { QuoteData } from '../types';

// Helper function for keyword-based alphabet generation (copied from cipher-utils)
const generateKeywordAlphabet = (keyword: string): string => {
  const cleanKeyword = keyword.toUpperCase().replace(/[^A-Z]/g, '');
  const used = new Set<string>();
  const result: string[] = [];
  
  // Add keyword letters first (removing duplicates)
  for (const char of cleanKeyword) {
    if (!used.has(char)) {
      used.add(char);
      result.push(char);
    }
  }
  
  // Add remaining alphabet letters
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
// Function to calculate suggested points (same as in QuestionCard)
function getSuggestedPoints(quote: QuoteData): number {
  // Base cipher difficulty multipliers
  const cipherMultipliers: { [key: string]: number } = {
    // Very Easy (1.0-1.5x)
    'Atbash': 1.0,
    'Caesar': 1.0,
    'Baconian': 1.2, // Base Baconian
    
    // Easy (1.5-2.0x)
    'Affine': 1.8,
    'Porta': 1.6,
    'Checkerboard': 1.7,
    
    // Medium (2.0-3.0x)
    'K1 Aristocrat': 2.2,
    'K1 Patristocrat': 2.8, // Slightly harder than Aristocrat
    'K1 Xenocrypt': 2.5,
    'Hill 2x2': 2.8,
    'Nihilist': 2.3,
    
    // Hard (3.0-4.0x)
    'K2 Aristocrat': 3.2,
    'K2 Patristocrat': 3.8, // Slightly harder than Aristocrat
    'K2 Xenocrypt': 3.5,
    'Hill 3x3': 3.8,
    'Fractionated Morse': 3.6,
    'Complete Columnar': 3.4,
    
    // Very Hard (4.0-5.0x)
    'K3 Aristocrat': 4.2,
    'K3 Patristocrat': 4.8, // Slightly harder than Aristocrat
    'K3 Xenocrypt': 4.5,
    'Random Aristocrat': 4.0,
    'Random Patristocrat': 4.2, // Slightly harder than Aristocrat
    'Random Xenocrypt': 4.8,
    'Cryptarithm': 4.5
  };

  // Get base multiplier for cipher type
  const baseMultiplier = cipherMultipliers[quote.cipherType] || 2.0;
  
  // Baconian binary type adjustments
  let baconianMultiplier = baseMultiplier;
  if (quote.cipherType === 'Baconian' && quote.baconianBinaryType) {
    const binaryType = quote.baconianBinaryType;
    
    // Easy binary types
    if (binaryType === 'A/B') {
      baconianMultiplier = 1.0;
    } else if (binaryType === 'Vowels/Consonants' || binaryType === 'Odd/Even') {
      baconianMultiplier = 1.3;
    } else if (binaryType.includes(' vs ')) {
      // Formatting types (Highlight vs Plain, Bold vs Italic, etc.)
      baconianMultiplier = 1.4;
    } else {
      // Emoji and symbol sets (multiple symbols per side)
      baconianMultiplier = 1.8;
    }
  }
  
  // Quote length multiplier (more letters = more points)
  const quoteLength = quote.quote.replace(/[^A-Za-z]/g, '').length;
  let lengthMultiplier = 1.0;
  
  if (quoteLength < 50) {
    lengthMultiplier = 0.8; // Short quotes
  } else if (quoteLength < 100) {
    lengthMultiplier = 1.0; // Medium quotes
  } else if (quoteLength < 200) {
    lengthMultiplier = 1.2; // Long quotes
  } else {
    lengthMultiplier = 1.4; // Very long quotes
  }
  
  // Calculate final points (base 50 points * multipliers)
  const finalPoints = Math.round(50 * baconianMultiplier * lengthMultiplier);
  
  // Ensure minimum and maximum reasonable bounds
  return Math.max(2.5, Math.min(20, Number((finalPoints / 7).toFixed(1))));
}

export function calculateCipherGrade(quote: QuoteData, quoteIndex: number, hintedLetters: {[questionIndex: number]: {[letter: string]: boolean}} = {}, questionPoints: {[key: number]: number} = {}): GradingResult {
  const questionPointValue = questionPoints[quoteIndex] || getSuggestedPoints(quote);
  let totalInputs = 0;
  let correctInputs = 0;
  let filledInputs = 0;

  // Handle substitution ciphers (K1/K2/K3 Aristocrat/Patristocrat, Caesar, Atbash, Affine, Xenocrypt)
  if (['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Aristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine', 'Random Xenocrypt', 'K1 Xenocrypt', 'K2 Xenocrypt'].includes(quote.cipherType)) {
    if (quote.solution && Object.keys(quote.solution).length > 0) {
      // Count unique letters in encrypted text
      const uniqueLetters = new Set(quote.encrypted.replace(/[^A-Z]/g, ''));
      totalInputs = uniqueLetters.size;
      
      // Check each letter substitution
      for (const cipherLetter of uniqueLetters) {
        const userAnswer = quote.solution[cipherLetter];
        const isHinted = Boolean(hintedLetters[quoteIndex]?.[cipherLetter]);
        
        // Skip hinted letters (they don't count for grading)
        if (isHinted === true) {
          continue;
        }
        
        // Count filled inputs (for attempted score calculation)
        if (userAnswer && userAnswer.trim().length > 0) {
          filledInputs++;
        }
        
        // Check if the answer is correct
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
          // Calculate modular multiplicative inverse of a
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
          // For keyword-based ciphers, reconstruct the expected mapping
          const keyword = quote.key || '';
          const plainAlphabet = generateKeywordAlphabet(keyword);
          const cipherAlphabet = quote.cipherType.includes('K1') || quote.cipherType.includes('K3') 
            ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' 
            : generateKeywordAlphabet(keyword);
          
          // Handle K3 shift to avoid self-mapping
          const shift = quote.cipherType.includes('K3') ? 1 : 0;
          const shiftedCipherAlphabet = cipherAlphabet.slice(shift) + cipherAlphabet.slice(0, shift);
          
          const cipherIndex = shiftedCipherAlphabet.indexOf(cipherLetter);
          if (cipherIndex !== -1) {
            const expectedPlainLetter = plainAlphabet[cipherIndex];
            isCorrect = userAnswer === expectedPlainLetter;
          }
        } else if (['Random Aristocrat', 'Random Patristocrat', 'Random Xenocrypt'].includes(quote.cipherType) && quote.key) {
          // For random aristocrat/patristocrat/xenocrypt, check against the key mapping
          const keyIndex = quote.key.indexOf(cipherLetter);
          if (keyIndex !== -1) {
            const expectedPlainLetter = String.fromCharCode(keyIndex + 65);
            isCorrect = userAnswer === expectedPlainLetter;
          } else {
            isCorrect = false;
          }
        } else {
          // For other ciphers where we can't determine correctness, count as incorrect
          isCorrect = false;
        }
        
        if (isCorrect) {
          correctInputs++;
        }
      }
    }
  }
  
  // Handle Hill ciphers
  else if (quote.cipherType === 'Hill 2x2' || quote.cipherType === 'Hill 3x3') {
    if (quote.hillSolution) {
      const matrixSize = quote.cipherType === 'Hill 2x2' ? 2 : 3;
      
      if (quote.cipherType === 'Hill 2x2') {
        // Hill 2x2: Count both matrix and plaintext inputs with 50/50 weighting
        const matrixWeight = 0.5; // Matrix accounts for 50% of the grade
        const plaintextWeight = 0.5; // Plaintext accounts for 50% of the grade
        
        // Check matrix cells (50% weight)
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
        
        // Check plaintext slots (50% weight)
        const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
        let plaintextInputs = 0;
        let plaintextFilled = 0;
        let plaintextCorrect = 0;
        
        // Count only the non-padding plaintext positions
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
        
        // Set totals
        totalInputs = matrixInputs + plaintextInputs;
        filledInputs = matrixFilled + plaintextFilled;
        correctInputs = matrixCorrect + plaintextCorrect;
        
        // Calculate weighted attempted score
        const matrixAttemptedScore = matrixInputs > 0 ? (matrixFilled / matrixInputs) * questionPointValue * matrixWeight : 0;
        const plaintextAttemptedScore = plaintextInputs > 0 ? (plaintextFilled / plaintextInputs) * questionPointValue * plaintextWeight : 0;
        const hillAttemptedScore = matrixAttemptedScore + plaintextAttemptedScore;
        
        // Calculate weighted final score
        const matrixFinalScore = matrixFilled > 0 ? (matrixCorrect / matrixFilled) * matrixAttemptedScore : 0;
        const plaintextFinalScore = plaintextFilled > 0 ? (plaintextCorrect / plaintextFilled) * plaintextAttemptedScore : 0;
        const hillScore = matrixFinalScore + plaintextFinalScore;
        
        // Return early for Hill 2x2 with custom scoring
        return {
          totalInputs,
          correctInputs,
          filledInputs,
          score: hillScore,
          maxScore: questionPointValue,
          attemptedScore: hillAttemptedScore
        };
      } else {
        // Hill 3x3: Only count plaintext inputs since matrices are already given
        const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
        let plaintextInputs = 0;
        let plaintextFilled = 0;
        let plaintextCorrect = 0;
        
        // Count only the non-padding plaintext positions
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
        
        // Set totals (only plaintext inputs count for Hill 3x3)
        totalInputs = plaintextInputs;
        filledInputs = plaintextFilled;
        correctInputs = plaintextCorrect;
        
        // Calculate attempted score based on filled inputs
        const attemptedScore = totalInputs > 0 ? (filledInputs / totalInputs) * questionPointValue : 0;
        
        // Calculate final score based on correct inputs
        const score = filledInputs > 0 ? (correctInputs / filledInputs) * attemptedScore : 0;
        
        // Return early for Hill 3x3 with custom scoring
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
  
  // Handle Complete Columnar
  else if (quote.cipherType === 'Complete Columnar') {
    if (quote.solution?.decryptedText) {
      const decryptedText = quote.solution.decryptedText.trim();
      const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
      const expectedLength = expectedPlaintext.length;
      totalInputs = expectedLength;
      
      // Check each character for correctness
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
  
  // Handle Nihilist
  else if (quote.cipherType === 'Nihilist') {
    if (quote.nihilistSolution && Object.keys(quote.nihilistSolution).length > 0) {
      // Get the cleaned quote (letters only) - this is the total number of inputs needed
      const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
      totalInputs = expectedPlaintext.length;
      
      // Check each position for correctness
      for (let i = 0; i < totalInputs; i++) {
        const userAnswer = quote.nihilistSolution[i];
        if (userAnswer && userAnswer.trim().length > 0) {
          filledInputs++;
          // Check if the answer matches the expected plaintext at this position
          if (userAnswer.trim() === expectedPlaintext[i]) {
            correctInputs++;
          }
        }
      }
    }
  }
  
  // Handle Baconian
  else if (quote.cipherType === 'Baconian') {
    if (quote.solution && Object.keys(quote.solution).length > 0) {
      // Get the cleaned quote (letters only)
      const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
      totalInputs = expectedPlaintext.length;
      
      // Check each position for correctness
      for (let i = 0; i < totalInputs; i++) {
        const userAnswer = quote.solution[i];
        if (userAnswer && userAnswer.trim().length > 0) {
          filledInputs++;
          // Check if the answer matches the expected plaintext at this position
          if (userAnswer.trim() === expectedPlaintext[i]) {
            correctInputs++;
          }
        }
      }
    }
  }
  
  // Handle Porta
  else if (quote.cipherType === 'Porta') {
    if (quote.solution && Object.keys(quote.solution).length > 0) {
      // Count unique letters in encrypted text (like other substitution ciphers)
      const uniqueLetters = new Set(quote.encrypted.replace(/[^A-Z]/g, ''));
      totalInputs = uniqueLetters.size;
      
      // Check each unique cipher letter for correctness
      for (const cipherLetter of uniqueLetters) {
        const plainLetter = quote.solution[cipherLetter];
        if (plainLetter && plainLetter.trim().length > 0) {
          filledInputs++;
          // Check if the user's plain letter is correct for this cipher letter
          // Use the same logic as the Porta display component
          let isCorrect = false;
          
          // Porta table for lookup (same as in PortaDisplay)
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
          
          // Character to pair mapping (same as in PortaDisplay)
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
          
          // Find the position of this cipher letter in the encrypted text
          const encryptedLetters = quote.encrypted.replace(/[^A-Z]/g, '');
          const cipherLetterIndex = encryptedLetters.indexOf(cipherLetter);
          
          if (cipherLetterIndex !== -1 && quote.portaKeyword) {
            // Get the keyword letter for this position
            const keywordChar = quote.portaKeyword[cipherLetterIndex % quote.portaKeyword.length];
            const pair = charToPair[keywordChar];
            const portaRow = portaTable[pair];
            
            // Porta's rule: A-M vs N-Z handling for decryption
            const headerRow = 'ABCDEFGHIJKLM';
            let expectedPlainChar;
            
            // Check if cipher character is in header row (A-M)
            const headerIndex = headerRow.indexOf(cipherLetter);
            if (headerIndex !== -1) {
              // Cipher is A-M, so plaintext is in key row at same position
              expectedPlainChar = portaRow[headerIndex];
            } else {
              // Cipher is N-Z, so plaintext is in header row at same position as cipher in key row
              const keyRowIndex = portaRow.indexOf(cipherLetter);
              if (keyRowIndex !== -1) {
                expectedPlainChar = headerRow[keyRowIndex];
              }
            }
            
            // Check if user's answer matches the expected plain character
            isCorrect = expectedPlainChar && plainLetter.trim().toUpperCase() === expectedPlainChar;
          }
          if (isCorrect) {
            correctInputs++;
          }
        }
      }
    }
  }
  
  // Handle Fractionated Morse
  else if (quote.cipherType === 'Fractionated Morse') {
    if (quote.solution && Object.keys(quote.solution).length > 0) {
      // Count unique letters in encrypted text (like other substitution ciphers)
      const uniqueLetters = new Set(quote.encrypted.replace(/[^A-Z]/g, ''));
      totalInputs = uniqueLetters.size;
      
      // Count filled and correct solutions
      for (const [cipherLetter, triplet] of Object.entries(quote.solution)) {
        const isHinted = Boolean(hintedLetters[quoteIndex]?.[cipherLetter]);
        // Only count as filled if the triplet is complete (3 digits)
        if (!isHinted && triplet && triplet.trim().length === 3) {
          filledInputs++;
          // Check if the triplet is correct (all or nothing)
          if (quote.fractionationTable && quote.fractionationTable[triplet] === cipherLetter) {
            correctInputs++;
          }
        }
      }
    }
  }
  
  // Handle Checkerboard
  else if (quote.cipherType === 'Checkerboard') {
    if (quote.checkerboardSolution && Object.keys(quote.checkerboardSolution).length > 0) {
      // Get the cleaned quote (letters only) - this is the total number of inputs needed
      const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
      totalInputs = expectedPlaintext.length;
      
      // Check each position for correctness
      for (let i = 0; i < totalInputs; i++) {
        const userAnswer = quote.checkerboardSolution[i];
        if (userAnswer && userAnswer.trim().length > 0) {
          filledInputs++;
          // Check if the answer matches the expected plaintext at this position
          if (userAnswer.trim() === expectedPlaintext[i]) {
            correctInputs++;
          }
        }
      }
    }
  }

  // Calculate score
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
