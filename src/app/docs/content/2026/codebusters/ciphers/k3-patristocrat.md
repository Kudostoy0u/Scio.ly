# K3 Patristocrat (Both Alphabets Keyed, No Spaces)

## What it is
K3 Patristocrat is a monoalphabetic substitution where both the PLAINTEXT alphabet (top row) and the CIPHERTEXT alphabet (bottom row) are keyed (often the same keyword). The ciphertext is unspaced and often grouped visually. You reconstruct one or both keyed rows and infer word boundaries from language.

- Top: keyed plain alphabet (dedup keyword, then unused A–Z).  
- Bottom: keyed cipher alphabet (same or second keyword).  
- Decrypt: for C, index i in bottom → output top[i].

## Row construction (K3)
Example keyword SCIENCE (for both rows):
Top (plain):
```
S C I E N A B D F G H J K L M O P Q R T U V W X Y Z
```
Bottom (cipher):
```
S C I E N A B D F G H J K L M O P Q R T U V W X Y Z
```
(Real puzzles may use two different keywords and non-identical rows.)

## How decryption works (no spaces)
1) Build or recover both keyed rows.  
2) For each C, index i in bottom → output top[i].  
3) Insert spaces by language; visual grouping is cosmetic.

## Solving method (Patristocrat specifics)
1) 26-column table: for each confirmed P↔C, place P (top) and C (bottom) in the same column.  
2) Keywords: each row shows a deduped keyword prefix followed by A–Z tail. Read the prefix(es); verify by partial re-encryption.  
3) Segmentation: use common sequences (THE/AND/ING/ED) for provisional spacing; require global consistency.

## Worked mini example
With several P↔C pairs from an unspaced cipher, columns reveal top starts with SCIEN…, bottom with CESNI…; test SCIENCE as a keyword and verify by re-encryption.

## Common pitfalls
- Treating groupings as word boundaries.  
- Assuming identical rows when the puzzle specifies two different keywords.  
- Allowing duplicates in a keyed row (violates permutation).

## Quick reference
- K3: both rows keyed; ciphertext unspaced.  
- Decrypt: index(C in keyed bottom) → top[i].  
- Read keywords from the starts of the reconstructed rows.

## Practice
1) From 15 P↔C pairs, complete both rows and identify the keyword(s).  
2) Decrypt a grouped run and segment into words.

### Answers
1) Completed rows must be permutations with keyword prefix(es) followed by A–Z tail(s); re-encryption should match original.  
2) Segmentation aligns with language patterns and remains consistent with the final mapping.
