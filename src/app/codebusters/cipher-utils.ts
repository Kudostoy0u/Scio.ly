// Helper functions for both ciphers
export const mod26 = (n: number): number => ((n % 26) + 26) % 26;
export const letterToNumber = (letter: string): number => letter.toUpperCase().charCodeAt(0) - 65;
export const numberToLetter = (num: number): string => String.fromCharCode(mod26(num) + 65);

// Format time function
export const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};

// K1 Aristocrat cipher
export const encryptK1Aristocrat = (text: string): { encrypted: string; key: string } => {
    const generateK1Key = (): string => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const result = new Array(26);
        let available = [...alphabet];
        
        // K1 Aristocrat specific constraints
        for (let i = 0; i < 26; i++) {
            available = available.filter(char => char !== alphabet[i]);
            const randomIndex = Math.floor(Math.random() * available.length);
            result[i] = available[randomIndex];
            available = [...alphabet].filter(char => 
                !result.includes(char) && char !== alphabet[i]
            );
        }
        
        return result.join('');
    };

    const key = generateK1Key();
    const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => 
        key[letterToNumber(char)] || char
    );

    return { encrypted, key };
};

// K2 Aristocrat cipher
export const encryptK2Aristocrat = (text: string): { encrypted: string; key: string } => {
    const generateK2Key = (): string => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const result = new Array(26);
        let available = [...alphabet];
        
        // K2 Aristocrat specific constraints
        for (let i = 0; i < 26; i++) {
            available = available.filter(char => char !== alphabet[i]);
            const randomIndex = Math.floor(Math.random() * available.length);
            result[i] = available[randomIndex];
            available = [...alphabet].filter(char => 
                !result.includes(char) && char !== alphabet[i]
            );
        }
        
        return result.join('');
    };

    const key = generateK2Key();
    const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => 
        key[letterToNumber(char)] || char
    );

    return { encrypted, key };
};

// K3 Aristocrat cipher
export const encryptK3Aristocrat = (text: string): { encrypted: string; key: string } => {
    const generateK3Key = (): string => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const result = new Array(26);
        let available = [...alphabet];
        
        // K3 Aristocrat specific constraints
        for (let i = 0; i < 26; i++) {
            available = available.filter(char => char !== alphabet[i]);
            const randomIndex = Math.floor(Math.random() * available.length);
            result[i] = available[randomIndex];
            available = [...alphabet].filter(char => 
                !result.includes(char) && char !== alphabet[i]
            );
        }
        
        return result.join('');
    };

    const key = generateK3Key();
    const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => 
        key[letterToNumber(char)] || char
    );

    return { encrypted, key };
};

// K1 Patristocrat cipher
export const encryptK1Patristocrat = (text: string): { encrypted: string; key: string } => {
    const generateK1Key = (): string => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const result = new Array(26);
        let available = [...alphabet];
        
        // K1 Patristocrat specific constraints
        for (let i = 0; i < 26; i++) {
            available = available.filter(char => char !== alphabet[i]);
            const randomIndex = Math.floor(Math.random() * available.length);
            result[i] = available[randomIndex];
            available = [...alphabet].filter(char => 
                !result.includes(char) && char !== alphabet[i]
            );
        }
        
        return result.join('');
    };

    const key = generateK1Key();
    
    // Remove all non-letters and convert to uppercase
    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    
    // Encrypt the cleaned text
    const encryptedLetters = cleanText.split('').map(char => 
        key[letterToNumber(char)] || char
    );
    
    // Group into sets of 5 letters
    const groupedText = encryptedLetters.reduce((acc: string[], letter: string, i: number) => {
        const groupIndex = Math.floor(i / 5);
        if (!acc[groupIndex]) {
            acc[groupIndex] = '';
        }
        acc[groupIndex] += letter;
        return acc;
    }, []);

    // Join groups with spaces
    const encrypted = groupedText.join(' ');

    return { encrypted, key };
};

