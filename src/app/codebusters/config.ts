import { QuoteData } from './types';

// Centralized disabled cipher list used by UI and generator
export const DISABLED_CIPHERS: QuoteData['cipherType'][] = [
  'K3 Patristocrat',
  'Random Patristocrat',
  'Random Xenocrypt',
  'K3 Xenocrypt'
];

export const filterEnabledCiphers = (
  ciphers: QuoteData['cipherType'][]
): QuoteData['cipherType'][] => ciphers.filter(c => !DISABLED_CIPHERS.includes(c));


