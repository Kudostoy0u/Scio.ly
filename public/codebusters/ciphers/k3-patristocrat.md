# K3 Patristocrat (Both Alphabets Keyed, No Spaces)

## Explanation
K3 Patristocrat uses two keyed alphabets—keyed PLAINTEXT (top row) and keyed CIPHERTEXT (bottom row)—exactly like K3 Aristocrat, but the ciphertext is continuous letters without spaces/punctuation (often grouped visually). Solving requires reconstructing both rows (or one then the other) and inferring word boundaries from language.

- Top: keyed plain alphabet (keyword deduped, then remaining A–Z).  
- Bottom: keyed cipher alphabet (often same keyword; follow problem statement).  
- Mapping: P at index i in top → C = bottom[i].

## Row Construction (K3)
Example keyword SCIENCE (for both rows):
Top (plain):
```
S C I E N A B D F G H J K L M O P Q R T U V W X Y Z
```
Bottom (cipher):
```
S C I E N A B D F G H J K L M O P Q R T U V W X Y Z
```
(Real puzzles may differ; rows need not be identical.)

## How Encryption/Decryption Works (K3)
- Encrypt: P index in top → output bottom[index].  
- Decrypt: C index in bottom → output top[index].  
- For Patristocrat, remove spaces/punct and group visually; segmentation is linguistic.

## Solving Method (Patristocrat specifics)
1) Column alignment table (26 columns)
- Build a 26-column index table. As you infer P↔C pairs, place P on the top row and C on the bottom row of the same column.  
- Over time, the top row shows a keyword prefix; the bottom row likewise.  
- Extract the keyword(s) and verify by partial re-encryption.

2) Segmentation
- Use common sequences (-ING, -ED, THE, AND) to suggest word breaks; confirm with mapping consistency.

3) Iterate
- If one row stalls, fill the other; any new P↔C fixes a column.

## Worked Mini Example
Given several pairs from an unspaced cipher, fill columns to reveal top starts with SCIEN…, bottom with CESNI…; infer SCIENCE as a candidate keyword and verify.

## Common Pitfalls
- Treating groupings as word divisions.  
- Enforcing identical rows when the puzzle states two different keywords.  
- Allowing duplicate letters in a single row (violates permutation).

## Quick Reference
- K3: both rows keyed; ciphertext unspaced.  
- Reconstruct columns and read keywords from row starts.  
- Decrypt: bottom index → top letter.

## Practice
- Reconstruct both rows from 15 P↔C pairs; identify keyword(s).  
- Segment the final plaintext by language.

## Pseudocode
```text
buildKeyedAlphabet(keyword) // for top and/or bottom
// decrypt: idx = indexOf(C in bottom); P = top[idx]
```
