# K1 Aristocrat (Keyed Plain Alphabet)

## Explanation
K1 Aristocrat is a monoalphabetic substitution cipher where the PLAINTEXT alphabet is keyed by a keyword and the CIPHERTEXT alphabet remains the normal alphabetical order (A–Z). Spaces and punctuation are preserved. The same mapping applies throughout the text.

Conceptually: index letters against two rows of equal length (26). The top row is the keyed plain alphabet; the bottom row is the standard A–Z. To decrypt, take a ciphertext letter C, find its index i in the bottom row (A–Z), and output the top-row letter at that same index.

Why this matters
- Knowing it’s K1 tells you the cipher alphabet is the normal A–Z, while the plain alphabet is the keyed variant.  
- If you reconstruct the two-row mapping from a solved section, you can read off the keyed plain alphabet and extract the keyword.

## Alphabet Construction (K1)
Given a keyword, build the keyed PLAINTEXT alphabet:
1) Write the keyword in order, removing duplicate letters as they appear.  
2) Append the remaining letters A–Z that were not used, in normal alphabetical order.

Example: keyword = SCIENCE
- Remove duplicates → SCIEN (C and E re-used are dropped)  
- Remaining letters (A–Z without S,C,I,E,N): ABDFGHJKLMOPQRTUVWXYZ

Keyed Plain Alphabet (top):
```
S C I E N A B D F G H J K L M O P Q R T U V W X Y Z
```
Cipher Alphabet (bottom, normal):
```
A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
```

One-row pairing (showing as pairs P↔C for a few letters):
```
S→A, C→B, I→C, E→D, N→E, A→F, B→G, D→H, F→I, G→J, H→K, J→L, K→M, L→N, M→O, O→P, P→Q, Q→R, R→S, T→T, U→U, V→V, W→W, X→X, Y→Y, Z→Z
```

Notes
- It’s fine for some letters to map to themselves (e.g., T→T here) depending on the keyword.  
- The mapping is a permutation of the alphabet; each plain letter maps to a unique cipher letter.

## How Decryption Works (K1 only)
1) Build or recover the keyed plain alphabet (top row).  
2) For each ciphertext letter C, find its index i in the normal A–Z (bottom row).  
3) Output the i-th letter of the keyed plain alphabet.  
4) Keep spaces/punctuation unchanged.

Properties
- Monoalphabetic and consistent: same letter maps the same way everywhere.  
- Preserves word boundaries and punctuation, which gives strong pattern clues.  
- Compared to Random Aristocrat, K1 uses a structured keyed plain alphabet rather than a completely random mapping.

## Solving Method (Step-by-Step)
Approach overview: Identify likely plaintext letters/words, accumulate mapping pairs, reconstruct the keyed plain alphabet row, and extract the keyword.

1) Start with word patterns
- Single-letter words → A or I by context.  
- Look for THE/AND/OF/TO/IN in common positions.  
- Consider apostrophes (I’M, IT’S, DON’T), suffixes (-ED, -ING), and double letters (LL, EE, SS, OO, TT).

2) Build a mapping table
- Maintain two maps: Plain→Cipher and Cipher→Plain.  
- Each confirmed letter pair fills one slot; never allow conflicts (one-to-one constraint).

3) Reconstruct keyed plain alphabet
- Once you have many pairs, list cipher letters in A–Z order on the bottom row. Above each cipher letter C place its mapped plain letter P (if known).  
- The top row you’re building (in the cipher’s positional order A..Z) is actually the keyed plain alphabet.  
- As gaps fill, you’ll see the top row become a permuted alphabet beginning with a keyword (duplicate-free) followed by the unused letters A–Z.

4) Extract the keyword
- Read the keyed plain alphabet from the start until the first time the sequence proceeds in natural alphabetical order for several letters; the initial segment is typically the keyword (duplicate-free).  
- Try plausible dictionary words that match the initial segment; confirm by re-encrypting a few words and checking the whole cipher for consistency.

5) Finish and verify
- Once the top row is complete, decrypt everything directly.  
- Verify by re-encrypting the plaintext using the recovered keyword to ensure round-trip correctness.

