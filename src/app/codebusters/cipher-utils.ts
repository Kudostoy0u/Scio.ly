// Helper functions for both ciphers
export const mod26 = (n: number): number => ((n % 26) + 26) % 26;
export const letterToNumber = (letter: string): number => {
    const upperLetter = letter.toUpperCase();
    if (upperLetter === 'Ñ') return 26; // Ñ is position 26 (after Z)
    return upperLetter.charCodeAt(0) - 65;
};
export const numberToLetter = (num: number): string => {
    if (num === 26) return 'Ñ'; // Ñ is position 26
    return String.fromCharCode(mod26(num) + 65);
};

// Helper functions for keyword-based alphabet generation
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

// Centralized word bank for all cipher keywords
const CIPHER_WORD_BANK = [
    // General cipher/security terms
    'CRYPTO', 'SCIENCE', 'ALGORITHM', 'CIPHER', 'KEYWORD', 'SECURITY', 
    'PUZZLE', 'ENIGMA', 'MATRIX', 'VECTOR', 'SECRET', 'MESSAGE', 
    'CODE', 'BREAK', 'SOLVE', 'FIND', 'HIDDEN', 'CLUE', 'ANSWER',
    
    // Technology and computing
    'PASSWORD', 'KEYBOARD', 'COMPUTER', 'NETWORK', 'SYSTEM', 'ACCESS', 'CONTROL',
    'PROTOCOL', 'ENCRYPT', 'DECRYPT', 'DATABASE', 'SERVER', 'CLIENT', 'BROWSER', 
    'FIREWALL', 'ANTIVIRUS', 'BACKUP', 'RESTORE', 'UPDATE', 'DOWNLOAD', 'UPLOAD', 
    'CONNECT', 'DISCONNECT', 'AUTHENTICATE', 'VERIFY', 'VALIDATE', 'REGISTER', 'LOGIN',
    'LOGOUT', 'SESSION', 'COOKIE', 'TOKEN', 'HASH', 'SIGNATURE', 'CERTIFICATE', 'PRIVATE',
    'PUBLIC', 'SYMMETRIC', 'ASYMMETRIC', 'BLOCKCHAIN', 'CRYPTOCURRENCY', 'WALLET', 'MINING',
    'TRANSACTION', 'LEDGER', 'CONSENSUS', 'SMART', 'CONTRACT', 'DEFI', 'NFT', 'METAVERSE',
    'ARTIFICIAL', 'INTELLIGENCE', 'MACHINE', 'LEARNING', 'DEEP', 'NEURAL', 'TENSOR',
    'PYTHON', 'JAVASCRIPT', 'TYPESCRIPT', 'REACT', 'ANGULAR', 'VUE', 'NODE', 'EXPRESS',
    'MONGODB', 'POSTGRESQL', 'MYSQL', 'REDIS', 'DOCKER', 'KUBERNETES', 'AWS', 'AZURE',
    'GOOGLE', 'MICROSOFT', 'APPLE', 'LINUX', 'WINDOWS', 'MACOS', 'ANDROID', 'IOS',
    'BLUETOOTH', 'WIFI', 'ETHERNET', 'FIBER', 'SATELLITE', 'ROUTER', 'SWITCH', 'GATEWAY',
    'PROXY', 'VPN', 'TOR', 'DNS', 'HTTP', 'HTTPS', 'FTP', 'SSH', 'TELNET', 'SMTP',
    'POP3', 'IMAP', 'REST', 'API', 'GRAPHQL', 'SOAP', 'XML', 'JSON', 'YAML', 'CSV',
    'HTML', 'CSS', 'SCSS', 'SASS', 'LESS', 'WEBPACK', 'BABEL', 'ESLINT', 'PRETTIER',
    'GIT', 'GITHUB', 'GITLAB', 'BITBUCKET', 'JENKINS', 'TRAVIS', 'CIRCLECI',
    'HELM', 'TERRAFORM', 'ANSIBLE', 'CHEF', 'PUPPET', 'SALT', 'CONSUL', 'ETCD', 
    'ZOOKEEPER', 'KAFKA', 'RABBITMQ', 'ACTIVEMQ', 'MEMCACHED', 'ELASTIC', 'LOGSTASH', 
    'KIBANA', 'GRAFANA', 'PROMETHEUS', 'NAGIOS', 'ZABBIX', 'SPLUNK', 'DATADOG',
    'NEWRELIC', 'APPDYNAMICS', 'DYNATRACE', 'JAEGER', 'ZIPKIN', 'OTEL', 'ISTIO', 'LINKERD',
    'ENVOY', 'NGINX', 'APACHE', 'TOMCAT', 'JETTY', 'UNDERTOW', 'WILDFLY', 'SPRING', 
    'HIBERNATE', 'JPA', 'JAX', 'RS', 'WSDL', 'UDDI', 'ESB', 'BPM', 'WORKFLOW', 
    'ORCHESTRATION', 'MICROSERVICE', 'MONOLITH', 'SOA', 'DDD', 'CQRS', 'ES', 'EVENT', 
    'SOURCING', 'SAGA', 'CHOREOGRAPHY', 'COMPENSATION', 'RETRY', 'CIRCUIT', 'BREAKER', 
    'BULKHEAD', 'TIMEOUT', 'RATE', 'LIMITING', 'THROTTLING', 'CACHING', 'CDN', 'EDGE', 
    'COMPUTING', 'FOG', 'IOT', 'MESH', 'GRID', 'CLUSTER', 'LOAD', 'BALANCER',
    'AUTOSCALING', 'HORIZONTAL', 'VERTICAL', 'SCALING', 'SHARDING', 'PARTITIONING', 
    'REPLICATION', 'MASTER', 'SLAVE', 'PRIMARY', 'SECONDARY', 'READ', 'WRITE', 
    'CONSISTENCY', 'AVAILABILITY', 'PARTITION', 'TOLERANCE', 'CAP', 'THEOREM', 'ACID', 
    'BASE', 'TRANSACTION', 'ISOLATION', 'DURABILITY', 'ATOMICITY', 'NORMALIZATION', 
    'DENORMALIZATION', 'INDEX', 'QUERY', 'OPTIMIZATION', 'EXECUTION', 'PLAN', 'STATISTICS', 
    'ANALYZE', 'EXPLAIN', 'PROFILING', 'BENCHMARKING', 'STRESS', 'TESTING', 'PERFORMANCE', 
    'MONITORING', 'ALERTING', 'LOGGING', 'TRACING', 'METRICS', 'DASHBOARD', 'REPORTING', 
    'ANALYTICS', 'BUSINESS', 'INTELLIGENCE', 'DATA', 'WAREHOUSE', 'LAKE', 'STREAMING', 
    'BATCH', 'REAL', 'TIME', 'NEAR', 'LATENCY', 'THROUGHPUT', 'BANDWIDTH', 'CAPACITY', 
    'UTILIZATION', 'EFFICIENCY',
    
    // Science and education
    'OLYMPIAD', 'COMPETITION', 'STUDENT', 'RESEARCH', 'EXPERIMENT', 'DISCOVERY', 
    'INNOVATION', 'TECHNOLOGY', 'MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY', 
    'ENGINEERING', 'PROGRAMMING', 'ANALYSIS', 'SOLUTION', 'PROBLEM', 'CHALLENGE', 
    'KNOWLEDGE', 'LEARNING', 'EDUCATION', 'ACADEMIC', 'SCHOLAR', 'SCIENTIST', 
    'RESEARCHER', 'INVENTOR', 'PIONEER', 'EXPLORER', 'INVESTIGATOR', 'OBSERVER', 
    'ANALYST', 'SPECIALIST', 'EXPERT', 'PROFESSIONAL', 'ACADEMICIAN', 'THEORIST', 
    'PRACTITIONER', 'INTELLECTUAL', 'PHILOSOPHER', 'THINKER', 'INNOVATOR', 'CREATOR', 
    'DESIGNER', 'ARCHITECT', 'BUILDER', 'DEVELOPER', 'PROGRAMMER', 'ENGINEER', 
    'TECHNICIAN', 'OPERATOR', 'ADMINISTRATOR', 'MANAGER', 'COORDINATOR', 'ORGANIZER', 
    'PLANNER', 'STRATEGIST', 'TACTICIAN', 'CONSULTANT', 'ADVISOR', 'COUNSELOR', 
    'MENTOR', 'TUTOR', 'INSTRUCTOR', 'TEACHER', 'PROFESSOR', 'LECTURER', 'EDUCATOR',
    'TRAINER', 'COACH', 'GUIDE', 'LEADER', 'DIRECTOR', 'SUPERVISOR', 'CONTROLLER',
    'REGULATOR', 'MONITOR', 'WATCHER', 'GUARDIAN', 'PROTECTOR', 'DEFENDER', 
    'CUSTODIAN', 'KEEPER', 'CARETAKER', 'HANDLER', 'MODERATOR', 'MEDIATOR',
    'ARBITRATOR', 'JUDGE', 'REFEREE', 'UMPIRE', 'ADJUDICATOR', 'ASSESSOR',
    'EVALUATOR', 'EXAMINER', 'INSPECTOR', 'AUDITOR', 'REVIEWER', 'CRITIC',
    'AUTHORITY', 'MASTER', 'GURU', 'SAGE', 'WIZARD', 'MAGICIAN', 'SORCERER', 
    'ENCHANTER', 'CONJURER', 'ILLUSIONIST', 'PERFORMER', 'ENTERTAINER', 'ARTIST',
    'CONSTRUCTOR', 'MANUFACTURER', 'PRODUCER', 'GENERATOR', 'ORIGINATOR', 'FOUNDER', 
    'ESTABLISHER', 'INITIATOR', 'TRAILBLAZER', 'PATHFINDER', 'DISCOVERER',
    
    // Finance and economics
    'CASH', 'MONEY', 'GOLD', 'SILVER', 'COIN', 'BANK', 'FUND', 'DEBT', 'CREDIT', 
    'DEBIT', 'LOAN', 'MORTGAGE', 'INTEREST', 'RATE', 'PRINCIPAL', 'PAYMENT',
    'DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'WIRE', 'CHECK', 'CARD', 'VISA', 'MASTERCARD',
    'AMEX', 'DISCOVER', 'PAYPAL', 'VENMO', 'CASHAPP', 'BITCOIN', 'ETHEREUM', 'DOGE',
    'ADA', 'DOT', 'LINK', 'UNI', 'AAVE', 'COMP', 'YFI', 'SUSHI', 'CRV', 'BAL',
    'SNX', 'MKR', 'REN', 'ZRX', 'BAT', 'REP', 'KNC', 'BNT', 'LRC', 'OMG',
    'STORJ', 'MANA', 'SAND', 'AXS', 'SLP', 'CHZ', 'HOT', 'VET', 'TRX', 'XRP',
    'LTC', 'BCH', 'BSV', 'XLM', 'XMR', 'ZEC', 'DASH', 'NEO', 'ONT', 'QTUM', 
    'ICX', 'WAVES', 'STRAT', 'ARK', 'LSK', 'STEEM', 'BTS', 'EOS', 'TELOS', 'WAX', 
    'CHAIN', 'POLKADOT', 'COSMOS', 'AVALANCHE', 'POLYGON', 'ARBITRUM', 'OPTIMISM',
    'FANTOM', 'HARMONY', 'CELO', 'NEAR', 'SOLANA', 'ALGORAND', 'CARDANO', 'TEZOS',
    'TENDermint', 'VALIDATOR', 'DELEGATOR', 'STAKING', 'REWARDS', 'SLASHING',
    'GOVERNANCE', 'PROPOSAL', 'VOTING', 'QUORUM', 'THRESHOLD', 'FINALITY',
    'BLOCK', 'HASH', 'ADDRESS', 'BALANCE', 'NONCE', 'GAS', 'FEE', 'STAKING', 'YIELD',
    'FARMING', 'LIQUIDITY', 'POOL', 'SWAP', 'TRADE', 'ORDER', 'BOOK', 'SPREAD',
    'SLIPPAGE', 'IMPERMANENT', 'LOSS', 'APY', 'APR', 'TVL', 'MCAP', 'VOLUME',
    'MARKET', 'CAP', 'CIRCULATING', 'SUPPLY', 'MAX', 'TOTAL', 'BURNED', 'MINTED',
    'LOCKED', 'VESTED', 'CLAIM', 'AIRDROP', 'IDO', 'ICO', 'STO', 'IEO', 'LAUNCHPAD',
    'INCUBATOR', 'ACCELERATOR', 'VENTURE', 'CAPITAL', 'ANGEL', 'INVESTOR', 'PORTFOLIO',
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
    'CONTRARIAN', 'TREND', 'FOLLOWING', 'BREAKOUT', 'BREAKDOWN', 'SUPPORT', 'RESISTANCE', 
    'PIVOT', 'POINT', 'FIBONACCI', 'RETRACEMENT', 'EXTENSION', 'ELLIOTT', 'WAVE', 'THEORY', 
    'DOW', 'THEORY', 'WYCKOFF', 'METHOD', 'MARKET', 'PROFILE', 'VOLUME', 'PROFILE', 
    'ORDER', 'FLOW', 'TAPE', 'READING', 'LEVEL', 'II', 'DATA', 'SALES', 'TICK', 'CHART', 
    'RANGE', 'BAR', 'CANDLESTICK', 'HEIKIN', 'ASHI', 'RENKO', 'KAGI', 'FIGURE', 'LINE', 
    'AREA', 'COLUMN', 'HISTOGRAM', 'SCATTER', 'PLOT', 'BUBBLE', 'RADAR', 'POLAR', 'STOCK', 
    'WATERFALL', 'FUNNEL', 'GAUGE', 'THERMOMETER', 'PROGRESS', 'SLIDER', 'KNOB', 'DIAL', 
    'METER', 'COMPASS', 'CLOCK', 'TIMER', 'STOPWATCH', 'CHRONOMETER', 'PENDULUM', 'SPRING',
    'GEAR', 'PULLEY', 'LEVER', 'WEDGE', 'SCREW', 'INCLINED', 'PLANE', 'WHEEL', 'AXLE', 
    'BEARING', 'BUSHING', 'COUPLING', 'CLUTCH', 'BRAKE', 'TRANSMISSION', 'DIFFERENTIAL', 
    'DRIVESHAFT', 'CARDAN', 'UNIVERSAL', 'JOINT', 'CV', 'CONSTANT', 'VELOCITY', 'TRIPOD', 
    'DOUBLE', 'RZEPPA', 'BIRFIELD', 'WEISFELD', 'THOMPSON', 'BALL', 'JOINT', 'TIE', 'ROD', 'END'
];

