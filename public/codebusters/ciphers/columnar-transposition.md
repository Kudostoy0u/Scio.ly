# Complete Columnar

## Explanation
Complete Columnar is a classical transposition cipher. Instead of substituting letters, it reorders them by writing the plaintext in rows under a keyword’s columns, then reading the letters out column-by-column in the alphabetical order of the keyword’s letters.

Key ideas
- No letter substitution; letters are permuted by position.
- A keyword determines the order in which columns are read out.
- Variants differ on padding (fill with X or not), whether the last row is irregular, and how repeated letters in the keyword are ordered.
- Because it preserves letter frequencies, solving relies on structure and pattern, not frequency substitution.

Terminology
- Keyword: the word used to label columns.
- Column order: the numerical positions of columns when the keyword’s letters are sorted A–Z (ties broken left-to-right unless specified otherwise).
- Matrix: the grid formed by writing plaintext row-wise under the keyword.

## Variants and Options (Padding, Irregular Rows)
Padding vs Irregular
- Padded: append pad letters (often X) to complete the last row. This makes all columns equal height.  
- Irregular: do not pad; last row may be partially filled. Columns on the right are shorter by one when row length is not divisible by the keyword length.

Reading order is always by the alphabetical order of the keyword letters, top-to-bottom per column.

Repeated letters in keyword
- Standard tie-break: for identical letters, read left-to-right order of appearance.  
- Example keyword: LETTER → sorted order E(2), E(5), L(1), R(6), T(3), T(4) → within E’s and T’s, earlier index comes first.

## How Decryption Works (known keyword)
Given the keyword (or at least its column order), reconstruct the matrix and read rows.

1) Compute rows = ceil(plaintext_length / keyword_length).  
2) Determine column order from keyword letters (ties left-to-right).  
3) Determine each column’s height:  
   - If padded: all columns have exactly ‘rows’ letters.  
   - If irregular: columns corresponding to the leftmost ‘remainder’ positions (when length % keyLen = remainder) have one extra letter.
4) Slice the ciphertext into columns in order (smallest to largest letter) using these heights.  
5) Place each slice back into its column position.  
6) Read off plaintext row-by-row.

Irregular example (short)
Ciphertext: TAHHHAEDTML  
Keyword: GERMAN (length 6)
Length 11 → rows = 2 (since ceil(11/6)=2), remainder = 11 mod 6 = 5 → the first 5 columns (in sorted order) will have height 2, the last column height 1.  
Build column order from GERMAN: A(5), E(2), G(1), M(4), N(6), R(3) → order indices [5,2,1,4,6,3].  
Slice ciphertext by heights in that order and then place slices to original column positions; finally read rows to recover the text.

## Worked examples (decryption only)
Example 1 (irregular, known key length and order)
Plain: BLUEBERRIES  
Key: PEAR (length 4) → sorted A(3), E(2), P(1), R(4) → order under P E A R is 3 2 1 4  
Rows = ceil(11/4)=3; remainder 11 mod 4 = 3 → first 3 columns in sorted order have height 3, last has height 2.

Matrix fill (no padding):
```
    P  E  A  R
    3  2  1  4
B   L  U  E
B   E  R  R
I   E  S
```
Read columns in order A,E,P,R → (1,2,3,4):
- Col A: E R S → ERS  
- Col E: U R E → URE  
- Col P: B B I → BBI  
- Col R: (top-down) empty in row 3, then R’s column has only 2 rows: letters are (from the matrix) row1=?, row2=?, row3=?, but from matrix above R has [ (none at row1?), (none?), actually fill consistently:) ]

To avoid confusion, a clearer construction is to first compute column heights explicitly:  
- Sorted order indices: A(1), E(2), P(3), R(4) → heights: [3,3,3,2].  
- Write plaintext row-wise: BLUE / BERR / IES → columns by position:
```
Row1: B  L  U  E
Row2: B  E  R  R
Row3: I  E  S  -
```
So columns (P,E,A,R) in positional order (1..4) are:
- Col1(P): B, B, I → BBI  
- Col2(E): L, E, E → LEE  
- Col3(A): U, R, S → URS  
- Col4(R): E, R     → ER
Read in sorted key order A,E,P,R → (3,2,1,4): URS + LEE + BBI + ER → URSLEEBBIER

Ciphertext: URSLEEBBIER

Example 2 (full walkthrough, unknown key)
Ciphertext (letters only; spaces/punctuation removed or ignored):
```
FECARED WTHSVIL FOEFMAT RIIEOLF SNTHETL AOTNEIT DANLATD HTNAIGN YSSETAO AUNERRH WUDTSOO HDIFBNN GTMAEIP FHORTLH NALLIOE AEGLAUC CIADRSY TNEICOB ESDNNEF
```

Target plaintext:
```
A soft and sheltered Christianity, afraid to be lean and lone, unwilling to face the storms and brave the heights, will end up fat and foul in the cages of conformity.
```

Step 1: Normalize and estimate key length (L)
- Remove spaces and punctuation; uppercase A–Z. Length N = 133.
- Test plausible L values (e.g., 4–12). Score reconstructed rows for English. For this text, L = 7 yields strong row-level English after column anagramming.
- Rows R = ceil(N / L) = ceil(133 / 7) = 19; remainder r = 0 → full rectangle (no irregular columns).

