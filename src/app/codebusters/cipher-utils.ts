// Helper functions for both ciphers
export const mod26 = (n: number): number => ((n % 26) + 26) % 26;
export const letterToNumber = (letter: string): number => letter.toUpperCase().charCodeAt(0) - 65;
export const numberToLetter = (num: number): string => String.fromCharCode(mod26(num) + 65);

// Helper functions for Hill cipher
const generateRandomMatrix = (size: number): number[][] => {
    const matrix: number[][] = [];
    for (let i = 0; i < size; i++) {
        matrix[i] = [];
        for (let j = 0; j < size; j++) {
            matrix[i][j] = Math.floor(Math.random() * 26);
        }
    }
    return matrix;
};

const calculateDeterminant = (matrix: number[][]): number => {
    const size = matrix.length;
    if (size === 2) {
        return mod26(matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]);
    } else if (size === 3) {
        return mod26(
            matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
            matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
            matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0])
        );
    }
    return 0;
};

const isCoprimeWith26 = (det: number): boolean => {
    const coprimeValues = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];
    return coprimeValues.includes(det);
};

const generateValidMatrix = (size: number): number[][] => {
    let matrix: number[][];
    let det: number;
    
    do {
        matrix = generateRandomMatrix(size);
        det = calculateDeterminant(matrix);
    } while (!isCoprimeWith26(det));
    
    return matrix;
};

const calculateDecryptionMatrix = (matrix: number[][]): number[][] => {
    const size = matrix.length;
    const det = calculateDeterminant(matrix);
    
    // Find modular multiplicative inverse of determinant
    let detInverse = 0;
    for (let i = 1; i < 26; i++) {
        if (mod26(det * i) === 1) {
            detInverse = i;
            break;
        }
    }
    
    if (size === 2) {
        // For 2x2: adjugate matrix × det inverse
        const adjugate = [
            [mod26(matrix[1][1]), mod26(-matrix[0][1])],
            [mod26(-matrix[1][0]), mod26(matrix[0][0])]
        ];
        
        return [
            [mod26(adjugate[0][0] * detInverse), mod26(adjugate[0][1] * detInverse)],
            [mod26(adjugate[1][0] * detInverse), mod26(adjugate[1][1] * detInverse)]
        ];
    } else if (size === 3) {
        // For 3x3: calculate cofactor matrix, transpose, multiply by det inverse
        const cofactors = [
            [mod26(matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]), 
             mod26(-(matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0])), 
             mod26(matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0])],
            [mod26(-(matrix[0][1] * matrix[2][2] - matrix[0][2] * matrix[2][1])), 
             mod26(matrix[0][0] * matrix[2][2] - matrix[0][2] * matrix[2][0]), 
             mod26(-(matrix[0][0] * matrix[2][1] - matrix[0][1] * matrix[2][0]))],
            [mod26(matrix[0][1] * matrix[1][2] - matrix[0][2] * matrix[1][1]), 
             mod26(-(matrix[0][0] * matrix[1][2] - matrix[0][2] * matrix[1][0])), 
             mod26(matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0])]
        ];
        
        // Transpose and multiply by det inverse
        return [
            [mod26(cofactors[0][0] * detInverse), mod26(cofactors[1][0] * detInverse), mod26(cofactors[2][0] * detInverse)],
            [mod26(cofactors[0][1] * detInverse), mod26(cofactors[1][1] * detInverse), mod26(cofactors[2][1] * detInverse)],
            [mod26(cofactors[0][2] * detInverse), mod26(cofactors[1][2] * detInverse), mod26(cofactors[2][2] * detInverse)]
        ];
    }
    
    return matrix; // Fallback
};

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

