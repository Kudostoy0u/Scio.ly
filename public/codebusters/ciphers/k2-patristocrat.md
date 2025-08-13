# K2 Patristocrat (Keyed Cipher Alphabet, No Spaces)

## Explanation
K2 Patristocrat uses a keyed CIPHERTEXT alphabet (bottom row) with the PLAINTEXT alphabet as normal A–Z (top row), just like K2 Aristocrat—but the ciphertext has no spaces/punctuation and is often grouped into 5-letter chunks. Word boundaries must be inferred.

- Top row: A–Z (plain).  
- Bottom row: keyed cipher alphabet from a keyword (dedupe then append remaining A–Z).  
- Mapping: find P at index i in top → output bottom[i].

## Alphabet Construction (K2)
Given keyword SCIENCE → deduped SCIEN + remaining ABDFGHJKLMOPQRTUVWXYZ
Top (plain):
```
A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
```
Bottom (cipher):
```
S C I E N A B D F G H J K L M O P Q R T U V W X Y Z
```

## How Encryption/Decryption Works (K2)
- Encrypt: index of P in A–Z gives position; output bottom[position]; remove spaces/punct; group visually.
- Decrypt: index of C in bottom gives position; output top[position]. Segmentation must be inferred.

## Solving Method (Patristocrat specifics)
1) Reconstruct bottom row
- Build a P↔C mapping gradually.  
- Place A–Z on top; under each letter, fill cipher letter C when known.  
- The bottom row reveals a deduped keyword prefix followed by unused letters; extract the keyword.

2) Segmentation and patterns
- Use digrams/trigrams, double letters, and suffixes (-ING, -ED) to place spaces.  
- Validate hypotheses by global consistency.

## Worked Mini Example
Decrypt a continuous run like `KNNT...` by mapping K,N,N,T through bottom-row positions back to A–Z; insert spaces when common words form.

## Common Pitfalls
- Mis-reading 5-letter blocks as words.  
- Forcing a bottom row that breaks alphabetical continuation after keyword.

## Quick Reference
- K2: top=A–Z, bottom=keyed(keyword).  
- Ciphertext unspaced; groupings are cosmetic.  
- Reconstruct bottom row; read keyword from its start.

## Practice
- From 12 letter pairs, complete the keyed bottom row and recover the keyword.  
- Segment the decrypted run into words.

## Pseudocode
```text
buildK2CipherAlphabet(keyword)
// decrypt: for C with index i in bottom → P = (A–Z)[i]
```