const generateRandomKeyword = (): string => {
    return CIPHER_WORD_BANK[Math.floor(Math.random() * CIPHER_WORD_BANK.length)];
};

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

// K1 Aristocrat cipher - Plain alphabet is keyed
export const encryptK1Aristocrat = (text: string): { encrypted: string; key: string } => {
    const keyword = generateRandomKeyword();
    const plainAlphabet = generateKeywordAlphabet(keyword);
    const cipherAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    // Create substitution mapping
    const substitutionMap: { [key: string]: string } = {};
    for (let i = 0; i < 26; i++) {
        substitutionMap[plainAlphabet[i]] = cipherAlphabet[i];
    }
    
    const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => 
        substitutionMap[char] || char
    );

    return { encrypted, key: keyword };
};

// K2 Aristocrat cipher - Cipher alphabet is keyed
export const encryptK2Aristocrat = (text: string): { encrypted: string; key: string } => {
    const keyword = generateRandomKeyword();
    const plainAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const cipherAlphabet = generateKeywordAlphabet(keyword);
    
    // Create substitution mapping
    const substitutionMap: { [key: string]: string } = {};
    for (let i = 0; i < 26; i++) {
        substitutionMap[plainAlphabet[i]] = cipherAlphabet[i];
    }
    
    const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => 
        substitutionMap[char] || char
    );

    return { encrypted, key: keyword };
};

