import { BaconianScheme } from './baconian-schemes';

export function convertBinaryPattern(pattern: string, scheme: BaconianScheme): string {
  switch (scheme.renderType) {
    case 'direct':
      return pattern.replace(/A/g, scheme.zero as string).replace(/B/g, scheme.one as string);
      
    case 'category':
      {
        const VOWELS = 'AEIOU';
        const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ';
        const ODD = 'ACEGIKMOQSUWY';
        const EVEN = 'BDFHJLNPRTVXZ';

        const zeroSet = (scheme.zero as string);
        const oneSet = (scheme.one as string);

        const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
        let out = '';
        for (let i = 0; i < pattern.length; i++) {
          const bit = pattern[i];
          if (scheme.type === 'Vowels/Consonants') {
            out += bit === 'A' ? pick(VOWELS) : pick(CONSONANTS);
          } else if (scheme.type === 'Odd/Even') {
            out += bit === 'A' ? pick(ODD) : pick(EVEN);
          } else {
            out += bit === 'A' ? pick(zeroSet) : pick(oneSet);
          }
        }
        return out;
      }
      
    case 'set':

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

      if (scheme.type === 'Accented vs Plain') {

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

      return pattern;
      
    default:
      return pattern;
  }
}
