# K3 Aristocrat (Both Alphabets Keyed)

## What it is
K3 Aristocrat is a monoalphabetic substitution where BOTH the PLAINTEXT alphabet and the CIPHERTEXT alphabet are keyed (often with the same keyword). Spaces and punctuation are preserved. Decrypt by locating the ciphertext letter’s index in the keyed cipher row (bottom) and taking the letter at that index from the keyed plain row (top).

## Alphabet construction (K3)
Given a keyword (or two):
1) Keyed Plain Alphabet (top): dedup keyword then append unused letters A–Z.  
2) Keyed Cipher Alphabet (bottom): same process (same or second keyword per instructions).

## How decryption works (K3)
1) Reconstruct/assume both keyed rows.  
2) For each ciphertext letter C, find index i in the bottom row; output top[i].  
3) Keep spaces/punctuation.

## Solving method (step-by-step)
1) Mapping: collect P↔C from word patterns (A/I, THE/AND/OF/TO, apostrophes, suffixes, doubles). Enforce one-to-one mapping.  
2) Index alignment: make 26 columns (indices 0..25). For each confirmed P↔C, place P in top and C in bottom for that column.  
3) Keyword inference: each row begins with a deduped keyword followed by the unused A–Z tail. Use the visible prefix to propose dictionary words and verify by partial re-encryption.  
4) Finish and verify: complete both rows; decrypt fully; confirm by re-encrypting.

## Worked example (full decryption)
Ciphertext:
```
AFOMDBA BQNCAVR.
```
Target plaintext:
```
EDUCATE THYSELF. (Lailah Gifty Akita)
```

1) Collect pairs (P→C) by alignment (ignoring spaces/punct):
```
E→A, D→F, U→O, C→M, A→D, T→B, H→Q, Y→N, S→C, L→V, F→R
```
2) Reconstruct rows by columns; complete each row with deduped keyword prefix + A–Z tail. One valid pair of row keywords:
```
Top (plain):   EDUCATEH YSLF
Bottom (cipher): AFOMDBA BQNCVR
```
3) Decrypt by index in bottom → letter at same index in top:
```
EDUCATE THYSELF.
```

## Advanced tips (K3)
- If one row stalls, fill the other; any confirmed pair fixes a column in both.  
- Many contests use the same keyword for both rows; check instructions.  
- Identity-looking starts can be traps; confirm across many columns.

## Common mistakes
- Treating bottom as A–Z (K1) or top as A–Z (K2).  
- Forcing keywords that break the permutation rule (no duplicates per row).  
- Missing the A–Z tail after the keyword prefix.

## Quick reference
- K3: both rows keyed.  
- Decrypt: index in keyed cipher row → take keyed plain row letter.  
- Reconstruct 26 columns; keyword appears as a row prefix.

## Practice (decryption only)
1) From partial P↔C pairs, fill columns and decide whether one or two keywords are used.  
2) Complete both rows and decrypt a sentence.  
3) Verify by re-encrypting with recovered rows.

### Answers
1) If both row prefixes share the same deduped keyword, it’s single-key; otherwise dual-key.  
2) Completed rows produce fluent English and re-encrypt consistently.  
3) Round-trip check should yield the original ciphertext.

## Further Reading
- Codebusters K1–K3 references and examples.  
- Classical keyword ciphers and permutation alphabets.
