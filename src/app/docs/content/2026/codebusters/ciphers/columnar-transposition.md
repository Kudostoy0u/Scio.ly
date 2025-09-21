# Complete Columnar

## What it is
- A transposition cipher: letters keep their identities; only their positions are permuted. You write plaintext row-wise under a keyword and then read columns out in the alphabetical order of the keyword’s letters (ties left-to-right).
- Two common variants: padded (fill last row) and irregular (no padding). Irregular means rightmost columns may be shorter by one.
- Hand rule (decrypt with known key): compute column heights, slice the ciphertext into columns by sorted-key order, place slices back into their original column positions, then read rows.

## Key facts you need
- Column order is determined by sorting keyword letters A–Z, breaking ties left-to-right.
- Irregular column heights: with N letters and key length L, rows R=ceil(N/L) and remainder r=N mod L. In sorted order, first r columns have height R, the rest have height R−1.
- Padded columns: all columns have height R.

## Decryption (known keyword)
1) Normalize letters (A–Z), note N, key length L, compute R and r.  
2) Determine sorted order of columns from the keyword; compute each column’s height (irregular vs padded).  
3) Slice ciphertext into L chunks by heights in sorted-key order.  
4) Place each chunk back into its original column position (unsorted).  
5) Read rows left-to-right to get plaintext; restore spaces/punctuation.

## Worked example A (irregular)
Ciphertext: `URSLEEBBIER`  
Keyword: `PEAR` (L=4)

1) N=11 → R=ceil(11/4)=3, r=11 mod 4=3 → in sorted order, first 3 columns have height 3, last has height 2.  
2) Sorted-key order for PEAR is A(3), E(2), P(1), R(4) → order indices [3,2,1,4].  
3) Heights by sorted order: [3,3,3,2]. Slice ciphertext accordingly: `URS` | `LEE` | `BBI` | `ER`.  
4) Place into original positions (P=1,E=2,A=3,R=4):  
- Col A (pos 3): `URS`  
- Col E (pos 2): `LEE`  
- Col P (pos 1): `BBI`  
- Col R (pos 4): `ER`   
5) Read rows by position 1..4:  
```
Row1: B  L  U  E
Row2: B  E  R  R
Row3: I  E  S  -
```
Plaintext: `BLUEBERRIES`

## Worked example B (irregular, unknown key length but small)
Ciphertext: `HWEOLRLLD`

Try L=2 and L=5 as hints.
- L=5 → R=ceil(9/5)=2, r=4 → in sorted order, heights [2,2,2,2,1]. Split into 5 chunks accordingly, then test permutations (5!=120) to reconstruct rows; `HELLO WORLD` emerges after reinserting a space.

## Solving without the key (strategy)
1) Guess key length L (try 4–8). For each L, compute R and r, derive sorted-order heights, slice ciphertext into L chunks.  
2) Anagram columns: permute the L chunks back into positional order (1..L) and score the row-wise reading for English (bigrams/trigrams, dictionary hits, word shapes). Use greedy/beam search.  
3) If the best permutation yields only partial English, try neighboring L values or re-check irregular vs padded assumption.  
4) Cribs: if you suspect specific words, test their placements across row boundaries; this constrains which columns can be adjacent.

## Common mistakes
- Miscomputing irregular heights (r columns should be taller by 1).  
- Mishandling repeated letters in the keyword (ties must be left-to-right).  
- Assuming padding when the source used irregular (or vice versa).  
- Over-relying on letter frequency; transposition preserves frequency, not structure.

## Quick reference
- Column heights (irregular): first r (in sorted order) have R, others R−1.  
- Place slices according to the sorted order mapping back to original positions.  
- Read rows left-to-right for plaintext.

## Practice
1) Decrypt (irregular): `URSLEEBBIER` with key `PEAR`.  
2) Blind solve: `HWEOLRLLD` with a likely key length of 2 or 5.

### Answers
1) `BLUEBERRIES`  
2) `HELLO WORLD` (after spacing)