// K2 Patristocrat cipher
export const encryptK2Patristocrat = (text: string): { encrypted: string; key: string } => {
    const generateK2Key = (): string => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const result = new Array(26);
        let available = [...alphabet];
        
        // K2 Patristocrat specific constraints
        for (let i = 0; i < 26; i++) {
            available = available.filter(char => char !== alphabet[i]);
            const randomIndex = Math.floor(Math.random() * available.length);
            result[i] = available[randomIndex];
            available = [...alphabet].filter(char => 
                !result.includes(char) && char !== alphabet[i]
            );
        }
        
        return result.join('');
    };

    const key = generateK2Key();
    
    // Remove all non-letters and convert to uppercase
    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    
    // Encrypt the cleaned text
    const encryptedLetters = cleanText.split('').map(char => 
        key[letterToNumber(char)] || char
    );
    
    // Group into sets of 5 letters
    const groupedText = encryptedLetters.reduce((acc: string[], letter: string, i: number) => {
        const groupIndex = Math.floor(i / 5);
        if (!acc[groupIndex]) {
            acc[groupIndex] = '';
        }
        acc[groupIndex] += letter;
        return acc;
    }, []);

    // Join groups with spaces
    const encrypted = groupedText.join(' ');

    return { encrypted, key };
};

// K3 Patristocrat cipher
export const encryptK3Patristocrat = (text: string): { encrypted: string; key: string } => {
    const generateK3Key = (): string => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const result = new Array(26);
        let available = [...alphabet];
        
        // K3 Patristocrat specific constraints
        for (let i = 0; i < 26; i++) {
            available = available.filter(char => char !== alphabet[i]);
            const randomIndex = Math.floor(Math.random() * available.length);
            result[i] = available[randomIndex];
            available = [...alphabet].filter(char => 
                !result.includes(char) && char !== alphabet[i]
            );
        }
        
        return result.join('');
    };

    const key = generateK3Key();
    
    // Remove all non-letters and convert to uppercase
    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    
    // Encrypt the cleaned text
    const encryptedLetters = cleanText.split('').map(char => 
        key[letterToNumber(char)] || char
    );
    
    // Group into sets of 5 letters
    const groupedText = encryptedLetters.reduce((acc: string[], letter: string, i: number) => {
        const groupIndex = Math.floor(i / 5);
        if (!acc[groupIndex]) {
            acc[groupIndex] = '';
        }
        acc[groupIndex] += letter;
        return acc;
    }, []);

    // Join groups with spaces
    const encrypted = groupedText.join(' ');

    return { encrypted, key };
};

// Random Aristocrat cipher
export const encryptRandomAristocrat = (text: string): { encrypted: string; key: string } => {
    const generateRandomKey = (): string => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const shuffled = [...alphabet].sort(() => Math.random() - 0.5);
        return shuffled.join('');
    };

    const key = generateRandomKey();
    const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => 
        key[letterToNumber(char)] || char
    );

    return { encrypted, key };
};

// Random Patristocrat cipher
export const encryptRandomPatristocrat = (text: string): { encrypted: string; key: string } => {
    const generateRandomKey = (): string => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const shuffled = [...alphabet].sort(() => Math.random() - 0.5);
        return shuffled.join('');
    };

    const key = generateRandomKey();
    
    // Remove all non-letters and convert to uppercase
    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    
    // Encrypt the cleaned text
    const encryptedLetters = cleanText.split('').map(char => 
        key[letterToNumber(char)] || char
    );
    
    // Group into sets of 5 letters
    const groupedText = encryptedLetters.reduce((acc: string[], letter: string, i: number) => {
        const groupIndex = Math.floor(i / 5);
        if (!acc[groupIndex]) {
            acc[groupIndex] = '';
        }
        acc[groupIndex] += letter;
        return acc;
    }, []);

    // Join groups with spaces
    const encrypted = groupedText.join(' ');

    return { encrypted, key };
};

// Caesar cipher
export const encryptCaesar = (text: string): { encrypted: string; shift: number } => {
    const shift = Math.floor(Math.random() * 25) + 1; // 1-25
    const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => {
        const num = letterToNumber(char);
        return numberToLetter((num + shift) % 26);
    });
    
    return { encrypted, shift };
};

