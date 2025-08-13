# K1 Patristocrat (Keyed Plain Alphabet, No Spaces)

## Explanation
K1 Patristocrat uses a keyed PLAINTEXT alphabet (top row) with the CIPHERTEXT alphabet as normal A–Z (bottom row), just like K1 Aristocrat—but spaces and punctuation are removed in the ciphertext and often grouped in blocks (e.g., 5s). That makes identifying words and boundaries harder.

- Top row: keyed plain alphabet built from a keyword (duplicate-free), followed by unused letters A–Z.
- Bottom row: standard A–Z.
- Mapping: find P in top row at index i → output bottom[i].
- Ciphertext typically has no spaces/punctuation; grouping is cosmetic.

## Alphabet Construction (K1)
Build keyed plain alphabet from keyword (dedupe, then append unused letters A–Z).

Example keyword: SCIENCE → deduped SCIEN; then ABDFGHJKLMOPQRTUVWXYZ
Top (plain):
```
S C I E N A B D F G H J K L M O P Q R T U V W X Y Z
```
Bottom (cipher, normal):
```
A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
```

## How Encryption/Decryption Works (K1)
- Encrypt: P at index i in top → C = bottom[i]; remove spaces/punct; group in blocks.
- Decrypt: C at index i in bottom → P = top[i]; segmentation must be inferred.

## Solving Method (Patristocrat specifics)
1) Mapping table
- Build P↔C consistency map. Since there are no spaces, rely more on digrams/trigrams, double letters, and suffixes (-ING, -ED, -ER, -LY).

2) Reconstruct the top row
- Place bottom row A–Z; above each cipher letter C place its mapped plain letter P as discovered.  
- The top row should emerge as keyword prefix followed by remaining letters.  
- Extract the keyword from the start of the top row (deduped); test dictionary candidates.

3) Segment as you go
- Insert provisional spaces where common words likely occur; refine using consistency and readability.

## Worked Mini Example
Using top/bottom rows above, decrypt a run like `ETTXEFEXTTPX...` by mapping C→P using the top row; words emerge as segmentation is refined.

## Common Pitfalls
- Treating 5-letter blocks as word boundaries.  
- Forcing a keyword that doesn’t match the reconstructed top row.  
- Ignoring one-to-one mapping.

## Quick Reference
- K1: keyed plain (top), cipher A–Z (bottom).  
- Ciphertext has no spaces; grouping is cosmetic.  
- Reconstruct top row above A–Z; keyword is the initial segment.

## Practice
- Reconstruct a K1 top row from a 5-grouped ciphertext when 10 letter pairs are known.  
- Infer likely keyword from the visible prefix; verify via re-encryption.

## Pseudocode
```text
buildK1PlainAlphabet(keyword)
// decrypt: for C at index i in A–Z → P = top[i]
// patristocrat: remove grouping; segmentation inferred
```