// Hill 2x2 cipher
export const encryptHill2x2 = (text: string): { encrypted: string; matrix: number[][] } => {
    // Generate a valid 2x2 matrix with determinant coprime with 26
    const matrix = generateValidMatrix(2);
    
    // Clean and pad the text
    const cleanText = text.replace(/[^A-Za-z]/g, '').toUpperCase();
    const paddedText = cleanText.length % 2 === 0 ? cleanText : cleanText + 'X';
    
    let encrypted = '';
    
    // Encrypt pairs of letters (2-grams)
    for (let i = 0; i < paddedText.length; i += 2) {
        const pair = [letterToNumber(paddedText[i]), letterToNumber(paddedText[i + 1])];
        
        // Matrix multiplication: key matrix × plaintext vector (mod 26)
        const encryptedPair = [
            mod26(matrix[0][0] * pair[0] + matrix[0][1] * pair[1]),
            mod26(matrix[1][0] * pair[0] + matrix[1][1] * pair[1])
        ];
        
        // Convert back to letters
        encrypted += numberToLetter(encryptedPair[0]) + numberToLetter(encryptedPair[1]);
    }
    
    // Add spaces every 5 characters for readability
    encrypted = encrypted.match(/.{1,5}/g)?.join(' ') || encrypted;
    
    return { encrypted, matrix };
};