Step 2: Compute column heights and slice the ciphertext
- With R = 19 and r = 0, each of the L = 7 columns has height 19.
- In decryption, we first slice the ciphertext into L segments according to the sorted-key order. Without the actual keyword, we do not yet know that order, so we treat the 133-letter ciphertext as seven contiguous slices of length 19, corresponding to some (unknown) sorted order of the columns.

Step 3: Anagram columns into positional order
- Goal: permute the 7 columns back to left-to-right positional order. Read across rows; choose the permutation that maximizes English (dictionary hits, bigrams like TH, HE, IN, ER, …; word boundaries across row joins).
- A simple beam search over the 7! = 5040 permutations is fast. Keep top-k partial permutations by score while adding one column at a time.

Step 4: Read across rows to recover the plaintext
- The best-scoring permutation produces fluent English from the first row onward, beginning with “ASOFTANDSHELTEREDCH…”. Continuing row-by-row reconstructs the full message.
- Reinstate spacing and punctuation (they were not transposed as letters):
```
A soft and sheltered Christianity, afraid to be lean and lone, unwilling to face the storms and brave the heights, will end up fat and foul in the cages of conformity.
```

Notes on this solve
- The absence of an irregular last row (r = 0) means all columns are equal height, simplifying slicing.
- If the keyword had repeated letters, ties for equal letters would be resolved left-to-right when determining the sorted order; this constrains the anagram.
- If your first guess of L doesn’t yield clear English, try neighboring lengths and repeat the search.

## Solving without the key (strategy)
Goal: recover the keyword length, column order, and plaintext.

1) Guess/estimate key length (L)
- Try likely lengths (e.g., 4–8).  
- Use score-based methods: for each L, partition text into L slices as if columns, attempt a re-ordering that maximizes Englishness of the reassembled rows.

2) Column height logic (irregular vs padded)
- If irregular, lengths of columns differ by at most 1. For a given text length N and key length L, compute rows R=ceil(N/L), remainder r=N mod L. In sorted order, the first r columns have height R, the rest have height R-1.

3) Anagram columns (core)
- Split ciphertext into L chunks by hypothesized heights according to sorted order.  
- Permute columns to get the original positional order (1..L).  
- Read across rows; evaluate with heuristics:
  - Vowel/consonant balance per word-like segments.  
  - Common bigrams/trigrams across row boundaries (TH, HE, IN, ER, AN, RE, …).  
  - Dictionary hits for short words (THE, AND, OF, TO, IN, IT, IS).  
- Use greedy/beam search: keep top-k permutations by score and expand.

4) Cribs (known words) and punctuation
- If you suspect a phrase (e.g., “SCIENCE”), test placements across rows; this constrains which columns can precede/follow.  
- If punctuation/spaces are preserved (variant), they give strong row-boundary hints.

5) Repeated letters in keyword
- If you recover the sorted order mapping, remember ties are left-to-right. This constraint reduces permutations.

6) Verify and refine
- Once a coherent plaintext emerges for a given L and column order, confirm the entire text reads well.  
- If only partial, try neighboring L values or alternative tie-breaks for repeated letters.

## Common Mistakes
- Ignoring irregular last row: mis-cutting columns by equal height when remainder ≠ 0.  
- Wrong tie-break with repeated keyword letters: not using left-to-right order for identical letters.  
- Assuming padding when none was used (or vice versa).  
- Not testing multiple key lengths when the first guess stalls.  
- Over-relying on letter frequency (transposition doesn’t change frequency; structure matters more).

## Quick Reference
- Write plaintext row-wise under keyword; read columns by sorted keyword order.  
- Column heights: irregular → first r columns (in sorted order) have height R; others R-1, where R=ceil(N/L), r=N mod L.  
- Repeated letters: ties resolved left-to-right.  
- Padded vs irregular changes column heights; know which applies.  
- Decrypt (known key): slice ciphertext into columns by heights, place into positions, read rows.

## Practice Exercises
1) Decrypt irregular (known key)
- Cipher: URSLEEBBIER  
- Key: PEAR  
- Task: Reconstruct rows and recover the plaintext.

2) Blind solve (unknown key length)
- Cipher: HWEOLRLLD  
- Task: Identify a plausible key length and reconstruct the plaintext (hint: try length 2 or 5).

## Pseudocode (Reference)
Decryption (known key, irregular)
```text
decrypt(cipher, keyword):
  N = len(cipher)
  L = len(keyword)
  R = ceil(N / L)
  r = N % L
  order = sortIndices(keyword) // A–Z, ties left→right
  heights = [R for first r in order] + [R-1 for rest]
  cols = slice cipher according to heights in 'order'
  table = empty matrix with L columns and R rows
  for j from 0..L-1:
    idx = order[j]
    fill column idx (top-down) with cols[j]
  read rows left→right to get plaintext
```

Helper: sortIndices(keyword)
```text
// returns permutation of [0..L-1] ordered by keyword letters A–Z; ties left→right
```

## Further Reading
- Codebusters event guides on transposition ciphers (simple vs complete columnar).  
- Classical cryptography texts (Kahn, Gaines): columnar transposition solving techniques.  
- Heuristic search for transposition: scoring by English bigrams/trigrams and wordlists.