// Atbash cipher
export const encryptAtbash = (text: string): { encrypted: string } => {
    const atbashMap = 'ZYXWVUTSRQPONMLKJIHGFEDCBA';
    const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => 
        atbashMap[letterToNumber(char)] || char
    );
    
    return { encrypted };
};

// Affine cipher
export const encryptAffine = (text: string): { encrypted: string; a: number; b: number } => {
    // Choose coprime a with 26
    const possibleA = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];
    const a = possibleA[Math.floor(Math.random() * possibleA.length)];
    const b = Math.floor(Math.random() * 26);
    
    const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => {
        const num = letterToNumber(char);
        return numberToLetter((a * num + b) % 26);
    });
    
    return { encrypted, a, b };
};

// Hill cipher with 2x2 matrix
export const encryptHill = (text: string): { encrypted: string; matrix: number[][] } => {
    // List of verified invertible matrices mod 26
    const invertibleMatrices = [
        [[3, 2], [5, 7]],   // det = 11
        [[5, 3], [7, 2]],   // det = 11
        [[7, 2], [3, 5]],   // det = 29
        [[5, 7], [2, 3]],   // det = 1
        [[3, 5], [2, 7]]    // det = 11
    ];

    // Select a random invertible matrix
    const matrix = invertibleMatrices[Math.floor(Math.random() * invertibleMatrices.length)];
    
    // Clean and pad the text
    const cleanText = text.replace(/[^A-Za-z]/g, '').toUpperCase();
    const paddedText = cleanText.length % 2 === 0 ? cleanText : cleanText + 'X';
    
    let encrypted = '';
    
    // Encrypt pairs of letters
    for (let i = 0; i < paddedText.length; i += 2) {
        const pair = [letterToNumber(paddedText[i]), letterToNumber(paddedText[i + 1])];
        
        // Matrix multiplication
        const encryptedPair = [
            mod26(matrix[0][0] * pair[0] + matrix[0][1] * pair[1]),
            mod26(matrix[1][0] * pair[0] + matrix[1][1] * pair[1])
        ];
        
        encrypted += numberToLetter(encryptedPair[0]) + numberToLetter(encryptedPair[1]);
    }
    
    // Add spaces every 5 characters for readability
    encrypted = encrypted.match(/.{1,5}/g)?.join(' ') || encrypted;
    
    return { encrypted, matrix };
};