// K3 Aristocrat cipher - Both alphabets use the same keyword
export const encryptK3Aristocrat = (text: string): { encrypted: string; key: string } => {
    const keyword = generateRandomKeyword();
    const plainAlphabet = generateKeywordAlphabet(keyword);
    const cipherAlphabet = generateKeywordAlphabet(keyword);
    
    // Create substitution mapping with shift to avoid self-mapping
    const substitutionMap: { [key: string]: string } = {};
    for (let i = 0; i < 26; i++) {
        const shiftedIndex = (i + 1) % 26; // Shift by 1 to avoid self-mapping
        substitutionMap[plainAlphabet[i]] = cipherAlphabet[shiftedIndex];
    }
    
    const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => 
        substitutionMap[char] || char
    );

    return { encrypted, key: keyword };
};

// K1 Patristocrat cipher - Plain alphabet is keyed
export const encryptK1Patristocrat = (text: string): { encrypted: string; key: string } => {
    const keyword = generateRandomKeyword();
    const plainAlphabet = generateKeywordAlphabet(keyword);
    const cipherAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    // Create substitution mapping
    const substitutionMap: { [key: string]: string } = {};
    for (let i = 0; i < 26; i++) {
        substitutionMap[plainAlphabet[i]] = cipherAlphabet[i];
    }
    
    // Remove all non-letters and convert to uppercase
    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    
    // Encrypt the cleaned text
    const encryptedLetters = cleanText.split('').map(char => 
        substitutionMap[char] || char
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

    return { encrypted, key: keyword };
};

// K2 Patristocrat cipher - Cipher alphabet is keyed
export const encryptK2Patristocrat = (text: string): { encrypted: string; key: string } => {
    const keyword = generateRandomKeyword();
    const plainAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const cipherAlphabet = generateKeywordAlphabet(keyword);
    
    // Create substitution mapping
    const substitutionMap: { [key: string]: string } = {};
    for (let i = 0; i < 26; i++) {
        substitutionMap[plainAlphabet[i]] = cipherAlphabet[i];
    }
    
    // Remove all non-letters and convert to uppercase
    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    
    // Encrypt the cleaned text
    const encryptedLetters = cleanText.split('').map(char => 
        substitutionMap[char] || char
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

    return { encrypted, key: keyword };
};

// K3 Patristocrat cipher - Both alphabets use the same keyword
export const encryptK3Patristocrat = (text: string): { encrypted: string; key: string } => {
    const keyword = generateRandomKeyword();
    const plainAlphabet = generateKeywordAlphabet(keyword);
    const cipherAlphabet = generateKeywordAlphabet(keyword);
    
    // Create substitution mapping with shift to avoid self-mapping
    const substitutionMap: { [key: string]: string } = {};
    for (let i = 0; i < 26; i++) {
        const shiftedIndex = (i + 1) % 26; // Shift by 1 to avoid self-mapping
        substitutionMap[plainAlphabet[i]] = cipherAlphabet[shiftedIndex];
    }
    
    // Remove all non-letters and convert to uppercase
    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    
    // Encrypt the cleaned text
    const encryptedLetters = cleanText.split('').map(char => 
        substitutionMap[char] || char
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

    return { encrypted, key: keyword };
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
    
    // Hill 2x2: no blocks, continuous text
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
    // Use centralized word bank for Porta keywords
    const portaKeywords = CIPHER_WORD_BANK;

    // Porta table - each row represents the substitution alphabet for a keyword letter pair
    // Based on the correct Porta cipher algorithm from your example
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

    // Select a random keyword from the word bank
    const keyword = portaKeywords[Math.floor(Math.random() * portaKeywords.length)];

    // Clean the text - remove all non-letters and convert to uppercase
    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');

    // Encrypt the text using Porta cipher
    let encrypted = '';
    for (let i = 0; i < cleanText.length; i++) {
        const keywordChar = keyword[i % keyword.length];
        const textChar = cleanText[i];
        
        // Find which row in the Porta table to use based on the keyword character
        // Each letter maps to a specific pair in the Porta table
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
        
        const pair = charToPair[keywordChar];
        const portaRow = portaTable[pair];
        
        // Porta's rule: A-M vs N-Z handling
        const charCode = textChar.charCodeAt(0);
        
        let cipherChar;
        if (charCode >= 65 && charCode <= 77) { // A-M (1-13)
            // Find the plaintext letter in the header row (A-M), get cipher from key row
            const headerRow = 'ABCDEFGHIJKLM';
            const headerIndex = headerRow.indexOf(textChar);
            cipherChar = portaRow[headerIndex];
        } else { // N-Z (14-26)
            // Find the plaintext letter in the key row, get cipher from header
            const keyRowIndex = portaRow.indexOf(textChar);
            const headerRow = 'ABCDEFGHIJKLM';
            cipherChar = headerRow[keyRowIndex];
        }
        encrypted += cipherChar;
    }

    // Porta: randomize block sizes (3-6, weighted distribution)
    const blockSizes = [3, 3, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6]; // weighted distribution
    const blockSize = blockSizes[Math.floor(Math.random() * blockSizes.length)];
    encrypted = encrypted.match(new RegExp(`.{1,${blockSize}}`, 'g'))?.join(' ') || encrypted;

    return { encrypted, keyword };
};

import { selectRandomScheme } from './schemes/baconian-schemes';
import { convertBinaryPattern } from './schemes/pattern-converter';

// Baconian cipher with 24-letter alphabet (I/J same, U/V same) and variety of binary representations
export const encryptBaconian = (text: string): { encrypted: string; binaryType: string } => {
    // Baconian cipher mapping (24-letter alphabet)
    const baconianMap: { [key: string]: string } = {
        'A': 'AAAAA', 'B': 'AAAAB', 'C': 'AAABA', 'D': 'AAABB', 'E': 'AABAA',
        'F': 'AABAB', 'G': 'AABBA', 'H': 'AABBB', 'I': 'ABAAA', 'J': 'ABAAA',
        'K': 'ABAAB', 'L': 'ABABA', 'M': 'ABABB', 'N': 'ABBAA', 'O': 'ABBAB',
        'P': 'ABBBA', 'Q': 'ABBBB', 'R': 'BAAAA', 'S': 'BAAAB', 'T': 'BAABA',
        'U': 'BAABB', 'V': 'BAABB', 'W': 'BABAA', 'X': 'BABAB', 'Y': 'BABBA',
        'Z': 'BABBB'
    };

    // Clean the text and convert to uppercase
    const cleanedText = text.toUpperCase().replace(/[^A-Z]/g, '');
    
    // Convert each letter to its 5-bit binary representation
    let binaryPattern = '';
    for (let i = 0; i < cleanedText.length; i++) {
        const letter = cleanedText[i];
        if (baconianMap[letter]) {
            binaryPattern += baconianMap[letter];
        }
    }

    // Select a random scheme
    const selectedScheme = selectRandomScheme();

    // Convert the binary pattern to the selected representation
    const convertedPattern = convertBinaryPattern(binaryPattern, selectedScheme);
    
    // Format the encrypted text with spaces every 5 groups
    let encrypted = '';
    for (let i = 0; i < convertedPattern.length; i += 5) {
        if (i > 0) encrypted += ' ';
        encrypted += convertedPattern.slice(i, i + 5);
    }

    return { encrypted: encrypted.trim(), binaryType: selectedScheme.type };
};

// Nihilist Substitution cipher
export const encryptNihilist = (text: string): { encrypted: string; polybiusKey: string; cipherKey: string } => {
    // Generate two random keys for Nihilist cipher
    const generatePolybiusKey = (): string => {
        return CIPHER_WORD_BANK[Math.floor(Math.random() * CIPHER_WORD_BANK.length)];
    };

    const generateCipherKey = (): string => {
        return CIPHER_WORD_BANK[Math.floor(Math.random() * CIPHER_WORD_BANK.length)];
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

    // Nihilist: randomize block sizes (3-6 pairs, weighted distribution) with gaps between blocks
    const blockSizes = [3, 3, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6]; // weighted distribution
    const blockSize = blockSizes[Math.floor(Math.random() * blockSizes.length)];
    
    // Convert numbers back to string representation
    const numberString = ciphertextNumbers.join(' ');
    
    // Group into blocks of the chosen size with gaps between blocks
    const blocks: string[] = [];
    const pairs = numberString.split(' ');
    
    for (let i = 0; i < pairs.length; i += blockSize) {
        const block = pairs.slice(i, i + blockSize).join(' ');
        if (block.trim()) {
            blocks.push(block);
        }
    }
    
    const encrypted = blocks.join('  '); // double space between blocks for clear separation

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
    
    // Split text into words and convert to uppercase, keeping only letters
    const words = text.toUpperCase().split(/\s+/).map(word => word.replace(/[^A-Z]/g, '')).filter(word => word.length > 0);

    // Convert to morse code with 'x' to separate letters and add one extra 'x' between words
    let morseString = '';
    for (let wi = 0; wi < words.length; wi++) {
        const word = words[wi];
        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            if (morseMap[char]) {
                morseString += morseMap[char] + 'x';
            }
        }
        // Add one extra 'x' between words (but not after the last word)
        if (wi < words.length - 1) {
            morseString += 'x';
        }
    }
    
    // Remove any triple x patterns that might have been created
    morseString = morseString.replace(/xxx/g, 'xx');
    
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
    
    // Filter out any 'xxx' triplets from the fractionation table
    const filteredFractionationTable: { [key: string]: string } = {};
    Object.entries(tripletToLetter).forEach(([triplet, letter]) => {
        if (triplet !== 'xxx' && !triplet.includes('xxx')) {
            filteredFractionationTable[triplet] = letter;
        }
    });
    
    return { encrypted, key, fractionationTable: filteredFractionationTable };
};

// Complete Columnar
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

// Random Xenocrypt cipher
export const encryptRandomXenocrypt = (text: string): { encrypted: string; key: string } => {
    const generateRandomXenocryptKey = (): string => {
        const alphabet = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split(''); // 27 letters including Ñ
        const result = new Array(27);
        let available = [...alphabet];
        
        for (let i = 0; i < 27; i++) {
            available = available.filter(char => char !== alphabet[i]);
            const randomIndex = Math.floor(Math.random() * available.length);
            result[i] = available[randomIndex];
            available = [...alphabet].filter(char => 
                !result.includes(char) && char !== alphabet[i]
            );
        }
        
        return result.join('');
    };

    const key = generateRandomXenocryptKey();
    // Handle Spanish text by normalizing accented characters, but preserve Ñ
    const normalizedText = text.toUpperCase()
        .replace(/Á/g, 'A')
        .replace(/É/g, 'E')
        .replace(/Í/g, 'I')
        .replace(/Ó/g, 'O')
        .replace(/Ú/g, 'U')
        .replace(/Ü/g, 'U');
    // Note: Ñ is preserved and not converted to N
    
    const encrypted = normalizedText.replace(/[A-ZÑ]/g, char => 
        key[letterToNumber(char)] || char
    );

    return { encrypted, key };
};

// K1 Xenocrypt cipher - Plain alphabet is keyed
export const encryptK1Xenocrypt = (text: string): { encrypted: string; key: string } => {
    const keyword = generateRandomKeyword();
    const plainAlphabet = generateKeywordAlphabet(keyword) + 'Ñ'; // Add Ñ for Spanish
    const cipherAlphabet = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
    
    // Create substitution mapping
    const substitutionMap: { [key: string]: string } = {};
    for (let i = 0; i < 27; i++) {
        substitutionMap[plainAlphabet[i]] = cipherAlphabet[i];
    }
    
    // Handle Spanish text by normalizing accented characters, but preserve Ñ
    const normalizedText = text.toUpperCase()
        .replace(/Á/g, 'A')
        .replace(/É/g, 'E')
        .replace(/Í/g, 'I')
        .replace(/Ó/g, 'O')
        .replace(/Ú/g, 'U')
        .replace(/Ü/g, 'U');
    // Note: Ñ is preserved and not converted to N
    
    const encrypted = normalizedText.replace(/[A-ZÑ]/g, char => 
        substitutionMap[char] || char
    );

    return { encrypted, key: keyword };
};

// K2 Xenocrypt cipher - Cipher alphabet is keyed
export const encryptK2Xenocrypt = (text: string): { encrypted: string; key: string } => {
    const keyword = generateRandomKeyword();
    const plainAlphabet = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
    const cipherAlphabet = generateKeywordAlphabet(keyword) + 'Ñ'; // Add Ñ for Spanish
    
    // Create substitution mapping
    const substitutionMap: { [key: string]: string } = {};
    for (let i = 0; i < 27; i++) {
        substitutionMap[plainAlphabet[i]] = cipherAlphabet[i];
    }
    
    // Handle Spanish text by normalizing accented characters, but preserve Ñ
    const normalizedText = text.toUpperCase()
        .replace(/Á/g, 'A')
        .replace(/É/g, 'E')
        .replace(/Í/g, 'I')
        .replace(/Ó/g, 'O')
        .replace(/Ú/g, 'U')
        .replace(/Ü/g, 'U');
    // Note: Ñ is preserved and not converted to N
    
    const encrypted = normalizedText.replace(/[A-ZÑ]/g, char => 
        substitutionMap[char] || char
    );

    return { encrypted, key: keyword };
};

// New helper function to calculate letter frequencies
export const getLetterFrequencies = (text: string): { [key: string]: number } => {
    const frequencies: { [key: string]: number } = {};
    
    // Check if text contains Ñ to determine if it's xenocrypt
    const isXenocrypt = text.includes('Ñ');
    const alphabet = isXenocrypt ? 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    // Initialize all letters to 0
    alphabet.split('').forEach(letter => {
        frequencies[letter] = 0;
    });
    
    // Count occurrences
    text.split('').forEach(char => {
        if (isXenocrypt) {
            if (/[A-ZÑ]/.test(char)) {
                frequencies[char]++;
            }
        } else {
            if (/[A-Z]/.test(char)) {
                frequencies[char]++;
            }
        }
    });
    
    // Ensure Ñ is always initialized for xenocrypt ciphers, even if not in text
    if (isXenocrypt && !frequencies.hasOwnProperty('Ñ')) {
        frequencies['Ñ'] = 0;
    }
    
    return frequencies;
}; 

// Straddling Checkerboard (Monome-Dinome) cipher
// Returns: encrypted numeric string, plus board parameters so solvers can reconstruct
export const encryptCheckerboard = (text: string): {
    encrypted: string;
    checkerboardKeyword: string;
    checkerboardR1: number;
    checkerboardR2: number;
} => {
    // 1) Build mixed alphabet from a keyword (I/J combined for 25 letters or keep 26; we keep 26 and allow J)
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const keywords = CIPHER_WORD_BANK;
    const checkerboardKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    const used = new Set<string>();
    const mixed: string[] = [];
    for (const ch of checkerboardKeyword.toUpperCase()) {
        if (/[A-Z]/.test(ch) && !used.has(ch)) {
            used.add(ch);
            mixed.push(ch);
        }
    }
    for (const ch of alphabet) {
        if (!used.has(ch)) {
            used.add(ch);
            mixed.push(ch);
        }
    }

    // 2) Choose two distinct straddle digits R1 and R2
    const digits = [0,1,2,3,4,5,6,7,8,9];
    const checkerboardR1 = digits.splice(Math.floor(Math.random() * digits.length), 1)[0];
    const checkerboardR2 = digits.splice(Math.floor(Math.random() * digits.length), 1)[0];

    // 3) Layout board: columns 0..9; top row skips columns R1 and R2
    // Top row gets single-digit mappings; remaining letters spill into two extra rows prefixed by R1 and R2
    const topRow: (string | null)[] = new Array(10).fill(null);
    const rowR1: string[] = new Array(10).fill('');
    const rowR2: string[] = new Array(10).fill('');

    let mixedIndex = 0;
    // Fill top row excluding R1/R2
    for (let c = 0; c < 10 && mixedIndex < mixed.length; c++) {
        if (c === checkerboardR1 || c === checkerboardR2) continue;
        topRow[c] = mixed[mixedIndex++];
        if (mixedIndex >= mixed.length) break;
    }
    // Remaining to row R1 then row R2 by columns 0..9
    for (let c = 0; c < 10 && mixedIndex < mixed.length; c++) {
        rowR1[c] = mixed[mixedIndex++] || '';
    }
    for (let c = 0; c < 10 && mixedIndex < mixed.length; c++) {
        rowR2[c] = mixed[mixedIndex++] || '';
    }

    // Build letter → code map
    const letterToCode: Record<string, string> = {};
    for (let c = 0; c < 10; c++) {
        const ch = topRow[c];
        if (ch && ch.length === 1) {
            letterToCode[ch] = String(c);
        }
    }
    for (let c = 0; c < 10; c++) {
        const ch = rowR1[c];
        if (ch && ch.length === 1) {
            letterToCode[ch] = `${checkerboardR1}${c}`;
        }
    }
    for (let c = 0; c < 10; c++) {
        const ch = rowR2[c];
        if (ch && ch.length === 1) {
            letterToCode[ch] = `${checkerboardR2}${c}`;
        }
    }

    // Encode
    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
    let encryptedDigits = '';
    for (const ch of cleanText) {
        const code = letterToCode[ch];
        if (code) encryptedDigits += code;
    }
    return { encrypted: encryptedDigits, checkerboardKeyword, checkerboardR1, checkerboardR2 };
};

// Cryptarithm cipher
// Returns: encrypted text (the cryptarithm puzzle), plus cryptarithm data
export const encryptCryptarithm = (_text: string): {
    encrypted: string;
    cryptarithmData: {
        equation: string;
        numericExample: string;
        digitGroups: Array<{
            digits: string;
            word: string;
        }>;
        hint?: string;
    };
} => {
    // Predefined cryptarithm puzzles
    const cryptarithmPuzzles = [
        {
            equation: "  E A T\n+ T H A T\n---------\nA P P L E",
            numericExample: "  8 1 9\n+ 9 2 1 9\n---------\n1 0 0 3 8",
            digitGroups: [
                { digits: "2 8 1 9", word: "H E A T" },
                { digits: "9 2 8", word: "T H E" },
                { digits: "0 3 1 9 8", word: "P L A T E" }
            ],
            hint: "The solution is microwave-related."
        },
        {
            equation: "  S E N D\n+ M O R E\n---------\nM O N E Y",
            numericExample: "  9 5 6 7\n+ 1 0 8 5\n---------\n1 0 6 5 2",
            digitGroups: [
                { digits: "1 0 6 5 2", word: "M O N E Y" },
                { digits: "9 5 6 7", word: "S E N D" },
                { digits: "1 0 8 5", word: "M O R E" }
            ],
            hint: "Think about sending money."
        },
        {
            equation: "  C R O S S\n+ R O A D S\n---------\nD A N G E R",
            numericExample: "  9 6 2 3 3\n+ 6 2 1 7 3\n---------\n1 5 8 4 0 6",
            digitGroups: [
                { digits: "1 5 8 4 0 6", word: "D A N G E R" },
                { digits: "9 6 2 3 3", word: "C R O S S" },
                { digits: "6 2 1 7 3", word: "R O A D S" }
            ],
            hint: "Be careful when crossing roads."
        }
    ];

    // Select a random puzzle
    const puzzle = cryptarithmPuzzles[Math.floor(Math.random() * cryptarithmPuzzles.length)];
    
    // Create the encrypted text (the puzzle description)
    const encrypted = `Solve the cryptarithm and then use the digit→letter key to decode the number string shown.\n\nContext\n\nThe alphametic shown is\n\n${puzzle.equation}\n\nwith the numeric example printed on the puzzle:\n\n${puzzle.numericExample}\n\nThe puzzle hint says the solution is ${puzzle.hint?.toLowerCase().replace('the solution is ', '').replace('.', '')}-related.`;

    return {
        encrypted,
        cryptarithmData: puzzle
    };
};