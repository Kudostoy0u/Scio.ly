/**
 * Cipher utilities for Codebusters event
 * Provides comprehensive cipher encryption and decryption functionality
 */

// Re-export utility functions
export { mod26, letterToNumber, numberToLetter, formatTime } from "./ciphers/utils/cipherUtils";

// Re-export existing cipher functions
export { encryptCaesar } from "./ciphers/caesar";
export { encryptAtbash } from "./ciphers/atbash";
export { encryptAffine } from "./ciphers/affine";
export {
  encryptRandomAristocrat,
  encryptRandomPatristocrat,
  encryptRandomXenocrypt,
} from "./ciphers/random-substitutions";
export {
  encryptK1Aristocrat as k1Aristo,
  encryptK2Aristocrat as k2Aristo,
  encryptK3Aristocrat as k3Aristo,
} from "./ciphers/substitution-k-aristo";
export {
  encryptK1Patristocrat as k1Patri,
  encryptK2Patristocrat as k2Patri,
  encryptK3Patristocrat as k3Patri,
} from "./ciphers/substitution-k-patri";
export {
  encryptK1Xenocrypt as k1Xeno,
  encryptK2Xenocrypt as k2Xeno,
  encryptK3Xenocrypt as k3Xeno,
} from "./ciphers/substitution-k-xeno";
export { encryptPorta } from "./ciphers/porta";

// Re-export refactored cipher functions
export { encryptHill2x2, encryptHill3x3 } from "./ciphers/hill/hillCiphers";
export { encryptBaconian } from "./ciphers/baconian/baconianCipher";
export { encryptNihilist } from "./ciphers/nihilist/nihilistCipher";
export { encryptFractionatedMorse } from "./ciphers/fractionatedMorse/fractionatedMorseCipher";
export {
  encryptColumnarTransposition,
  encryptCryptarithm,
} from "./ciphers/transposition/transpositionCiphers";
export { encryptCheckerboard } from "./ciphers/checkerboard/checkerboardCipher";

// Re-export types
export type {
  HillCipherResult,
  BaconianCipherResult,
  NihilistCipherResult,
  FractionatedMorseResult,
  ColumnarTranspositionResult,
  CryptarithmResult,
  CheckerboardResult,
} from "./ciphers/types/cipherTypes";
