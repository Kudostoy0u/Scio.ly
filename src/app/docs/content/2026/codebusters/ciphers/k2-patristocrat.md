# K2 Patristocrat (Keyed Cipher Alphabet, No Spaces)

## What it is
K2 Patristocrat is a monoalphabetic substitution with a keyed CIPHERTEXT alphabet (bottom row) and a normal A–Z PLAINTEXT alphabet (top row), like K2 Aristocrat, but the ciphertext has no spaces/punctuation and is often grouped visually. Word boundaries are inferred from language.

- Top row: A–Z (plain).  
- Bottom row: keyed cipher alphabet (keyword deduped, then unused A–Z).  
- Decrypt: for C, find index i in bottom; output (A–Z)[i].

## Alphabet construction (K2)
Keyword SCIENCE → dedup SCIEN + remaining ABDFGHJKLMOPQRTUVWXYZ

Top (plain):
```
A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
```
Bottom (cipher):
```
S C I E N A B D F G H J K L M O P Q R T U V W X Y Z
```

## How decryption works (K2, no spaces)
1) Build or recover the bottom row.  
2) For each C, index i = position of C in bottom; output (A–Z)[i].  
3) Insert spaces by language; groupings are cosmetic.

## Solving method (Patristocrat specifics)
1) Reconstruct bottom row: build mapping pairs; place A–Z on top and fill bottom under each known plain letter. The row will show a keyword prefix then A–Z tail.  
2) Keyword: read bottom-row prefix (deduped) before the A–Z continuation; verify by re-encryption.  
3) Segmentation: use -ING/-ED, common words (THE/AND/OF/TO), doubles to hypothesize spaces; enforce global consistency.

## Worked mini example
Decrypt a continuous run like `KNNT…` by mapping each cipher letter’s index in the keyed bottom row back to A–Z, then place spaces as words appear.

## Common pitfalls
- Treating 5-letter groups as words.  
- Forcing a bottom row that breaks the keyword-prefix + A–Z tail rule.  
- Allowing non-bijective mappings.

## Quick reference
- K2: top A–Z; bottom keyed.  
- Decrypt: index(C in bottom) → (A–Z)[i].  
- Spaces inferred post-decode.

## Practice
1) From 12 pairs, complete the keyed bottom row and propose a deduped keyword.  
2) Decrypt and segment a grouped ciphertext.

### Answers
1) Completed rows vary; confirm (a) permutation, (b) keyword prefix + tail, (c) round-trip re-encryption.  
2) Words should align to standard patterns and remain consistent with the mapping across the text.
