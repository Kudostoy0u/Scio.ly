# Nihilist Cipher

## Explanation
The Nihilist cipher (aka Nihilist substitution) encodes text by converting letters to Polybius-square coordinates, converting a separate cipher keyword to numbers using the same square, creating a running key by repeating those keyword numbers, and then combining (adding) the plaintext numbers with the running-key numbers to form the ciphertext numbers. Decryption reverses by subtracting the running key from the ciphertext numbers and translating numbers back to letters via the same Polybius square.

In Codebusters, the standard approach uses a 5×5 Polybius square (25-letter alphabet) with I/J combined (or similar instruction). Always follow the event instructions for alphabet and formatting. Spaces/punctuation are usually removed before conversion.

Key components
- Polybius key (keyword to build a 5×5 square).  
- Cipher key (another keyword converted to numbers via the same square).  
- Running key (repeat cipher key numbers to match plaintext-length in numbers).  
- Numeric combination (add for encryption, subtract for decryption).  

## Algorithm Overview
1) Build 5×5 Polybius square with a Polybius key (I/J combined).  
2) Convert plaintext (letters only, I/J merged) to Polybius coordinates (two-digit numbers, 1–5 row then 1–5 column).  
3) Convert cipher keyword letters to Polybius numbers.  
4) Create a running key by repeating the cipher key numbers to match the plaintext-number stream length.  
5) Encryption: combine plaintext-number pairs and running-key pairs (digit-wise addition without carry is common; follow event rules).  
6) Decryption: subtract running-key pairs from ciphertext pairs (digit-wise, borrowing as needed) and convert numbers back to letters via the Polybius square.

## Polybius Square Construction (5×5)
- Alphabet (25 letters): A B C D E F G H I/J K L M N O P Q R S T U V W X Y Z  
- Build the square row-wise with: unique letters of the key (in order), then remaining letters A–Z skipping duplicates and merging I/J.

Example key: SECURITY  
Unique key letters (I/J merged): S E C U R I(TY next) T Y  
Then fill the rest of the alphabet not yet used:

```
Row/Col   1   2   3   4   5
1        S   E   C   U   R
2        I   T   Y   A   B
3        D   F   G   H   K
4        L   M   N   O   P
5        Q   V   W   X   Z
```
Notes
- I/J combined: treat both I and J as I when encoding; decode contextually.
- Other merges are possible if specified; default to I/J.

## Mapping Letters to Numbers
- Coordinates: row followed by column, 1–5 each (e.g., S at (1,1) → 11; E at (1,2) → 12; …).  
- Plaintext letters → pairs like 11, 12, 45, etc.  
- Cipher keyword letters → similar pairs.

Example (plaintext → numbers)
Plaintext (normalized): SECRETO  
S=11, E=12, C=13, R=15, E=12, T=22, O=44  
Plain numbers: 11 12 13 15 12 22 44

Example (cipher key → numbers)
Cipher key: CASH  
C=13, A=24, S=11, H=34  
Key numbers: 13 24 11 34

## Running Key Creation
Repeat the key numbers to match plaintext-number length:
Plain length = 7 pairs → need 7 key pairs  
Cipher key numbers repeated: 13 24 11 34 13 24 11  
Align pairwise with plaintext numbers.

## Combining Numbers
Common contest rule: digit-wise addition without carry (mod 10 per digit). Confirm with your event rules.  
- Example: 11 + 13 → 24 (1+1=2, 1+3=4).  
- If using pure decimal addition (less common), adjust accordingly.

Encryption example (digit-wise add)
Plain: 11 12 13 15 12 22 44  
Key:   13 24 11 34 13 24 11  
Add →  24 36 24 49 25 46 55

Ciphertext numbers: 24 36 24 49 25 46 55

Decryption example (digit-wise subtract)
Cipher: 24 36 24 49 25 46 55  
Key:    13 24 11 34 13 24 11  
Sub →   11 12 13 15 12 22 44  → map via square → SECRETO

## Formatting and Output
- Numbers typically printed as two digits per letter (e.g., 24 36 24 …).  
- Grouping (e.g., 10 pairs per line) is for readability only.  
- Plaintext spacing/punctuation often removed before encoding; follow problem instructions.

## Worked, End-to-End Example
Polybius key: SECURITY  
Cipher key: CASH  
Plaintext: MENSAJE (Spanish example; normalize J→I)

1) Build square (as above).  
2) Normalize plaintext: MENSAIE (J→I)  
Map to numbers via square:  
- M=42, E=12, N=43, S=11, A=24, I=21, E=12  
Plain: 42 12 43 11 24 21 12

3) Cipher key to numbers: C=13, A=24, S=11, H=34 → 13 24 11 34  
Running key (repeat): 13 24 11 34 13 24 11

4) Encrypt (digit-wise add without carry):  
42+13=55, 12+24=36, 43+11=54, 11+34=45, 24+13=37, 21+24=45, 12+11=23  
Cipher: 55 36 54 45 37 45 23