## Worked example (step-by-step, decryption and keyword recovery)
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

Step 2: Reconstruct the keyed plain alphabet (top row)
- For K1, bottom row is A..Z. For each observed pair C→P, set top[index(C)] = P.
- Partial top row (unknown shown as ·), indexed by bottom row A..Z:
```
idx:  A  B  C  D  E  F  G  H  I  J  K  L  M  N  O  P  Q  R  S  T  U  V  W  X  Y  Z
top:  T  ·  E  ·  K  S  ·  ·  ·  ·  N  F  ·  I  ·  ·  R  O  M  ·  W  ·  ·  U  A  ·
```

Step 3: Finish the top row and read the keyword
- Fill the remaining · positions with the unused letters in alphabetical order after the keyword. One valid completed top row consistent with the mapping above is:
```
T B E C K S D G H J N F L I P Q R O M V W X Y U A Z
```
- Keyword (deduplicated) is the initial segment of this top row before the alphabetical tail begins. A valid recovered keyword from this solve is:
```
TBECKSDGHJNF LIPQROMV
```
(deduped from the top row; any equivalent keyword that generates the same top row is acceptable.)

Step 4: Decrypt with the recovered top row
- For each ciphertext letter, take its A..Z index and output the top-row letter at that index. Using the completed top row above, the ciphertext decrypts to:
```
MISFORTUNES MAKE US WISE
```
Add punctuation/attribution as required.

## Advanced Tips (K1-specific)
- Keyword reconstruction: After partial decryption, the top row will literally show the keyword’s letters first (deduplicated). Use this visible structure to guess the keyword quickly.  
- Self-maps: Some letters may map to themselves depending on keyword positioning; don’t rule that out.  
- Hybrid solve: Even without the full keyword, decryption proceeds from the partially built top row.

## Common Mistakes
- Assuming the cipher alphabet is keyed (that’s K2), when K1 keys the plain alphabet instead.  
- Forcing a keyword that doesn’t match the positional reconstruction.  
- Allowing mapping conflicts (violating one-to-one mapping).  
- Over-trusting letter frequency in very short texts; always cross-check with word patterns.

## Quick Reference
- K1: keyed PLAINTEXT alphabet, CIPHER alphabet = normal A–Z.  
- Encrypt: P at index i in keyed plain → C = A–Z[i].  
- Decrypt: C at index i in A–Z → P = keyedPlain[i].  
- Reconstruct top row (keyed plain) above A–Z in index order, then read keyword from the start.

## Practice Exercises (Decryption Only)
1) Given partial pairs C→P for a K1, place letters on the top row above A..Z and complete the row.  
2) From the completed top row, read off a valid deduplicated keyword and decrypt a sentence.  
3) For a short cipher, identify THE/AND patterns and reconstruct enough of the top row to read several words.

## FAQ
Q: How do I know it’s K1 and not K2?  
A: In K1, the cipher alphabet behaves as normal A–Z. When you index by ciphertext positions (A..Z), the reconstructed plain row forms a keyword-first sequence. In K2, the bottom row is keyed; the reconstruction shows the keyword on the bottom.

Q: Can the keyword contain repeated letters?  
A: Yes, but you only keep the first occurrence when building the keyed alphabet.

Q: Are spaces/punctuation encrypted?  
A: Typically no (preserved), but always follow problem instructions.

## Pseudocode (Reference)
```text
alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

function buildK1PlainAlphabet(keyword):
  key = []
  seen = {}
  for ch in keyword:
    if ch not in seen and 'A'<=ch<='Z':
      key.append(ch); seen[ch] = true
  for ch in alphabet:
    if ch not in seen: key.append(ch)
  return key.join("")

// Encrypt
// plainTop = buildK1PlainAlphabet(keyword)
// cipherBottom = alphabet
// for each P: i = indexOf(P in plainTop); C = cipherBottom[i]

// Decrypt
// for each C: i = indexOf(C in cipherBottom); P = plainTop[i]
```

## Further Reading
- Codebusters guides on keyed alphabets (K1–K3).  
- Classical monoalphabetic substitution references (keyword ciphers).
