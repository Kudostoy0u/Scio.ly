# Nihilist Cipher

## Explanation
The Nihilist cipher (aka Nihilist substitution) represents letters as Polybius-square coordinates, converts a cipher keyword to numbers using the same square, creates a running key by repeating those keyword numbers, and then combines numbers. For solving, we only need the reverse: subtract the running-key numbers from the ciphertext numbers and translate results back to letters via the same Polybius square.

In Codebusters, the standard approach uses a 5×5 Polybius square (25-letter alphabet) with I/J combined (or similar instruction). Always follow the event instructions for alphabet and formatting. Spaces/punctuation are usually removed before conversion.

Key components
- Polybius key (keyword to build a 5×5 square).  
- Cipher key (another keyword converted to numbers via the same square).  
- Running key (repeat cipher key numbers to match plaintext-length in numbers).  
- Numeric combination (add for encryption, subtract for decryption).  

## Algorithm Overview
1) Build 5×5 Polybius square with a Polybius key (I/J combined).  
2) Convert cipher keyword letters to Polybius numbers (using the same square).  
3) Create a running key by repeating the cipher key numbers to match the ciphertext length (in pairs).  
4) Decrypt: subtract the running-key pairs from the ciphertext pairs (per contest rule; typically per-digit mod 10 or decimal subtraction — follow event instructions).  
5) Map resulting pairs back to letters via the Polybius square.

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

## Combining/Subtracting Numbers (contest rule)
Most Codebusters uses digit-wise, per-digit arithmetic without carry (i.e., mod 10 per digit). Some sources use true decimal addition/subtraction. Your event will specify which to apply. The decryption procedure is the same idea: subtract the repeated key pairs from the ciphertext pairs using the chosen rule, then map the results through the Polybius square.

## Formatting and Output
- Numbers typically printed as two digits per letter (e.g., 24 36 24 …).  
- Grouping (e.g., 10 pairs per line) is for readability only.  
- Plaintext spacing/punctuation often removed before encoding; follow problem instructions.

## Worked Example (Decryption, end-to-end)
Polybius key: VERTICAL  
Cipher key: CELO  
Ciphertext (pairs):
```
72 34 65 64 35 27 54 98 76 55 75 56 72 24 46 74 43 54 48 98 64 64 76 58 44 35 74 65 63 33 37 58 52 67 74 86 42 27 35 57 76
```

1) Build the 5×5 Polybius square with key “VERTICAL” (I/J combined), filling row-wise with deduplicated key letters then the remaining alphabet:
```
Row\Col  1  2  3  4  5
1        V  E  R  T  I
2        C  A  L  B  D
3        F  G  H  K  M
4        N  O  P  Q  S
5        U  W  X  Y  Z
```

2) Convert cipher key “CELO” to numbers using the same square:
```
C→21, E→12, L→23, O→42  →  running key pattern: 21 12 23 42 (repeat)
```

3) Repeat the running key numbers to the ciphertext length.

4) Subtract running-key pairs from ciphertext pairs using your contest’s subtraction rule (digit-wise without carry is common; some contests use decimal subtraction). The resulting pairs map back through the square to letters.

Resulting plaintext:
```
SANCTIFY YOURSELF AND YOU WILL SANCTIFY SOCIETY

(FRANCIS OF ASSISI)
```
Restore standard capitalization and punctuation as needed:
“Sanctify yourself and you will sanctify society.” — Francis of Assisi

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
- Key → Polybius numbers (same square).  
- Running key: repeat key numbers to match length.  
- Decrypt: subtract running key from ciphertext pairs (follow contest rule).  
- Map via the same square to letters.

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
  grid = [] // 5x5 row-major
  for ch in key:
    ch = normalizeIJ(ch)
    if ch in alphabet and ch not in used:
      append ch to grid; used.add(ch)
  for ch in alphabet:
    if ch not in used: append ch to grid
  return grid // 25 letters

function letterToPairs(word, grid): // for building key numbers
  pairs = []
  for ch in word:
    if 'A'<=ch<='Z':
      idx = indexOf(grid, normalizeIJ(ch))
      r = floor(idx/5)+1; c = (idx%5)+1
      pairs.append(10*r + c)
  return pairs

function repeatPairs(pairs, L):
  out = []
  for i in 0..L-1: out.append(pairs[i % len(pairs)])
  return out

// Choose subtraction rule per contest
function subDigitwise(a,b):
  ar=floor(a/10); ac=a%10
  br=floor(b/10); bc=b%10
  return 10*((ar-br+10)%10) + ((ac-bc+10)%10)

function decryptNihilist(cipherPairs, polyKey, cipherKey, mode="digit"):
  grid = buildPolybius(polyKey)
  K = letterToPairs(cipherKey, grid)
  R = repeatPairs(K, len(cipherPairs))
  P = []
  for i in 0..len(cipherPairs)-1:
    if mode=="digit": v = subDigitwise(cipherPairs[i], R[i])
    else: v = (cipherPairs[i] - R[i] + 100) % 100  // decimal variant
    P.append(v)
  // map back
  out = ""
  for v in P:
    r = floor(v/10)-1; c=(v%10)-1
    out += grid[5*r + c]
  return out
```

## Further Reading
- Polybius squares and classical digraphic ciphers.  
- Historical Nihilist ciphers and variants (Substitution vs. Straddling Checkerboard).  
- Codebusters event docs; confirm addition/subtraction rules and alphabet conventions.