// Porta cipher encryption
export const encryptPorta = (text: string): { encrypted: string; keyword: string } => {
    // Porta table - each row represents the substitution for a keyword letter
    const portaTable = {
        'A': 'NOPQRSTUVWXYZABCDEFGHIJKLM',
        'B': 'OPQRSTUVWXYZABCDEFGHIJKLMN',
        'C': 'PQRSTUVWXYZABCDEFGHIJKLMNO',
        'D': 'QRSTUVWXYZABCDEFGHIJKLMNOP',
        'E': 'RSTUVWXYZABCDEFGHIJKLMNOPQ',
        'F': 'STUVWXYZABCDEFGHIJKLMNOPQR',
        'G': 'TUVWXYZABCDEFGHIJKLMNOPQRS',
        'H': 'UVWXYZABCDEFGHIJKLMNOPQRST',
        'I': 'VWXYZABCDEFGHIJKLMNOPQRSTU',
        'J': 'WXYZABCDEFGHIJKLMNOPQRSTUV',
        'K': 'XYZABCDEFGHIJKLMNOPQRSTUVW',
        'L': 'YZABCDEFGHIJKLMNOPQRSTUVWX',
        'M': 'ZABCDEFGHIJKLMNOPQRSTUVWXY',
        'N': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'O': 'BCDEFGHIJKLMNOPQRSTUVWXYZA',
        'P': 'CDEFGHIJKLMNOPQRSTUVWXYZAB',
        'Q': 'DEFGHIJKLMNOPQRSTUVWXYZABC',
        'R': 'EFGHIJKLMNOPQRSTUVWXYZABCD',
        'S': 'FGHIJKLMNOPQRSTUVWXYZABCDE',
        'T': 'GHIJKLMNOPQRSTUVWXYZABCDEF',
        'U': 'HIJKLMNOPQRSTUVWXYZABCDEFG',
        'V': 'IJKLMNOPQRSTUVWXYZABCDEFGH',
        'W': 'JKLMNOPQRSTUVWXYZABCDEFGHI',
        'X': 'KLMNOPQRSTUVWXYZABCDEFGHIJ',
        'Y': 'LMNOPQRSTUVWXYZABCDEFGHIJK',
        'Z': 'MNOPQRSTUVWXYZABCDEFGHIJKL'
    };

    // Generate a random 4-letter keyword
    const keyword = Array.from({ length: 4 }, () => 
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('');

    // Clean the text
    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');

    // Encrypt the text
    let encrypted = '';
    for (let i = 0; i < cleanText.length; i++) {
        const keywordChar = keyword[i % keyword.length];
        const textChar = cleanText[i];
        const row = portaTable[keywordChar];
        const col = textChar.charCodeAt(0) - 65;
        encrypted += row[col];
    }

    // Add spaces every 5 characters for readability
    encrypted = encrypted.match(/.{1,5}/g)?.join(' ') || encrypted;

    return { encrypted, keyword };
};

// Baconian cipher with 24-letter alphabet (I/J same, U/V same)
export const encryptBaconian = (text: string): { encrypted: string; } => {
    // Baconian cipher mapping (24-letter alphabet)
    const baconianMap: { [key: string]: string } = {
        'A': 'AAAAA', 'B': 'AAAAB', 'C': 'AAABA', 'D': 'AAABB', 'E': 'AABAA',
        'F': 'AABAB', 'G': 'AABBA', 'H': 'AABBB', 'I': 'ABAAA', 'J': 'ABAAA',
        'K': 'ABAAB', 'L': 'ABABA', 'M': 'ABABB', 'N': 'ABBAA', 'O': 'ABBAB',
        'P': 'ABBBA', 'Q': 'ABBBB', 'R': 'BAAAA', 'S': 'BAAAB', 'T': 'BAABA',
        'U': 'BAABB', 'V': 'BAABB', 'W': 'BABAA', 'X': 'BABAB', 'Y': 'BABBA',
        'Z': 'BABBB'
    };

    // Clean and convert the text
    const cleanText = text.toUpperCase().replace(/[^A-Z\s.,!?]/g, '');
    let encrypted = '';
    let letterCount = 0;

    // Process each character
    for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        if (/[A-Z]/.test(char)) {
            encrypted += baconianMap[char];
            letterCount++;
            // Add space after every 5 groups (25 letters) for readability
            if (letterCount % 5 === 0) {
                encrypted += ' ';
            } else {
                encrypted += ' ';
            }
        } else {
            // Preserve spaces and punctuation
            encrypted += char;
        }
    }

    return { encrypted: encrypted.trim() };
};

// Nihilist Substitution cipher
export const encryptNihilist = (text: string): { encrypted: string; key: string } => {
    const generateNihilistKey = (): string => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const result = new Array(26);
        let available = [...alphabet];
        
        for (let i = 0; i < 26; i++) {
            available = available.filter(char => char !== alphabet[i]);
            const randomIndex = Math.floor(Math.random() * available.length);
            result[i] = available[randomIndex];
            available = [...alphabet].filter(char => 
                !result.includes(char) && char !== alphabet[i]
            );
        }
        
        return result.join('');
    };

    const key = generateNihilistKey();
    const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => 
        key[letterToNumber(char)] || char
    );

    return { encrypted, key };
};

