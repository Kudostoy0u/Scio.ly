import { BaconianScheme } from './baconian-schemes';
import { convertBinaryPattern } from './pattern-converter';

export function renderBinaryGroup(binaryGroup: string, scheme: BaconianScheme): string {
  switch (scheme.renderType) {
    case 'direct':
      return binaryGroup.replace(/A/g, scheme.zero as string).replace(/B/g, scheme.one as string);
      
    case 'category':
      // For category-based schemes (vowels/consonants, odd/even)
      return binaryGroup.split('').map((char, index) => {
        const cacheKey = `${scheme.type}_${char}_${index}`;
        if (!categoryLetterCache.has(cacheKey)) {
          if (char === 'A') {
            const zeroSet = scheme.zero as string;
            categoryLetterCache.set(cacheKey, zeroSet[Math.floor(Math.random() * zeroSet.length)]);
          } else {
            const oneSet = scheme.one as string;
            categoryLetterCache.set(cacheKey, oneSet[Math.floor(Math.random() * oneSet.length)]);
          }
        }
        return categoryLetterCache.get(cacheKey) || char;
      }).join('');
      
    case 'set':
      // For set-based schemes (emojis)
      const zeroSet = Array.isArray(scheme.zero) ? scheme.zero : [scheme.zero];
      const oneSet = Array.isArray(scheme.one) ? scheme.one : [scheme.one];
      return binaryGroup.split('').map((char, index) => {
        if (char === 'A') {
          return zeroSet[index % zeroSet.length];
        } else {
          return oneSet[index % oneSet.length];
        }
      }).join('');
      
    case 'formatting':
      // For formatting schemes - convert the A/B pattern to random letters with A/B encoding
      return convertBinaryPattern(binaryGroup, scheme);
      
    default:
      return binaryGroup;
  }
}

export function getCssClassForFormatting(char: string, scheme: BaconianScheme): string {
  if (scheme.renderType !== 'formatting') return '';
  
  // For accented vs plain, no CSS needed since accents are already in the characters
  if (scheme.type === 'Accented vs Plain') {
    return '';
  }
  
  // For highlight vs plain, no CSS needed since we handle it with inline styles
  if (scheme.type === 'Highlight vs Plain') {
    return '';
  }
  
  // For other formatting schemes, A gets the primary CSS class, B gets the secondary CSS class
  if (char === 'A') {
    return scheme.cssClass || '';
  } else {
    return scheme.cssClassB || '';
  }
}

// Cache for consistent random letters per character position
const randomLetterCache = new Map<string, string>();
const categoryLetterCache = new Map<string, string>();

export function getDisplayLetter(char: string, position: string = '', scheme?: BaconianScheme): string {
  // For accented vs plain, the character is already the correct letter (accented or plain)
  if (scheme?.type === 'Accented vs Plain') {
    return char;
  }
  
  // For other formatting schemes, generate a consistent random letter instead of showing A/B
  if (char === 'A' || char === 'B') {
    const cacheKey = `${char}_${position}`;
    if (!randomLetterCache.has(cacheKey)) {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      randomLetterCache.set(cacheKey, letters[Math.floor(Math.random() * letters.length)]);
    }
    return randomLetterCache.get(cacheKey) || char;
  }
  return char;
}
