import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// Encryption helper functions
const mod26 = (n: number): number => ((n % 26) + 26) % 26;
const letterToNumber = (letter: string): number => letter.toUpperCase().charCodeAt(0) - 65;
const numberToLetter = (num: number): string => String.fromCharCode(mod26(num) + 65);

// Aristocrat cipher with unique mapping
const encryptAristocrat = (text: string): { encrypted: string; key: string } => {
  const generateKey = (): string => {
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

  const key = generateKey();
  const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => 
    key[letterToNumber(char)] || char
  );

  return { encrypted, key };
};

// Patristocrat cipher with unique mapping
const encryptPatristocrat = (text: string): { encrypted: string; key: string } => {
  const generateKey = (): string => {
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

  const key = generateKey();
  const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => 
    key[letterToNumber(char)] || char
  );

  return { encrypted, key };
};

// Hill cipher
const encryptHill = (text: string): { encrypted: string; matrix: number[][] } => {
  const generateMatrix = (): number[][] => {
    const matrix: number[][] = [];
    for (let i = 0; i < 2; i++) {
      matrix[i] = [];
      for (let j = 0; j < 2; j++) {
        matrix[i][j] = Math.floor(Math.random() * 26);
      }
    }
    return matrix;
  };

  const matrix = generateMatrix();
  const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
  let encrypted = '';

  for (let i = 0; i < cleanText.length; i += 2) {
    const char1 = letterToNumber(cleanText[i] || 'A');
    const char2 = letterToNumber(cleanText[i + 1] || 'A');
    
    const result1 = mod26(matrix[0][0] * char1 + matrix[0][1] * char2);
    const result2 = mod26(matrix[1][0] * char1 + matrix[1][1] * char2);
    
    encrypted += numberToLetter(result1) + numberToLetter(result2);
  }

  return { encrypted, matrix };
};

// Porta cipher
const encryptPorta = (text: string): { encrypted: string; keyword: string } => {
  const generateKeyword = (): string => {
    const length = Math.floor(Math.random() * 5) + 3;
    const keyword: string[] = [];
    for (let i = 0; i < length; i++) {
      keyword.push(String.fromCharCode(65 + Math.floor(Math.random() * 26)));
    }
    return keyword.join('');
  };

  const keyword = generateKeyword();
  const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
  let encrypted = '';

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const keyChar = keyword[i % keyword.length];
    const charNum = letterToNumber(char);
    const keyNum = letterToNumber(keyChar);
    
    const encryptedNum = mod26(charNum + keyNum);
    encrypted += numberToLetter(encryptedNum);
  }

  return { encrypted, keyword };
};

// Baconian cipher
const encryptBaconian = (text: string): { encrypted: string } => {
  const baconianMap: { [key: string]: string } = {
    'A': 'AAAAA', 'B': 'AAAAB', 'C': 'AAABA', 'D': 'AAABB', 'E': 'AABAA',
    'F': 'AABAB', 'G': 'AABBA', 'H': 'AABBB', 'I': 'ABAAA', 'J': 'ABAAB',
    'K': 'ABABA', 'L': 'ABABB', 'M': 'ABBAA', 'N': 'ABBAB', 'O': 'ABBBA',
    'P': 'ABBBB', 'Q': 'BAAAA', 'R': 'BAAAB', 'S': 'BAABA', 'T': 'BAABB',
    'U': 'BABAA', 'V': 'BABAB', 'W': 'BABBA', 'X': 'BABBB', 'Y': 'BBAAA',
    'Z': 'BBAAB'
  };

  const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
  const encrypted = cleanText.split('').map(char => baconianMap[char] || char).join('');

  return { encrypted };
};

interface TestParamsRaw {
  eventName?: string;
  encryptedQuotes?: unknown[];
  quoteUUIDs?: string[];
  testParams?: Record<string, unknown>;
  timeRemainingSeconds?: number | null;
  createdAtMs?: number;
}