// Fractionated Morse cipher
export const encryptFractionatedMorse = (text: string): { encrypted: string; key: string; fractionationTable: { [key: string]: string } } => {
    // Morse code mapping
    const morseMap: { [key: string]: string } = {
        'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
        'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
        'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
        'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
        'Y': '-.--', 'Z': '--..'
    };
    
    // Strip text of all non-alphabet letters and convert to uppercase
    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    
    
    
    // Convert to morse code with x to separate letters
    let morseString = '';
    for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        if (morseMap[char]) {
            morseString += morseMap[char] + 'x';
        }
    }
    
    // Pad with trailing x's if length is not divisible by 3
    while (morseString.length % 3 !== 0) {
        morseString += 'x';
    }
    
    // Group into triplets
    const triplets: string[] = [];
    for (let i = 0; i < morseString.length; i += 3) {
        const triplet = morseString.slice(i, i + 3);
        triplets.push(triplet);
    }
    
    // Create shuffled alphabet
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const shuffledAlphabet = [...alphabet].sort(() => Math.random() - 0.5);
    
    // Create maps
    const tripletToLetter: { [key: string]: string } = {};
    const letterToTriplet: { [key: string]: string } = {};
    let alphabetIndex = 0;
    
    // Process each triplet
    let encrypted = '';
    for (const triplet of triplets) {
        // If triplet already has a mapping, use it
        if (tripletToLetter[triplet]) {
            encrypted += tripletToLetter[triplet];
        } else {
            // Assign next available letter from shuffled alphabet
            const letter = shuffledAlphabet[alphabetIndex];
            tripletToLetter[triplet] = letter;
            letterToTriplet[letter] = triplet;
            encrypted += letter;
            alphabetIndex++;
        }
    }
    
    // Create the key string (the order of unique triplets)
    const key = Object.keys(tripletToLetter).join('|');
    
    return { encrypted, key, fractionationTable: tripletToLetter };
};

// Complete Columnar Transposition
export const encryptColumnarTransposition = (text: string): { encrypted: string; key: string } => {
    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    const keyLength = Math.floor(Math.random() * 5) + 3; // 3-7 characters
    
    // Generate random key
    const key = Array.from({length: keyLength}, () => 
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('');
    
    // Create matrix
    const matrix: string[][] = [];
    for (let i = 0; i < Math.ceil(cleanText.length / keyLength); i++) {
        matrix[i] = [];
        for (let j = 0; j < keyLength; j++) {
            const index = i * keyLength + j;
            matrix[i][j] = index < cleanText.length ? cleanText[index] : 'X';
        }
    }
    
    // Transpose and read by columns
    let encrypted = '';
    for (let j = 0; j < keyLength; j++) {
        for (let i = 0; i < matrix.length; i++) {
            encrypted += matrix[i][j];
        }
    }
    
    return { encrypted, key };
};

// Xenocrypt cipher (simplified version)
export const encryptXenocrypt = (text: string): { encrypted: string; key: string } => {
    const generateXenocryptKey = (): string => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const result = new Array(26);
        let available = [...alphabet];
        
        for (let i = 0; i < 26; i++) {
            available = available.filter(char => char !== alphabet[i]);
            const randomIndex = Math.floor(Math.random() * available.length);
            result[i] = available[randomIndex];
            available = [...alphabet].filter(char => 
                !result.includes(char) && char !== alphabet[i]
            );
        }
        
        return result.join('');
    };

    const key = generateXenocryptKey();
    // Handle Spanish text by normalizing accented characters
    const normalizedText = text.toUpperCase()
        .replace(/Á/g, 'A')
        .replace(/É/g, 'E')
        .replace(/Í/g, 'I')
        .replace(/Ó/g, 'O')
        .replace(/Ú/g, 'U')
        .replace(/Ü/g, 'U')
        .replace(/Ñ/g, 'N');
    
    const encrypted = normalizedText.replace(/[A-Z]/g, char => 
        key[letterToNumber(char)] || char
    );

    return { encrypted, key };
};

// New helper function to calculate letter frequencies
export const getLetterFrequencies = (text: string): { [key: string]: number } => {
    const frequencies: { [key: string]: number } = {};
    // Initialize all letters to 0
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
        frequencies[letter] = 0;
    });
    // Count occurrences
    text.split('').forEach(char => {
        if (/[A-Z]/.test(char)) {
            frequencies[char]++;
        }
    });
    return frequencies;
}; 