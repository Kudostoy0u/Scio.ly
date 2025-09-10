import { BaconianScheme } from './baconian-schemes';
import { convertBinaryPattern } from './pattern-converter';

export function renderBinaryGroup(binaryGroup: string, scheme: BaconianScheme): string {
  switch (scheme.renderType) {
    case 'direct':
      return binaryGroup.replace(/A/g, scheme.zero as string).replace(/B/g, scheme.one as string);
      
    case 'category':
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
      // For emoji/symbol sets, select a random item from the set per bit to avoid repetition patterns
      // Also guard against undefined values by falling back to the first item when needed
      const zeroSet = (Array.isArray(scheme.zero) ? scheme.zero : [scheme.zero]).filter(Boolean) as string[];
      const oneSet = (Array.isArray(scheme.one) ? scheme.one : [scheme.one]).filter(Boolean) as string[];
      const pick = (arr: string[]) => arr.length ? arr[Math.floor(Math.random() * arr.length)] : '';
      return binaryGroup.split('').map((char) => {
        return char === 'A' ? (pick(zeroSet) || zeroSet[0] || '') : (pick(oneSet) || oneSet[0] || '');
      }).join('');
      
    case 'formatting':

      return convertBinaryPattern(binaryGroup, scheme);
      
    default:
      return binaryGroup;
  }
}

export function getCssClassForFormatting(char: string, scheme: BaconianScheme): string {
  if (scheme.renderType !== 'formatting') return '';
  

  if (scheme.type === 'Accented vs Plain') {
    return '';
  }
  

  if (scheme.type === 'Highlight vs Plain') {
    return '';
  }
  

  if (char === 'A') {
    return scheme.cssClass || '';
  } else {
    return scheme.cssClassB || '';
  }
}


const randomLetterCache = new Map<string, string>();
const categoryLetterCache = new Map<string, string>();

export function getDisplayLetter(char: string, position: string = '', scheme?: BaconianScheme): string {

  if (scheme?.type === 'Accented vs Plain') {
    return char;
  }
  

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