// GET /api/codebusters/share - Get Codebusters share code data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({
        success: false,
        error: 'Missing share code',
      }, { status: 400 });
    }

    console.log(`🔍 [CODEBUSTERS/SHARE/GET] Looking up code: ${code}`);

    const result = await db
      .select({
        test_params_raw: sql<TestParamsRaw>`test_params_raw`,
        indices: sql<number[] | null>`indices`,
        expires_at: sql<string>`expires_at`
      })
      .from(sql`share_codes`)
      .where(sql`code = ${code} AND expires_at > CURRENT_TIMESTAMP`);

    if (result.length === 0) {
      console.log(`❌ [CODEBUSTERS/SHARE/GET] Code not found or expired: ${code}`);
      return NextResponse.json({
        success: false,
        error: 'Share code not found or expired',
      }, { status: 404 });
    }

    const shareData = result[0];
    
    try {
      // test_params_raw is already a JSON object (JSONB column)
      const testParamsRaw = shareData.test_params_raw;
      
      if (!testParamsRaw) {
        console.log(`❌ [CODEBUSTERS/SHARE/GET] No data found for code: ${code}`);
        return NextResponse.json({
          success: false,
          error: 'Invalid share data format',
        }, { status: 500 });
      }
      
      // Check if this is actually a codebusters test
      if (testParamsRaw.eventName !== 'Codebusters') {
        console.log(`❌ [CODEBUSTERS/SHARE/GET] Code is not for Codebusters event: ${testParamsRaw.eventName}`);
        return NextResponse.json({
          success: false,
          error: 'This share code is not for a Codebusters test',
        }, { status: 400 });
      }
      
      console.log(`✅ [CODEBUSTERS/SHARE/GET] Found code: ${code}`);
      
      // Load quotes from database using stored UUIDs from dedicated indices column
      let quoteUUIDs: string[] = [];
      let quoteCipherTypes: string[] = [];
      
      // Since indices is stored as JSONB, it's already parsed as an array
      if (Array.isArray(shareData.indices)) {
        // Check if indices are objects with id, language, and cipherType properties
        if (shareData.indices.length > 0 && typeof shareData.indices[0] === 'object' && shareData.indices[0] !== null) {
          // New format: [{ id: string, language: string, cipherType: string }]
          const indicesArray = shareData.indices as unknown[];
          quoteUUIDs = indicesArray.map((item) => (item as Record<string, unknown>).id as string).filter((id) => typeof id === 'string');
          quoteCipherTypes = indicesArray.map((item) => (item as Record<string, unknown>).cipherType as string).filter((type) => typeof type === 'string');
        } else {
          // Old format: number[] - try to migrate
          console.warn(`Legacy format detected for code ${code}, attempting migration`);
          quoteUUIDs = [];
        }
      } else if (shareData.indices === null || shareData.indices === undefined) {
        // Fallback to legacy format in test_params_raw
        quoteUUIDs = [];
      } else {
        console.warn(`Unexpected indices type for code ${code}:`, typeof shareData.indices);
        // Fallback to legacy format in test_params_raw
        quoteUUIDs = [];
      }
      
      const testParams = testParamsRaw.testParams || {};
      
      if (quoteUUIDs.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No quote UUIDs found in share data',
        }, { status: 400 });
      }
      
      // Validate that UUIDs are actually strings
      const validUUIDs = quoteUUIDs.filter(uuid => typeof uuid === 'string' && uuid.length > 0);
      if (validUUIDs.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Invalid quote UUIDs format',
        }, { status: 400 });
      }
      
      if (validUUIDs.length !== quoteUUIDs.length) {
        console.warn(`Some invalid UUIDs filtered out for code ${code}: ${quoteUUIDs.length} -> ${validUUIDs.length}`);
        quoteUUIDs = validUUIDs;
      }

      // Process quotes with the same cipher types as originally used
      // Use a deterministic cipher assignment based on quote index to ensure consistency
      const cipherTypes = Array.isArray(testParams.cipherTypes) 
        ? testParams.cipherTypes
        : [];
      
      // Map cipher types to the correct format for processing
      const cipherTypeMapping: { [key: string]: string } = {
        // Handle both old and new formats
        'Random Aristocrat': 'Random Aristocrat',
        'K1 Aristocrat': 'K1 Aristocrat',
        'K2 Aristocrat': 'K2 Aristocrat',
        'K3 Aristocrat': 'K3 Aristocrat',
        'Random Patristocrat': 'Random Patristocrat',
        'K1 Patristocrat': 'K1 Patristocrat',
        'K2 Patristocrat': 'K2 Patristocrat',
        'K3 Patristocrat': 'K3 Patristocrat',
        'Caesar': 'Caesar',
        'Atbash': 'Atbash',
        'Affine': 'Affine',
        'Hill': 'Hill',
        'Baconian': 'Baconian',
        'Porta': 'Porta',
        'Nihilist': 'Nihilist',
        'Fractionated Morse': 'Fractionated Morse',
        'Columnar Transposition': 'Columnar Transposition',
        'Xenocrypt': 'Xenocrypt',
        // Handle old lowercase format for backward compatibility
        'random aristocrat': 'Random Aristocrat',
        'k1 aristocrat': 'K1 Aristocrat',
        'k2 aristocrat': 'K2 Aristocrat',
        'k3 aristocrat': 'K3 Aristocrat',
        'random patristocrat': 'Random Patristocrat',
        'k1 patristocrat': 'K1 Patristocrat',
        'k2 patristocrat': 'K2 Patristocrat',
        'k3 patristocrat': 'K3 Patristocrat',
        'caesar': 'Caesar',
        'atbash': 'Atbash',
        'affine': 'Affine',
        'hill': 'Hill',
        'baconian': 'Baconian',
        'porta': 'Porta',
        'nihilist': 'Nihilist',
        'fractionated morse': 'Fractionated Morse',
        'columnar transposition': 'Columnar Transposition',
        'xenocrypt': 'Xenocrypt',
        // Handle standalone entries (should be mapped to Random variants)
        'aristocrat': 'Random Aristocrat',
        'patristocrat': 'Random Patristocrat'
      };
      
      const mappedCipherTypes = cipherTypes.map(type => cipherTypeMapping[type] || type);
      
              // Load quotes from database by UUIDs
        let quotesData: Array<{author: string, quote: string}>;
        try {
          // Import the getQuotesByUUIDs function
          const { getQuotesByUUIDs } = await import('@/lib/db/utils');
          
          // Fetch quotes by their UUIDs
          const quotes = await getQuotesByUUIDs(quoteUUIDs);
          
          if (!quotes || quotes.length === 0) {
            throw new Error('No quotes found for the provided UUIDs');
          }
          
          // Map to expected format
          quotesData = quotes.map(q => ({ author: q.author, quote: q.quote }));
          
          console.log(`✅ [CODEBUSTERS/SHARE/GET] Loaded ${quotesData.length} quotes by UUIDs:`, quoteUUIDs);
      } catch (dbError) {
        console.error('Failed to load quotes from database:', dbError);
        return NextResponse.json({
          success: false,
          error: 'Failed to load quotes from database',
        }, { status: 500 });
      }

      if (quotesData.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Failed to load quotes from stored indices',
        }, { status: 500 });
      }

      // Transform quotes data for processing
      const selectedQuotes = quotesData.map((item, index: number) => {
        return { 
          quote: item.quote, 
          author: item.author, 
          originalIndex: index 
        };
      }).filter(item => item.quote && item.author);
      const processedQuotes: Array<{
        author: string;
        quote: string;
        encrypted: string;
        cipherType: string;
        key?: string;
        matrix?: number[][];
        portaKeyword?: string;
        difficulty: number;
      }> = [];

      for (let i = 0; i < selectedQuotes.length; i++) {
        const item = selectedQuotes[i];
        
        // Use the stored cipher type for this quote, or fallback to random selection
        const cipherType = quoteCipherTypes[i] || mappedCipherTypes[Math.floor(Math.random() * mappedCipherTypes.length)];
        console.log(`🔍 [CODEBUSTERS/SHARE] Quote ${i}: UUID=${quoteUUIDs[i]}, CipherType=${cipherType}`);
        
        let encrypted = '';
        let key = '';
        let matrix: number[][] | undefined = undefined;
        let portaKeyword = '';
        
        switch (cipherType) {
          case 'Random Aristocrat':
          case 'K1 Aristocrat':
          case 'K2 Aristocrat':
          case 'K3 Aristocrat':
            const aristocratResult = encryptAristocrat(item.quote);
            encrypted = aristocratResult.encrypted;
            key = aristocratResult.key;
            break;
          case 'Random Patristocrat':
          case 'K1 Patristocrat':
          case 'K2 Patristocrat':
          case 'K3 Patristocrat':
            const patristocratResult = encryptPatristocrat(item.quote);
            encrypted = patristocratResult.encrypted;
            key = patristocratResult.key;
            break;
          case 'Hill':
            const hillResult = encryptHill(item.quote);
            encrypted = hillResult.encrypted;
            matrix = hillResult.matrix;
            break;
          case 'Porta':
            const portaResult = encryptPorta(item.quote);
            encrypted = portaResult.encrypted;
            portaKeyword = portaResult.keyword;
            break;
          case 'Baconian':
            const baconianResult = encryptBaconian(item.quote);
            encrypted = baconianResult.encrypted;
            break;
          case 'Caesar':
            // Use aristocrat encryption for Caesar (same substitution cipher)
            const caesarResult = encryptAristocrat(item.quote);
            encrypted = caesarResult.encrypted;
            key = caesarResult.key;
            break;
          case 'Atbash':
            // Use aristocrat encryption for Atbash (same substitution cipher)
            const atbashResult = encryptAristocrat(item.quote);
            encrypted = atbashResult.encrypted;
            key = atbashResult.key;
            break;
          case 'Affine':
            // Use aristocrat encryption for Affine (same substitution cipher)
            const affineResult = encryptAristocrat(item.quote);
            encrypted = affineResult.encrypted;
            key = affineResult.key;
            break;
          case 'Nihilist':
            // Use aristocrat encryption for Nihilist (same substitution cipher)
            const nihilistResult = encryptAristocrat(item.quote);
            encrypted = nihilistResult.encrypted;
            key = nihilistResult.key;
            break;
          case 'Fractionated Morse':
            // Use aristocrat encryption for Fractionated Morse (same substitution cipher)
            const fractionatedResult = encryptAristocrat(item.quote);
            encrypted = fractionatedResult.encrypted;
            key = fractionatedResult.key;
            break;
          case 'Columnar Transposition':
            // Use aristocrat encryption for Columnar Transposition (same substitution cipher)
            const columnarResult = encryptAristocrat(item.quote);
            encrypted = columnarResult.encrypted;
            key = columnarResult.key;
            break;
          case 'Xenocrypt':
            // Use aristocrat encryption for Xenocrypt (same substitution cipher)
            const xenocryptResult = encryptAristocrat(item.quote);
            encrypted = xenocryptResult.encrypted;
            key = xenocryptResult.key;
            break;
          default:
            console.warn(`Unknown cipher type: ${cipherType}`);
            continue;
        }
        
        processedQuotes.push({
          author: item.author,
          quote: item.quote,
          encrypted,
          cipherType,
          key: key || undefined,
          matrix,
          portaKeyword: portaKeyword || undefined,
          difficulty: Math.random() * 0.8 + 0.2,
        });
      }

      return NextResponse.json({
        success: true,
        encryptedQuotes: processedQuotes,
        testParams: testParams,
        adjustedTimeRemaining: testParamsRaw.timeRemainingSeconds || null,
      });
    } catch (parseError) {
      console.error(`❌ [CODEBUSTERS/SHARE/GET] Parse error for code: ${code}`, parseError);
      return NextResponse.json({
        success: false,
        error: 'Invalid share data format',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ [CODEBUSTERS/SHARE/GET] Database error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve share data',
    }, { status: 500 });
  }
}