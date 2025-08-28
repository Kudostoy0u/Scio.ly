import { BaconianScheme } from './baconian-schemes';

export function convertBinaryPattern(pattern: string, scheme: BaconianScheme): string {
  switch (scheme.renderType) {
    case 'direct':
      return pattern.replace(/A/g, scheme.zero as string).replace(/B/g, scheme.one as string);
      
    case 'category':
      // For category-based schemes (vowels/consonants, odd/even)
      return pattern.split('').map((char) => {
        if (char === 'A') {
          const zeroSet = scheme.zero as string;
          return zeroSet[Math.floor(Math.random() * zeroSet.length)];
        } else {
          const oneSet = scheme.one as string;
          return oneSet[Math.floor(Math.random() * oneSet.length)];
        }
      }).join('');
      
    case 'set':
      // For set-based schemes (emojis)
      const zeroSet = Array.isArray(scheme.zero) ? scheme.zero : [scheme.zero];
      const oneSet = Array.isArray(scheme.one) ? scheme.one : [scheme.one];
      return pattern.split('').map((char, index) => {
        if (char === 'A') {
          return zeroSet[index % zeroSet.length];
        } else {
          return oneSet[index % oneSet.length];
        }
      }).join('');
      
    case 'formatting':
      // For formatting schemes - handle special cases like accented letters
      if (scheme.type === 'Accented vs Plain') {
        // Use actual accented letters for A, plain letters for B
        const plainLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const accentedLetters = 'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß';
        return pattern.split('').map((char) => {
          if (char === 'A') {
            return accentedLetters[Math.floor(Math.random() * accentedLetters.length)];
          } else {
            return plainLetters[Math.floor(Math.random() * plainLetters.length)];
          }
        }).join('');
      }
      // For other formatting schemes - return the original A/B pattern, let display component handle random letters
      return pattern;
      
    default:
      return pattern;
  }
}