// Hill 3x3 cipher (Division C only)
export const encryptHill3x3 = (text: string): { encrypted: string; matrix: number[][]; decryptionMatrix: number[][] } => {
    // Generate a valid 3x3 matrix with determinant coprime with 26
    const matrix = generateValidMatrix(3);
    
    // For 3x3, we provide the decryption matrix as mentioned in the requirements
    // This avoids complex matrix inversion calculations during the event
    const decryptionMatrix = calculateDecryptionMatrix(matrix);
    
    // Clean and pad the text
    const cleanText = text.replace(/[^A-Za-z]/g, '').toUpperCase();
    const paddedText = cleanText.length % 3 === 0 ? cleanText : cleanText + 'X'.repeat(3 - (cleanText.length % 3));
    
    let encrypted = '';
    
    // Encrypt triplets of letters (3-grams)
    for (let i = 0; i < paddedText.length; i += 3) {
        const triplet = [
            letterToNumber(paddedText[i]), 
            letterToNumber(paddedText[i + 1]), 
            letterToNumber(paddedText[i + 2])
        ];
        
        // Matrix multiplication: key matrix × plaintext vector (mod 26)
        const encryptedTriplet = [
            mod26(matrix[0][0] * triplet[0] + matrix[0][1] * triplet[1] + matrix[0][2] * triplet[2]),
            mod26(matrix[1][0] * triplet[0] + matrix[1][1] * triplet[1] + matrix[1][2] * triplet[2]),
            mod26(matrix[2][0] * triplet[0] + matrix[2][1] * triplet[1] + matrix[2][2] * triplet[2])
        ];
        
        // Convert back to letters
        encrypted += numberToLetter(encryptedTriplet[0]) + numberToLetter(encryptedTriplet[1]) + numberToLetter(encryptedTriplet[2]);
    }
    
    // Add spaces every 6 characters for readability
    encrypted = encrypted.match(/.{1,6}/g)?.join(' ') || encrypted;
    
    return { encrypted, matrix, decryptionMatrix };
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
export const encryptNihilist = (text: string): { encrypted: string; polybiusKey: string; cipherKey: string } => {
    // Generate two random keys for Nihilist cipher
    const generatePolybiusKey = (): string => {
        const words = [
            'SECURITY', 'PASSWORD', 'KEYBOARD', 'COMPUTER', 'NETWORK', 'SYSTEM', 'ACCESS', 'CONTROL',
            'PROTOCOL', 'ENCRYPT', 'DECRYPT', 'ALGORITHM', 'CIPHER', 'KEYWORD', 'DATABASE', 'SERVER',
            'CLIENT', 'BROWSER', 'FIREWALL', 'ANTIVIRUS', 'BACKUP', 'RESTORE', 'UPDATE', 'DOWNLOAD',
            'UPLOAD', 'CONNECT', 'DISCONNECT', 'AUTHENTICATE', 'VERIFY', 'VALIDATE', 'REGISTER', 'LOGIN',
            'LOGOUT', 'SESSION', 'COOKIE', 'TOKEN', 'HASH', 'SIGNATURE', 'CERTIFICATE', 'PRIVATE',
            'PUBLIC', 'SYMMETRIC', 'ASYMMETRIC', 'BLOCKCHAIN', 'CRYPTOCURRENCY', 'WALLET', 'MINING',
            'TRANSACTION', 'LEDGER', 'CONSENSUS', 'SMART', 'CONTRACT', 'DEFI', 'NFT', 'METAVERSE',
            'ARTIFICIAL', 'INTELLIGENCE', 'MACHINE', 'LEARNING', 'DEEP', 'NEURAL', 'NETWORK', 'TENSOR',
            'PYTHON', 'JAVASCRIPT', 'TYPESCRIPT', 'REACT', 'ANGULAR', 'VUE', 'NODE', 'EXPRESS',
            'MONGODB', 'POSTGRESQL', 'MYSQL', 'REDIS', 'DOCKER', 'KUBERNETES', 'AWS', 'AZURE',
            'GOOGLE', 'MICROSOFT', 'APPLE', 'LINUX', 'WINDOWS', 'MACOS', 'ANDROID', 'IOS',
            'BLUETOOTH', 'WIFI', 'ETHERNET', 'FIBER', 'SATELLITE', 'ROUTER', 'SWITCH', 'GATEWAY',
            'PROXY', 'VPN', 'TOR', 'DNS', 'HTTP', 'HTTPS', 'FTP', 'SSH', 'TELNET', 'SMTP',
            'POP3', 'IMAP', 'REST', 'API', 'GRAPHQL', 'SOAP', 'XML', 'JSON', 'YAML', 'CSV',
            'HTML', 'CSS', 'SCSS', 'SASS', 'LESS', 'WEBPACK', 'BABEL', 'ESLINT', 'PRETTIER',
            'GIT', 'GITHUB', 'GITLAB', 'BITBUCKET', 'JENKINS', 'TRAVIS', 'CIRCLECI', 'DOCKER',
            'KUBERNETES', 'HELM', 'TERRAFORM', 'ANSIBLE', 'CHEF', 'PUPPET', 'SALT', 'CONSUL',
            'ETCD', 'ZOOKEEPER', 'KAFKA', 'RABBITMQ', 'ACTIVEMQ', 'REDIS', 'MEMCACHED', 'ELASTIC',
            'LOGSTASH', 'KIBANA', 'GRAFANA', 'PROMETHEUS', 'NAGIOS', 'ZABBIX', 'SPLUNK', 'DATADOG',
            'NEWRELIC', 'APPDYNAMICS', 'DYNATRACE', 'JAEGER', 'ZIPKIN', 'OTEL', 'ISTIO', 'LINKERD',
            'CONSUL', 'ENVOY', 'NGINX', 'APACHE', 'TOMCAT', 'JETTY', 'UNDERTOW', 'WILDFLY',
            'SPRING', 'HIBERNATE', 'JPA', 'JAX', 'RS', 'SOAP', 'WSDL', 'UDDI', 'ESB', 'BPM',
            'WORKFLOW', 'ORCHESTRATION', 'MICROSERVICE', 'MONOLITH', 'SOA', 'DDD', 'CQRS', 'ES',
            'EVENT', 'SOURCING', 'SAGA', 'CHOREOGRAPHY', 'ORCHESTRATION', 'COMPENSATION', 'RETRY',
            'CIRCUIT', 'BREAKER', 'BULKHEAD', 'TIMEOUT', 'RATE', 'LIMITING', 'THROTTLING', 'CACHING',
            'CDN', 'EDGE', 'COMPUTING', 'FOG', 'IOT', 'MESH', 'GRID', 'CLUSTER', 'LOAD', 'BALANCER',
            'AUTOSCALING', 'HORIZONTAL', 'VERTICAL', 'SCALING', 'SHARDING', 'PARTITIONING', 'REPLICATION',
            'MASTER', 'SLAVE', 'PRIMARY', 'SECONDARY', 'READ', 'WRITE', 'CONSISTENCY', 'AVAILABILITY',
            'PARTITION', 'TOLERANCE', 'CAP', 'THEOREM', 'ACID', 'BASE', 'TRANSACTION', 'ISOLATION',
            'DURABILITY', 'ATOMICITY', 'CONSISTENCY', 'NORMALIZATION', 'DENORMALIZATION', 'INDEX',
            'QUERY', 'OPTIMIZATION', 'EXECUTION', 'PLAN', 'STATISTICS', 'ANALYZE', 'EXPLAIN',
            'PROFILING', 'BENCHMARKING', 'STRESS', 'TESTING', 'LOAD', 'PERFORMANCE', 'MONITORING',
            'ALERTING', 'LOGGING', 'TRACING', 'METRICS', 'DASHBOARD', 'REPORTING', 'ANALYTICS',
            'BUSINESS', 'INTELLIGENCE', 'DATA', 'WAREHOUSE', 'LAKE', 'STREAMING', 'BATCH', 'REAL',
            'TIME', 'NEAR', 'LATENCY', 'THROUGHPUT', 'BANDWIDTH', 'CAPACITY', 'UTILIZATION', 'EFFICIENCY'
        ];
        return words[Math.floor(Math.random() * words.length)];
    };

    const generateCipherKey = (): string => {
        const words = [
            'CASH', 'MONEY', 'GOLD', 'SILVER', 'COIN', 'BANK', 'FUND', 'DEBT',
            'CREDIT', 'DEBIT', 'LOAN', 'MORTGAGE', 'INTEREST', 'RATE', 'PRINCIPAL', 'PAYMENT',
            'DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'WIRE', 'CHECK', 'CARD', 'VISA', 'MASTERCARD',
            'AMEX', 'DISCOVER', 'PAYPAL', 'VENMO', 'CASHAPP', 'BITCOIN', 'ETHEREUM', 'DOGE',
            'ADA', 'DOT', 'LINK', 'UNI', 'AAVE', 'COMP', 'YFI', 'SUSHI', 'CRV', 'BAL',
            'SNX', 'MKR', 'REN', 'ZRX', 'BAT', 'REP', 'KNC', 'BNT', 'LRC', 'OMG',
            'STORJ', 'MANA', 'SAND', 'AXS', 'SLP', 'CHZ', 'HOT', 'VET', 'TRX', 'XRP',
            'LTC', 'BCH', 'BSV', 'XLM', 'XMR', 'ZEC', 'DASH', 'NEO', 'ONT', 'VET',
            'QTUM', 'ICX', 'WAVES', 'STRAT', 'ARK', 'LSK', 'STEEM', 'BTS', 'EOS', 'TELOS',
            'WAX', 'CHAIN', 'POLKADOT', 'COSMOS', 'AVALANCHE', 'POLYGON', 'ARBITRUM', 'OPTIMISM',
            'FANTOM', 'HARMONY', 'CELO', 'NEAR', 'SOLANA', 'ALGORAND', 'CARDANO', 'TEZOS',
            'COSMOS', 'TENDermint', 'VALIDATOR', 'DELEGATOR', 'STAKING', 'REWARDS', 'SLASHING',
            'GOVERNANCE', 'PROPOSAL', 'VOTING', 'QUORUM', 'THRESHOLD', 'CONSENSUS', 'FINALITY',
            'BLOCK', 'TRANSACTION', 'HASH', 'SIGNATURE', 'PUBLIC', 'PRIVATE', 'KEY', 'WALLET',
            'ADDRESS', 'BALANCE', 'NONCE', 'GAS', 'FEE', 'MINING', 'STAKING', 'YIELD',
            'FARMING', 'LIQUIDITY', 'POOL', 'SWAP', 'TRADE', 'ORDER', 'BOOK', 'SPREAD',
            'SLIPPAGE', 'IMPERMANENT', 'LOSS', 'APY', 'APR', 'TVL', 'MCAP', 'VOLUME',
            'MARKET', 'CAP', 'CIRCULATING', 'SUPPLY', 'MAX', 'TOTAL', 'BURNED', 'MINTED',
            'LOCKED', 'VESTED', 'CLAIM', 'AIRDROP', 'IDO', 'ICO', 'STO', 'IEO', 'LAUNCHPAD',
            'INCUBATOR', 'ACCELERATOR', 'VENTURE', 'CAPITAL', 'ANGEL', 'INVESTOR', 'FUND', 'PORTFOLIO',
            'DIVERSIFICATION', 'RISK', 'MANAGEMENT', 'HEDGE', 'DERIVATIVE', 'FUTURES', 'OPTIONS',
            'FORWARDS', 'SWAPS', 'ARBITRAGE', 'SCALPING', 'DAY', 'TRADING', 'SWING', 'POSITION',
            'LONG', 'SHORT', 'LEVERAGE', 'MARGIN', 'CALL', 'PUT', 'STRIKE', 'EXPIRY', 'PREMIUM',
            'DELTA', 'GAMMA', 'THETA', 'VEGA', 'RHO', 'IMPLIED', 'VOLATILITY', 'HISTORICAL',
            'BETA', 'ALPHA', 'SHARPE', 'RATIO', 'SORTINO', 'TREYNOR', 'INFORMATION', 'JENSEN',
            'MODERN', 'PORTFOLIO', 'THEORY', 'EFFICIENT', 'FRONTIER', 'CAPITAL', 'ASSET', 'PRICING',
            'MODEL', 'BLACK', 'SCHOLES', 'BINOMIAL', 'MONTE', 'CARLO', 'SIMULATION', 'BACKTESTING',
            'FORWARD', 'TESTING', 'WALK', 'ANALYSIS', 'COINTEGRATION', 'GRANGER', 'CAUSALITY',
            'VECTOR', 'AUTOREGRESSION', 'GARCH', 'ARCH', 'EGARCH', 'TGARCH', 'PARCH', 'APARCH',
            'STOCHASTIC', 'VOLATILITY', 'JUMP', 'DIFFUSION', 'MEAN', 'REVERSION', 'MOMENTUM',
            'CONTRARIAN', 'TREND', 'FOLLOWING', 'MEAN', 'REVERSION', 'BREAKOUT', 'BREAKDOWN',
            'SUPPORT', 'RESISTANCE', 'PIVOT', 'POINT', 'FIBONACCI', 'RETRACEMENT', 'EXTENSION',
            'ELLIOTT', 'WAVE', 'THEORY', 'DOW', 'THEORY', 'WYCKOFF', 'METHOD', 'MARKET', 'PROFILE',
            'VOLUME', 'PROFILE', 'ORDER', 'FLOW', 'TAPE', 'READING', 'LEVEL', 'II', 'DATA',
            'TIME', 'SALES', 'TICK', 'CHART', 'RANGE', 'BAR', 'CANDLESTICK', 'HEIKIN', 'ASHI',
            'RENKO', 'KAGI', 'POINT', 'FIGURE', 'LINE', 'AREA', 'COLUMN', 'BAR', 'HISTOGRAM',
            'SCATTER', 'PLOT', 'BUBBLE', 'RADAR', 'POLAR', 'STOCK', 'WATERFALL', 'FUNNEL',
            'GAUGE', 'THERMOMETER', 'PROGRESS', 'BAR', 'SLIDER', 'KNOB', 'DIAL', 'METER',
            'COMPASS', 'CLOCK', 'TIMER', 'STOPWATCH', 'CHRONOMETER', 'PENDULUM', 'SPRING',
            'GEAR', 'PULLEY', 'LEVER', 'WEDGE', 'SCREW', 'INCLINED', 'PLANE', 'WHEEL',
            'AXLE', 'BEARING', 'BUSHING', 'COUPLING', 'CLUTCH', 'BRAKE', 'TRANSMISSION',
            'DIFFERENTIAL', 'DRIVESHAFT', 'CARDAN', 'UNIVERSAL', 'JOINT', 'CV', 'CONSTANT',
            'VELOCITY', 'TRIPOD', 'DOUBLE', 'CARDAN', 'RZEPPA', 'BIRFIELD', 'WEISFELD',
            'THOMPSON', 'BALL', 'JOINT', 'TIE', 'ROD', 'END', 'BALL', 'JOINT', 'TIE',
            'ROD', 'END', 'BALL', 'JOINT', 'TIE', 'ROD', 'END', 'BALL', 'JOINT', 'TIE'
        ];
        return words[Math.floor(Math.random() * words.length)];
    };

    const polybiusKey = generatePolybiusKey();
    const cipherKey = generateCipherKey();

    // Create Polybius square using the polybius key
    const createPolybiusSquare = (key: string): string[][] => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const usedLetters = new Set<string>();
        const square: string[][] = [];
        
        // Initialize 5x5 grid
        for (let i = 0; i < 5; i++) {
            square[i] = [];
            for (let j = 0; j < 5; j++) {
                square[i][j] = '';
            }
        }

        // Fill with key first (removing duplicates)
        let keyIndex = 0;
        let alphabetIndex = 0;
        
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
                if (keyIndex < key.length) {
                    const keyChar = key[keyIndex].toUpperCase();
                    if (!usedLetters.has(keyChar)) {
                        square[i][j] = keyChar;
                        usedLetters.add(keyChar);
                        keyIndex++;
                    } else {
                        keyIndex++;
                        j--; // Retry this position
                    }
                } else {
                    // Fill remaining positions with alphabet
                    while (alphabetIndex < alphabet.length) {
                        const alphaChar = alphabet[alphabetIndex];
                        if (!usedLetters.has(alphaChar)) {
                            square[i][j] = alphaChar;
                            usedLetters.add(alphaChar);
                            alphabetIndex++;
                            break;
                        }
                        alphabetIndex++;
                    }
                }
            }
        }

        return square;
    };

    // Convert letter to coordinates in Polybius square
    const letterToCoordinates = (letter: string, square: string[][]): string => {
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
                if (square[i][j] === letter) {
                    return `${i + 1}${j + 1}`;
                }
            }
        }
        return '00'; // Fallback
    };



    // Create the Polybius square
    const polybiusSquare = createPolybiusSquare(polybiusKey);

    // Convert plaintext to numbers using Polybius square
    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    const plaintextNumbers: number[] = [];
    
    for (const char of cleanText) {
        const coords = letterToCoordinates(char, polybiusSquare);
        plaintextNumbers.push(parseInt(coords));
    }

    // Convert cipher key to numbers using same Polybius square
    const keyNumbers: number[] = [];
    for (const char of cipherKey.toUpperCase()) {
        const coords = letterToCoordinates(char, polybiusSquare);
        keyNumbers.push(parseInt(coords));
    }

    // Create running key (repeat cipher key numbers to match plaintext length)
    const runningKey: number[] = [];
    for (let i = 0; i < plaintextNumbers.length; i++) {
        runningKey.push(keyNumbers[i % keyNumbers.length]);
    }

    // Add plaintext numbers to running key numbers
    const ciphertextNumbers: number[] = [];
    for (let i = 0; i < plaintextNumbers.length; i++) {
        ciphertextNumbers.push(plaintextNumbers[i] + runningKey[i]);
    }

    // Convert numbers back to string representation
    const encrypted = ciphertextNumbers.join(' ');

    return { encrypted, polybiusKey, cipherKey };
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
    
    // Get the alphabetical order of the keyword
    const keyArray = key.split('');
    const keyOrder = keyArray
        .map((char, index) => ({ char, index }))
        .sort((a, b) => a.char.localeCompare(b.char))
        .map(item => item.index);
    
    // Read columns in keyword alphabetical order
    let encrypted = '';
    for (const colIndex of keyOrder) {
        for (let i = 0; i < matrix.length; i++) {
            encrypted += matrix[i][colIndex];
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