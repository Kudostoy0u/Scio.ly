'use client';

import React, { useState } from 'react';

interface CipherInfo {
  name: string;
  description: string;
  solvingMethod: string;
  examples: string[];
  resources?: {
    tables?: React.ReactElement;
    charts?: React.ReactElement;
    formulas?: string[];
  };
  tips: string[];
  commonMistakes: string[];
}

interface CipherInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  cipherType: string;
  darkMode: boolean;
}

const CipherInfoModal: React.FC<CipherInfoModalProps> = ({ 
  isOpen, 
  onClose, 
  cipherType, 
  darkMode 
}) => {
  const [activeTab, setActiveTab] = useState<'explanation' | 'solving' | 'resources'>('explanation');

  if (!isOpen) return null;

  // Get cipher info based on type
  const getCipherInfo = (): CipherInfo => {
    switch (cipherType) {
      case 'Random Aristocrat':
        return {
          name: 'Random Aristocrat',
          description: 'A simple substitution cipher where each letter is replaced by another letter according to a random key. Spaces and punctuation are preserved.',
          solvingMethod: 'Use frequency analysis to identify common letters (E, T, A, O, I, N, S, R, H, L, D, C, U, M, F, P, G, W, Y, B, V, K, X, J, Q, Z). Look for patterns like "THE", "AND", "THAT".',
          examples: ['THE → ABC', 'QUICK → XYZAB'],
          tips: [
            'Start with the most frequent letters (E, T, A)',
            'Look for single-letter words (A, I)',
            'Identify common patterns like "THE", "AND"',
            'Use context clues from the quote'
          ],
          commonMistakes: [
            'Not considering letter frequency',
            'Ignoring common word patterns',
            'Forgetting to check for single-letter words'
          ]
        };

      case 'K1 Aristocrat':
        return {
          name: 'K1 Aristocrat',
          description: 'A substitution cipher using a known key (Key 1). Each letter is replaced according to a predetermined substitution pattern.',
          solvingMethod: 'Apply the known K1 key directly to decrypt the message. The key provides the letter-to-letter mapping.',
          examples: ['A→K, B→L, C→M, etc.'],
          tips: [
            'Use the provided K1 key directly',
            'No frequency analysis needed',
            'Apply the substitution systematically'
          ],
          commonMistakes: [
            'Applying the key incorrectly',
            'Missing letters in the substitution'
          ]
        };

      case 'K2 Aristocrat':
        return {
          name: 'K2 Aristocrat',
          description: 'A substitution cipher using a known key (Key 2). Each letter is replaced according to a predetermined substitution pattern.',
          solvingMethod: 'Apply the known K2 key directly to decrypt the message. The key provides the letter-to-letter mapping.',
          examples: ['A→P, B→Q, C→R, etc.'],
          tips: [
            'Use the provided K2 key directly',
            'No frequency analysis needed',
            'Apply the substitution systematically'
          ],
          commonMistakes: [
            'Applying the key incorrectly',
            'Missing letters in the substitution'
          ]
        };

      case 'K3 Aristocrat':
        return {
          name: 'K3 Aristocrat',
          description: 'A substitution cipher using a known key (Key 3). Each letter is replaced according to a predetermined substitution pattern.',
          solvingMethod: 'Apply the known K3 key directly to decrypt the message. The key provides the letter-to-letter mapping.',
          examples: ['A→X, B→Y, C→Z, etc.'],
          tips: [
            'Use the provided K3 key directly',
            'No frequency analysis needed',
            'Apply the substitution systematically'
          ],
          commonMistakes: [
            'Applying the key incorrectly',
            'Missing letters in the substitution'
          ]
        };

      case 'Random Patristocrat':
        return {
          name: 'Random Patristocrat',
          description: 'A substitution cipher where each letter is replaced by another letter according to a random key. Spaces and punctuation are removed, making it more challenging.',
          solvingMethod: 'Use frequency analysis to identify common letters. Since there are no spaces, look for patterns within words and use context clues.',
          examples: ['THEQUICKBROWNFOX → ABCDEFGHIJKLMNOP'],
          tips: [
            'Start with the most frequent letters (E, T, A)',
            'Look for repeated patterns',
            'Use context clues from the quote',
            'Consider word boundaries even without spaces'
          ],
          commonMistakes: [
            'Not considering letter frequency',
            'Ignoring repeated patterns',
            'Forgetting to look for word boundaries'
          ]
        };

      case 'K1 Patristocrat':
        return {
          name: 'K1 Patristocrat',
          description: 'A substitution cipher using a known key (Key 1) with spaces and punctuation removed.',
          solvingMethod: 'Apply the known K1 key directly to decrypt the message. The key provides the letter-to-letter mapping.',
          examples: ['A→K, B→L, C→M, etc.'],
          tips: [
            'Use the provided K1 key directly',
            'No frequency analysis needed',
            'Apply the substitution systematically'
          ],
          commonMistakes: [
            'Applying the key incorrectly',
            'Missing letters in the substitution'
          ]
        };

      case 'K2 Patristocrat':
        return {
          name: 'K2 Patristocrat',
          description: 'A substitution cipher using a known key (Key 2) with spaces and punctuation removed.',
          solvingMethod: 'Apply the known K2 key directly to decrypt the message. The key provides the letter-to-letter mapping.',
          examples: ['A→P, B→Q, C→R, etc.'],
          tips: [
            'Use the provided K2 key directly',
            'No frequency analysis needed',
            'Apply the substitution systematically'
          ],
          commonMistakes: [
            'Applying the key incorrectly',
            'Missing letters in the substitution'
          ]
        };

      case 'K3 Patristocrat':
        return {
          name: 'K3 Patristocrat',
          description: 'A substitution cipher using a known key (Key 3) with spaces and punctuation removed.',
          solvingMethod: 'Apply the known K3 key directly to decrypt the message. The key provides the letter-to-letter mapping.',
          examples: ['A→X, B→Y, C→Z, etc.'],
          tips: [
            'Use the provided K3 key directly',
            'No frequency analysis needed',
            'Apply the substitution systematically'
          ],
          commonMistakes: [
            'Applying the key incorrectly',
            'Missing letters in the substitution'
          ]
        };

      case 'Caesar':
        return {
          name: 'Caesar Cipher',
          description: 'A shift cipher where each letter is shifted by a fixed number of positions in the alphabet. E(x) = (x + k) mod 26',
          solvingMethod: 'Try all 25 possible shifts (1-25). Look for meaningful text. The shift value is the key.',
          examples: ['Shift of 3: A→D, B→E, C→F', 'Shift of 13: A→N, B→O, C→P'],
          tips: [
            'Try shifts 1-25 systematically',
            'Look for common words like "THE", "AND"',
            'Check for meaningful text patterns',
            'Use frequency analysis to verify'
          ],
          commonMistakes: [
            'Not trying all possible shifts',
            'Forgetting that shift 26 = no change',
            'Not checking for meaningful text'
          ]
        };

      case 'Atbash':
        return {
          name: 'Atbash Cipher',
          description: 'A substitution cipher that reverses the alphabet. A↔Z, B↔Y, C↔X, etc.',
          solvingMethod: 'Apply the reverse alphabet substitution: A→Z, B→Y, C→X, ..., Z→A',
          examples: ['A→Z, B→Y, C→X, D→W, E→V', 'HELLO → SVOOL'],
          tips: [
            'Use the reverse alphabet directly',
            'A=1, Z=26, so A↔Z, B↔Y, etc.',
            'No key needed - it\'s always the same',
            'Check your work by applying twice'
          ],
          commonMistakes: [
            'Not using the reverse alphabet',
            'Confusing with other ciphers',
            'Forgetting that A↔Z, B↔Y, etc.'
          ]
        };

      case 'Affine':
        return {
          name: 'Affine Cipher',
          description: 'A linear transformation cipher: E(x) = (ax + b) mod 26. Requires gcd(a,26) = 1 for decryption to be possible.',
          solvingMethod: 'Find the modular multiplicative inverse of a, then apply D(x) = a⁻¹(x - b) mod 26',
          examples: ['a=5, b=8: E(x) = 5x + 8 mod 26', 'D(x) = 21(x - 8) mod 26'],
          tips: [
            'Check that gcd(a,26) = 1',
            'Find modular inverse of a',
            'Apply decryption formula systematically',
            'Use trial and error for small numbers'
          ],
          commonMistakes: [
            'Not checking gcd(a,26) = 1',
            'Incorrect modular inverse calculation',
            'Wrong application of decryption formula'
          ],
          resources: {
            formulas: [
              'Encryption: E(x) = (ax + b) mod 26',
              'Decryption: D(x) = a⁻¹(x - b) mod 26',
              'Requirement: gcd(a,26) = 1'
            ]
          }
        };

      case 'Hill 2x2':
        return {
          name: 'Hill 2x2 Cipher',
          description: 'A matrix cipher using a 2x2 key matrix. Plaintext is converted to numbers, grouped in pairs, multiplied by the key matrix (mod 26).',
          solvingMethod: 'Find the modular inverse of the determinant, calculate the adjugate matrix, then multiply by the inverse determinant.',
          examples: ['Key matrix: [[a,b],[c,d]]', 'Plaintext pairs: [p1,p2] → [c1,c2]'],
          tips: [
            'Check that det(A) is coprime with 26',
            'Find modular inverse of determinant',
            'Calculate adjugate matrix',
            'Multiply by inverse determinant'
          ],
          commonMistakes: [
            'Not checking determinant coprimality',
            'Incorrect modular inverse calculation',
            'Wrong adjugate matrix calculation'
          ],
          resources: {
            formulas: [
              'Encryption: C = KP mod 26',
              'Decryption: P = K⁻¹C mod 26',
              'K⁻¹ = (det K)⁻¹ × adj K mod 26',
              'Requirement: gcd(det K, 26) = 1'
            ]
          }
        };

      case 'Hill 3x3':
        return {
          name: 'Hill 3x3 Cipher',
          description: 'A matrix cipher using a 3x3 key matrix. Plaintext is converted to numbers, grouped in triplets, multiplied by the key matrix (mod 26).',
          solvingMethod: 'Find the modular inverse of the determinant, calculate the adjugate matrix, then multiply by the inverse determinant.',
          examples: ['Key matrix: 3x3', 'Plaintext triplets: [p1,p2,p3] → [c1,c2,c3]'],
          tips: [
            'Check that det(A) is coprime with 26',
            'Find modular inverse of determinant',
            'Calculate 3x3 adjugate matrix',
            'Multiply by inverse determinant'
          ],
          commonMistakes: [
            'Not checking determinant coprimality',
            'Incorrect modular inverse calculation',
            'Wrong 3x3 adjugate calculation'
          ],
          resources: {
            formulas: [
              'Encryption: C = KP mod 26',
              'Decryption: P = K⁻¹C mod 26',
              'K⁻¹ = (det K)⁻¹ × adj K mod 26',
              'Requirement: gcd(det K, 26) = 1'
            ]
          }
        };

      case 'Baconian':
        return {
          name: 'Baconian Cipher',
          description: 'A binary encoding cipher where letters are represented by groups of 5 A\'s and B\'s. Each letter corresponds to a unique 5-letter pattern.',
          solvingMethod: 'Group the text into 5-letter chunks, convert each chunk to a letter using the Baconian alphabet.',
          examples: ['A=AAAAA, B=AAAAB, C=AAABA', 'HELLO → AABBA AABBB AABAB AABAB AAABB'],
          tips: [
            'Group text into 5-letter chunks',
            'Use Baconian alphabet table',
            'Ignore non-A/B characters',
            'Check for meaningful text'
          ],
          commonMistakes: [
            'Not grouping into 5-letter chunks',
            'Using wrong Baconian alphabet',
            'Including non-A/B characters'
          ],
          resources: {
            tables: (
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h4 className="font-semibold mb-2">Baconian Alphabet</h4>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div>A: AAAAA</div><div>B: AAAAB</div><div>C: AAABA</div><div>D: AAABB</div>
                  <div>E: AABAA</div><div>F: AABAB</div><div>G: AABBA</div><div>H: AABBB</div>
                  <div>I: ABAAA</div><div>J: ABAAB</div><div>K: ABABA</div><div>L: ABABB</div>
                  <div>M: ABBAA</div><div>N: ABBAB</div><div>O: ABBBA</div><div>P: ABBBB</div>
                  <div>Q: BAAAA</div><div>R: BAAAB</div><div>S: BAABA</div><div>T: BAABB</div>
                  <div>U: BABAA</div><div>V: BABAB</div><div>W: BABBA</div><div>X: BABBB</div>
                  <div>Y: BBAAA</div><div>Z: BBAAB</div>
                </div>
              </div>
            )
          }
        };

      case 'Porta':
        return {
          name: 'Porta Cipher',
          description: 'A keyword-based polyalphabetic substitution cipher. Uses a keyword to determine which substitution alphabet to use for each letter.',
          solvingMethod: 'Use the keyword to determine the substitution alphabet for each position. Apply the appropriate substitution based on the keyword letter.',
          examples: ['Keyword: "KEY"', 'Position 1: K alphabet, Position 2: E alphabet, Position 3: Y alphabet'],
          tips: [
            'Use the keyword to determine alphabets',
            'Apply substitution based on keyword position',
            'Repeat keyword pattern',
            'Check for meaningful text'
          ],
          commonMistakes: [
            'Not using keyword correctly',
            'Wrong alphabet selection',
            'Not repeating keyword pattern'
          ]
        };

      case 'Nihilist':
        return {
          name: 'Nihilist Cipher',
          description: 'A two-key cipher that combines a Polybius square with a running key addition. Uses a Polybius key to create a 5x5 grid and a cipher key for addition.',
          solvingMethod: '1) Recreate the Polybius square using the Polybius key, 2) Convert cipher key to numbers using the square, 3) Create running key by repeating cipher key numbers, 4) Subtract running key from ciphertext numbers, 5) Convert resulting numbers back to letters using the Polybius square.',
          examples: ['Polybius Key: "SECURITY"', 'Cipher Key: "CASH"', 'Plaintext → Polybius numbers → Add running key → Ciphertext'],
          tips: [
            'Use both keys: Polybius key and cipher key',
            'Create Polybius square first',
            'Convert cipher key to numbers using same square',
            'Repeat cipher key numbers to match plaintext length',
            'Subtract running key from ciphertext numbers'
          ],
          commonMistakes: [
            'Not using both keys',
            'Wrong Polybius square construction',
            'Incorrect running key generation',
            'Wrong subtraction order'
          ],
          resources: {
            tables: (
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h4 className="font-semibold mb-2">Nihilist Cipher Process</h4>
                <div className="text-sm space-y-2">
                  <div><strong>Step 1:</strong> Create 5x5 Polybius square using Polybius key</div>
                  <div><strong>Step 2:</strong> Convert plaintext to numbers using square</div>
                  <div><strong>Step 3:</strong> Convert cipher key to numbers using same square</div>
                  <div><strong>Step 4:</strong> Create running key by repeating cipher key numbers</div>
                  <div><strong>Step 5:</strong> Add plaintext numbers to running key numbers</div>
                  <div><strong>Decryption:</strong> Subtract running key from ciphertext numbers</div>
                </div>
              </div>
            )
          }
        };

      case 'Fractionated Morse':
        return {
          name: 'Fractionated Morse',
          description: 'A three-step cipher: 1) Convert text to Morse code, 2) Group into triplets, 3) Substitute triplets with letters using a key.',
          solvingMethod: '1) Convert ciphertext letters back to Morse triplets, 2) Reconstruct Morse code, 3) Convert Morse to plaintext.',
          examples: ['HELLO → .... . .-.. .-.. --- → ...|...|... → ABC'],
          tips: [
            'Use the provided triplet table',
            'Convert letters back to triplets',
            'Reconstruct Morse code',
            'Convert Morse to plaintext'
          ],
          commonMistakes: [
            'Not using triplet table correctly',
            'Wrong Morse code reconstruction',
            'Incorrect triplet grouping'
          ],
          resources: {
            tables: (
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h4 className="font-semibold mb-2">Morse Code Table</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>A: .-</div><div>N: -.</div>
                  <div>B: -...</div><div>O: ---</div>
                  <div>C: -.-.</div><div>P: .--.</div>
                  <div>D: -..</div><div>Q: --.-</div>
                  <div>E: .</div><div>R: .-.</div>
                  <div>F: ..-.</div><div>S: ...</div>
                  <div>G: --.</div><div>T: -</div>
                  <div>H: ....</div><div>U: ..-</div>
                  <div>I: ..</div><div>V: ...-</div>
                  <div>J: .---</div><div>W: .--</div>
                  <div>K: -.-</div><div>X: -..-</div>
                  <div>L: .-..</div><div>Y: -.--</div>
                  <div>M: --</div><div>Z: --..</div>
                </div>
              </div>
            )
          }
        };

      case 'Columnar Transposition':
        return {
          name: 'Columnar Transposition',
          description: 'A transposition cipher that rearranges letters using a keyword. Text is written in rows, then read in columns according to keyword alphabetical order.',
          solvingMethod: '1) Determine column order from keyword alphabetical order, 2) Write ciphertext in columns, 3) Read rows to get plaintext.',
          examples: ['Keyword: "KEY" → E(1), K(2), Y(3)', 'Read columns in order: E, K, Y'],
          tips: [
            'Use keyword alphabetical order',
            'Write ciphertext in columns',
            'Read rows for plaintext',
            'Check for meaningful text'
          ],
          commonMistakes: [
            'Wrong column order',
            'Incorrect matrix construction',
            'Not reading rows properly'
          ]
        };

      case 'Xenocrypt':
        return {
          name: 'Xenocrypt',
          description: 'A substitution cipher using Spanish text. Letters are replaced according to a substitution key, with Spanish accented characters normalized.',
          solvingMethod: 'Use frequency analysis for Spanish text. Common Spanish letters: E, A, O, S, N, R, I, L, D, T. Normalize accented characters.',
          examples: ['á→A, é→E, í→I, ó→O, ú→U, ñ→N', 'átomos → ATOMOS'],
          tips: [
            'Use Spanish letter frequencies',
            'Normalize accented characters',
            'Look for Spanish word patterns',
            'Consider Spanish grammar'
          ],
          commonMistakes: [
            'Not normalizing accented characters',
            'Using English letter frequencies',
            'Ignoring Spanish word patterns'
          ],
          resources: {
            charts: (
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h4 className="font-semibold mb-2">Spanish Accent Normalization</h4>
                <div className="text-sm">
                  <div>á → A</div>
                  <div>é → E</div>
                  <div>í → I</div>
                  <div>ó → O</div>
                  <div>ú → U</div>
                  <div>ñ → N</div>
                </div>
              </div>
            )
          }
        };

      default:
        return {
          name: cipherType,
          description: 'Information about this cipher type is not available yet.',
          solvingMethod: 'Please refer to the Codebusters reference materials.',
          examples: [],
          tips: [],
          commonMistakes: []
        };
    }
  };

  const cipherInfo = getCipherInfo();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={onClose}>
      <div 
        className={`relative w-11/12 h-5/6 max-w-4xl rounded-lg shadow-2xl flex flex-col ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex justify-between items-center p-4 border-b ${
          darkMode ? 'border-gray-600' : 'border-gray-200'
        }`}>
          <h2 className="text-xl font-semibold">{cipherInfo.name}</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full hover:bg-opacity-20 ${
              darkMode ? 'hover:bg-white text-white' : 'hover:bg-gray-500 text-gray-700'
            }`}
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
          {[
            { id: 'explanation', label: 'Explanation' },
            { id: 'solving', label: 'Solving Method' },
            { id: 'resources', label: 'Resources' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'explanation' | 'solving' | 'resources')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? `border-b-2 ${darkMode ? 'border-blue-400 text-blue-400' : 'border-blue-600 text-blue-600'}`
                  : `${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'}`
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'explanation' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {cipherInfo.description}
                </p>
              </div>
              
              {cipherInfo.examples.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Examples</h3>
                  <ul className={`list-disc list-inside space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {cipherInfo.examples.map((example, index) => (
                      <li key={index}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'solving' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Step-by-Step Method</h3>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {cipherInfo.solvingMethod}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Tips</h3>
                <ul className={`list-disc list-inside space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {cipherInfo.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Common Mistakes</h3>
                <ul className={`list-disc list-inside space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {cipherInfo.commonMistakes.map((mistake, index) => (
                    <li key={index}>{mistake}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-4">
              {cipherInfo.resources?.formulas && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Mathematical Formulas</h3>
                  <ul className={`list-disc list-inside space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {cipherInfo.resources.formulas.map((formula, index) => (
                      <li key={index} className="font-mono">{formula}</li>
                    ))}
                  </ul>
                </div>
              )}

              {cipherInfo.resources?.tables && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Reference Tables</h3>
                  {cipherInfo.resources.tables}
                </div>
              )}

              {cipherInfo.resources?.charts && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Reference Charts</h3>
                  {cipherInfo.resources.charts}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CipherInfoModal; 