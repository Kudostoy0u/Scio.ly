# K1 Patristocrat (Keyed Plain Alphabet, No Spaces)

## What it is
K1 Patristocrat is a monoalphabetic substitution with a keyed PLAINTEXT alphabet (top row) and a normal A–Z CIPHERTEXT alphabet (bottom row), exactly like K1 Aristocrat—but the ciphertext removes spaces/punctuation and is often grouped visually (e.g., groups of 5). You must infer word boundaries from language while maintaining a one-to-one letter mapping.

- Top row: keyed plain alphabet (keyword deduped, then unused A–Z).
- Bottom row: A–Z.
- Decrypt: for ciphertext C, find index i in A–Z (bottom) → output top[i].

## Alphabet construction (K1)
Build the keyed plain alphabet from the keyword (dedupe, then append unused A–Z).

Example keyword: SCIENCE → dedup SCIEN; remaining ABDFGHJKLMOPQRTUVWXYZ
Top (plain):
```
S C I E N A B D F G H J K L M O P Q R T U V W X Y Z
```
Bottom (cipher):
```
A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
```

## How decryption works (K1, no spaces)
1) Build or recover the top row (keyed plain).  
2) For each C, index i = position of C in A–Z; output top[i].  
3) Insert spaces by language patterns; grouping is cosmetic.

## Solving method (Patristocrat specifics)
1) Mapping table: maintain consistent P↔C pairs (bijective). Use digrams/trigrams, double letters, and suffixes (-ING, -ED, -ER, -LY) since spaces are absent.  
2) Reconstruct top row: place A–Z on bottom; above each cipher letter C place its plaintext P at index(C). The top row will show a keyword prefix then the A–Z tail.  
3) Keyword: read the top row’s prefix (deduped) before the alphabetical continuation.  
4) Segmentation: add provisional spaces where words naturally form; keep only mappings that remain globally consistent.

## Worked mini example
Given a run like `ETTXEFEXTTPX…`, map each C to P via top row and insert spaces when common words emerge. Iterate mapping and segmentation together.

## Common pitfalls
- Treating 5-letter blocks as word boundaries.  
- Forcing a keyword that contradicts the reconstructed row.  
- Allowing duplicate P for different C (or vice versa).

## Quick reference
- K1: top keyed plain; bottom A–Z.  
- Decrypt: index(C in A–Z) → top[i].  
- Spaces are inferred; grouping is cosmetic.

## Practice
1) From 10 letter pairs, complete the K1 top row and propose a deduped keyword.  
2) Decrypt a 5-grouped ciphertext and segment into words.

### Answers
1) Completed rows vary; validate by (a) permutation of A–Z, (b) keyword prefix followed by A–Z tail, (c) re-encrypt check passes.  
2) Segmentation aligns with common words (THE/AND/OF/TO/ING/ED) and retains mapping consistency across the entire text.
