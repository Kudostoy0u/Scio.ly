# K3 Aristocrat (Both Alphabets Keyed)

## Explanation
K3 Aristocrat is a monoalphabetic substitution cipher where BOTH the PLAINTEXT alphabet and the CIPHERTEXT alphabet are keyed (typically with the same keyword). Spaces and punctuation are preserved. The mapping is still a one-to-one permutation of letters, but both rows are permuted.

Conceptually: index letters against two keyed rows of equal length (26). The top row is the keyed plain alphabet; the bottom row is the keyed cipher alphabet. Encryption uses positions; decryption uses inverse positions.

Why this matters
- Compared to K1 (keyed plain only) and K2 (keyed cipher only), K3 is slightly trickier because neither row is the normal A–Z.  
- Nevertheless, the structure is visible: each keyed row begins with the deduplicated keyword, followed by the unused letters in alphabetical order. Reconstructing either row partially reveals the keyword prefix.

## Alphabet Construction (K3)
Given a keyword, build two keyed alphabets:
1) Keyed Plain Alphabet (top) via keyword (dedupe, then append unused letters A–Z).  
2) Keyed Cipher Alphabet (bottom) via the same keyword (or occasionally a second keyword in some variants—follow puzzle instructions).  

Example: keyword = SCIENCE
- Deduped keyword: SCIEN  
- Remaining letters: ABDFGHJKLMOPQRTUVWXYZ

Keyed Plain (top):
```
S C I E N A B D F G H J K L M O P Q R T U V W X Y Z
```
Keyed Cipher (bottom):
```
S C I E N A B D F G H J K L M O P Q R T U V W X Y Z
```
(Here we chose the same construction for clarity.)

One-row pairing (P↔C for a few letters):
```
S→S, C→C, I→I, E→E, N→N, A→A, B→B, D→D, F→F, G→G, H→H, J→J ...
```
In this toy example the rows are identical, producing identity mapping on those indices; in real cases, the two keyed rows may not align, producing a non-trivial permutation.

## How It Works (Encryption/Decryption)
Encryption (K3)
1) Build keyed plain alphabet (top) and keyed cipher alphabet (bottom).  
2) For each plaintext letter P, find its index i in the keyed plain alphabet.  
3) Output the i-th letter of the keyed cipher alphabet.  
4) Preserve spaces/punctuation.

Decryption (K3)
1) For each ciphertext letter C, find index i in the keyed cipher alphabet.  
2) Output the i-th letter of the keyed plain alphabet.  
3) Preserve spaces/punctuation.

## Solving Method (Step-by-Step)
Approach overview: Derive consistent mapping pairs from patterns, then reconstruct both rows by aligning indices. The keyword reveals itself at the start of either row as letters finalize.

1) Pattern mapping
- Use the same word-shape strategies as Random Aristocrat/K1/K2: A/I, THE/AND/OF, apostrophes, suffixes, double letters.  
- Accumulate P↔C hypotheses; enforce one-to-one mapping.

2) Index alignment
- Create a 26-column table (indices 0..25). As you confirm P↔C, place P in a candidate top-row cell and C in the same column bottom-row cell.  
- Over time, the top row should read as a keyword prefix + remaining letters; similarly for the bottom row.  
- You can reconstruct either row first; once one is solid, the other is immediate by column matching.

3) Keyword inference
- The initial consecutive segment (before the alphabetical continuation) is your keyword (deduped).  
- Test candidate dictionary words sharing that prefix; confirm via partial re-encryption.

4) Finish and verify
- Complete both rows and read the plaintext.  
- Verify by re-encrypting with both keyed rows to ensure a consistent round trip.

## Worked Example (Mini)
Suppose partial pairs suggest the following columns are filled (toy data):
```
Index:  0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25
Top:    S  C  I  E  N  A  B  D  F  G   H  J  K  L  M  O  P  Q  R  T  U  V  W  X  Y  Z
Bottom: C  E  S  N  I  A  B  D  F  H   G  J  K  L  M  O  P  Q  R  T  U  V  W  X  Y  Z
```
Top begins with keyword SCIEN..., bottom begins with CESNI...; the recovered keyword could be “SCIENCE” for both rows. Confirm by trying additional letters.

## Advanced Tips (K3-specific)
- Dual reconstruction: If one row stalls, fill the other. Any confirmed P↔C pair fixes a column in both rows.  
- Same/dual keyword: Many competitions use the same keyword for both rows; some variants may use two. Always check instructions.  
- Identity traps: If early columns look identical between rows, don’t assume the whole cipher is identity; collect more columns to confirm.

## Common Mistakes
- Treating it like K1 (assuming bottom row is A–Z) or K2 (assuming top row is A–Z).  
- Forcing keyword candidates that break the alphabetical continuation rule.  
- Allowing duplicate letters in the same row columns (violates permutation constraint).

## Quick Reference
- K3: Both rows keyed (often same keyword).  
- Encrypt: P at index i in keyedPlain → C = keyedCipher[i].  
- Decrypt: C at index i in keyedCipher → P = keyedPlain[i].  
- Reconstruct 26 columns; keyword shows at row starts.

## Practice Exercises
1) With keyword “SCIENCE”, construct both keyed rows and encrypt: ATTACKATDAWN.  
2) From partial P↔C pairs, fill columns and guess whether one or two keywords are being used.  
3) Prove your solution by re-encrypting the plaintext and matching the original ciphertext.

## Pseudocode (Reference)
```text
alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

function buildKeyedAlphabet(keyword):
  key = []
  seen = {}
  for ch in keyword:
    if ch not in seen and 'A'<=ch<='Z':
      key.append(ch); seen[ch] = true
  for ch in alphabet:
    if ch not in seen: key.append(ch)
  return key.join("")

// Encrypt (K3):
// plainTop = buildKeyedAlphabet(keyword)
// ciphBot  = buildKeyedAlphabet(keyword) // or second keyword
// for P: i = indexOf(P in plainTop); C = ciphBot[i]

// Decrypt (K3):
// for C: i = indexOf(C in ciphBot); P = plainTop[i]
```

## Further Reading
- Codebusters K1–K3 references and examples.  
- Classical keyword ciphers and permutation alphabets.
