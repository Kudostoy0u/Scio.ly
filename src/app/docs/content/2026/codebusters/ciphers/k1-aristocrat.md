# K1 Aristocrat (Keyed Plain Alphabet)

## What it is
K1 Aristocrat is a monoalphabetic substitution where the PLAINTEXT alphabet is keyed by a keyword and the CIPHERTEXT alphabet is the normal A–Z. Spaces and punctuation are preserved. Decrypt by indexing the ciphertext letter in A–Z (bottom row) and reading the keyed plain letter at the same index (top row).

## Alphabet Construction (K1)
Given a keyword, build the keyed PLAINTEXT alphabet:
1) Write the keyword in order, removing duplicate letters as they appear.  
2) Append the remaining letters A–Z that were not used, in normal alphabetical order.

Example: keyword = SCIENCE
- Remove duplicates → SCIEN (C and E repeats dropped)  
- Remaining letters (A–Z without S,C,I,E,N): ABDFGHJKLMOPQRTUVWXYZ

Keyed Plain Alphabet (top):
```
S C I E N A B D F G H J K L M O P Q R T U V W X Y Z
```
Cipher Alphabet (bottom, normal):
```
A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
```

One-row pairing (P↔C for a few letters):
```
S→A, C→B, I→C, E→D, N→E, A→F, B→G, D→H, F→I, G→J, H→K, J→L, K→M, L→N, M→O, O→P, P→Q, Q→R, R→S, T→T, U→U, V→V, W→W, X→X, Y→Y, Z→Z
```

Notes
- Some letters may map to themselves depending on the keyword.  
- The mapping is a permutation (one-to-one) of A–Z.

## How decryption works (K1)
1) Build or recover the keyed plain alphabet (top row).  
2) For ciphertext letter C, find index i in A–Z (bottom).  
3) Output top[i].  
4) Keep spaces/punctuation.

## Solving method (step-by-step)
1) Word patterns: single-letter (A/I), THE/AND/OF/TO/IN, apostrophes (I’M, IT’S), suffixes (-ED, -ING), doubles (LL, EE, SS, OO, TT).  
2) Mapping table: maintain Plain↔Cipher bijection without conflicts.  
3) Reconstruct top row: write A–Z on bottom; above each cipher letter C place its mapped plain P at index(C).  
4) Extract keyword: read top row from start until the alphabetical tail begins; that prefix is the deduped keyword.  
5) Finish and verify: decrypt everything; re-encrypt to check.

## Worked example (decryption and keyword recovery)
Ciphertext:
```
SNFLRPAXKCF SYEC XF UNFC
```
Target plaintext:
```
MISFORTUNES MAKE US WISE (Mary Norton)
```

Step 1: Gather letter pairs (C → P)
- Align letters (ignore spaces/punct):
  - S→M, N→I, F→S, L→F, R→O, P→R, A→T, X→U, K→N, C→E,
    S→M, Y→A, E→K, C→E, X→U, F→S, U→W, N→I, F→S, C→E

Step 2: Reconstruct keyed plain alphabet (top row)
- Bottom row is A..Z. For each C→P, set top[index(C)] = P.
- Partial top row (· = unknown), indexed by A..Z:
```
idx:  A  B  C  D  E  F  G  H  I  J  K  L  M  N  O  P  Q  R  S  T  U  V  W  X  Y  Z
top:  T  ·  E  ·  K  S  ·  ·  ·  ·  N  F  ·  I  ·  ·  R  O  M  ·  W  ·  ·  U  A  ·
```

Step 3: Finish the top row and read the keyword
- Complete with unused letters A–Z after the deduped keyword. One valid completion:
```
T B E C K S D G H J N F L I P Q R O M V W X Y U A Z
```
- A compatible recovered keyword (deduped) is the initial segment before the alphabetical tail.

Step 4: Decrypt with the completed top row
```
MISFORTUNES MAKE US WISE
```

## Advanced tips (K1)
- The top row visibly begins with the keyword letters (deduped).  
- Self-maps can occur; don’t discard them.  
- Even partial rows often allow fluent reading.

## Common mistakes
- Confusing K1 with K2 (keyed cipher) or assuming random mapping.  
- Forcing a keyword that breaks the row reconstruction.  
- Violating bijection (duplicate mappings).

## Quick reference
- K1: keyed plain (top), cipher= A–Z (bottom).  
- Decrypt: index in A–Z → take top row letter.  
- Read keyword as the row’s prefix.

## Practice (decryption only)
1) Given partial pairs C→P for a K1, place letters on the top row above A..Z and complete the row.  
2) From the completed top row, read off a valid deduplicated keyword and decrypt a sentence.  
3) For a short cipher, identify THE/AND patterns and reconstruct enough of the top row to read several words.

### Answers
1) Completed top rows vary; validate by ensuring top is a permutation of A–Z and begins with a deduped keyword followed by unused letters in order.  
2) Keyword is the prefix of the completed top row; decrypt by indexing ciphertext in A–Z and taking top[i].  
3) Typical early decodes include THE/AND/OF; your finished row should re-encrypt consistently.

## Further Reading
- Codebusters guides on keyed alphabets (K1–K3).  
- Classical monoalphabetic substitution references (keyword ciphers).