5) Decrypt: subtract running key and map numbers back to letters in the same square.

## Solving Nihilist (Contest Strategy)
1) If both keys (Polybius and cipher key) are unknown
- Look for likely shapes in the numeric ciphertext (pairs 11..55).  
- Hypothesize common Polybius squares (e.g., general keyword from context) and test cribs.  
- If a Polybius square is given/obvious, focus on the cipher key via cribbing numbers.

2) If Polybius square is given (or inferred)
- Convert numbers to candidate letters by subtracting a hypothesized running key.  
- Try short cipher keys first (repeat lengths 3–8).  
- Use language cribs (common words) to refine the key pairs.

3) Use consistency and reversibility
- Every (plain, key) pair maps to a unique cipher pair by digit-wise add; the reverse must hold across the entire text.  
- A single contradiction eliminates that key guess.

## Advanced Notes and Variants
- Digit-wise addition without carry (per-digit mod 10) is typical in contests; pure decimal addition variants also exist historically.  
- Polybius alphabets: Some merge C/K or remove Q; always follow instructions.  
- Output formatting varies (with/without spaces).  
- Multi-key variants exist (running key from a longer phrase), but standard Codebusters uses a single cipher keyword.

## Common Pitfalls
- Not merging I/J consistently in the square and plaintext.  
- Mixing row/column order (always row then column).  
- Misapplying addition/subtraction (per-digit mod 10 vs decimal).  
- Forgetting to repeat the cipher key numbers to match length exactly.  
- Trying to map numbers outside 11..55 (check your square/rules).

## Quick Reference
- Build 5×5 Polybius with key; I/J combined.  
- Plain → Polybius numbers; Key → Polybius numbers.  
- Running key: repeat key numbers to match length.  
- Encrypt: digit-wise add without carry; Decrypt: digit-wise subtract.  
- Map via the same square for both directions.

## Practice Exercises
1) With Polybius key “SECURITY” and cipher key “CASH”, encrypt “SECRETO”.  
2) Given ciphertext pairs “24 36 24 49 25 46 55” and the same keys, decrypt to plaintext letters.  
3) Construct your own Polybius square with key “PALABRA” and encode “MENSAJE”.  
4) Try both addition rules (digit-wise vs decimal) on a short example and explain the difference.

## Pseudocode (Reference)
```text
alphabet = "ABCDEFGHIKLMNOPQRSTUVWXYZ" // I/J combined

function buildPolybius(key):
  used = set()
  grid = [] // 5x5
  // add key letters
  for ch in key:
    ch = normalizeIJ(ch)
    if ch in alphabet and ch not in used:
      append ch to grid
      used.add(ch)
  // fill remaining
  for ch in alphabet:
    if ch not in used:
      append ch to grid
  return grid (row-major 25 entries)

function letterToCoords(ch, grid):
  ch = normalizeIJ(ch)
  idx = indexOf(grid, ch)
  row = floor(idx / 5) + 1
  col = (idx % 5) + 1
  return (row, col) // as digits 1..5

function wordToPairs(word, grid):
  pairs = []
  for ch in word:
    if 'A'<=ch<='Z':
      (r,c) = letterToCoords(ch, grid)
      pairs.append(10*r + c) // e.g., 11..55
  return pairs

function repeatPairs(pairs, length):
  out = []
  for i in 0..length-1:
    out.append(pairs[i % len(pairs)])
  return out

// per-digit add without carry
function addPairs(a, b):
  ar = floor(a/10), ac = a%10
  br = floor(b/10), bc = b%10
  return 10*((ar+br)%10) + ((ac+bc)%10)

function subPairs(a, b):
  ar = floor(a/10), ac = a%10
  br = floor(b/10), bc = b%10
  rr = (ar - br + 10) % 10
  rc = (ac - bc + 10) % 10
  return 10*rr + rc

function encryptNihilist(plain, polyKey, cipherKey):
  grid = buildPolybius(polyKey)
  P = wordToPairs(normalize(plain), grid)
  K = wordToPairs(cipherKey, grid)
  R = repeatPairs(K, len(P))
  C = []
  for i in 0..len(P)-1:
    C.append(addPairs(P[i], R[i]))
  return C

function decryptNihilist(cipherPairs, polyKey, cipherKey):
  grid = buildPolybius(polyKey)
  K = wordToPairs(cipherKey, grid)
  R = repeatPairs(K, len(cipherPairs))
  P = []
  for i in 0..len(cipherPairs)-1:
    P.append(subPairs(cipherPairs[i], R[i]))
  // map back to letters
  out = ""
  for v in P:
    row = floor(v/10)-1; col = (v%10)-1
    out += grid[5*row + col]
  return out
```

## Further Reading
- Polybius squares and classical digraphic ciphers.  
- Historical Nihilist ciphers and variants (Substitution vs. Straddling Checkerboard).  
- Codebusters event docs; confirm addition/subtraction rules and alphabet conventions.

