# K2 Aristocrat (Keyed Cipher Alphabet)

## What it is
K2 Aristocrat is a monoalphabetic substitution where the CIPHERTEXT alphabet is keyed by a keyword and the PLAINTEXT alphabet is the normal A–Z. Spaces/punctuation are preserved. Decrypt by finding the ciphertext letter’s index in the keyed cipher alphabet (bottom row) and taking the letter at that index from A–Z (top row).

## Alphabet Construction (K2)
Given a keyword, build the keyed CIPHER alphabet:
1) Write the keyword in order, removing duplicate letters as they appear.  
2) Append remaining letters A–Z that were not used, in normal alphabetical order.

Example: keyword = SCIENCE → dedup SCIEN; remaining ABDFGHJKLMOPQRTUVWXYZ

Plain Alphabet (top, normal):
```
A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
```
Keyed Cipher Alphabet (bottom):
```
S C I E N A B D F G H J K L M O P Q R T U V W X Y Z
```

## How decryption works (K2)
1) Reconstruct/assume the keyed cipher alphabet (bottom row).  
2) For ciphertext C, find index i in the bottom row.  
3) Output A–Z[i].

## Solving method (step-by-step)
1) Pattern mapping: single-letter words A/I; THE/AND/OF/TO/IN; apostrophes; suffixes; doubles.  
2) Reconstruct bottom row: place A–Z on top; under each plain letter, place its observed cipher letter to build the bottom row.  
3) Extract keyword: read bottom row from start until the A–Z tail begins; that prefix is the deduped keyword.  
4) Finish and verify: decrypt full text; re-encrypt to confirm.

## Worked example (decryption and keyword recovery)
Ciphertext:
```
ZSLI AFWQGHK? CK C ZSGI TWQGHK, C'O EDS JIJW.
```
Target plaintext:
```
Know thyself? If I knew myself, I'd run away. — Johann Wolfgang von Goethe
```

Step 1: Build mapping from aligned plaintext/ciphertext
- Partial bottom row (indexed by A..Z on the top; · unknown):
```
idx:  A  B  C  D  E  F  G  H  I  J  K  L  M  N  O  P  Q  R  S  T  U  V  W  X  Y  Z
bot:  J  ·  ·  O  G  K  ·  F  C  ·  Z  H  T  S  L  ·  ·  E  Q  A  D  ·  I  ·  W  ·
```

Step 2: Complete bottom row with keyword-first then A–Z tail
One valid completion:
```
JNPOGKRFCUZHTSLVYEQADBIMWX
```

Step 3: Read a valid keyword
A compatible deduped keyword (one of many producing the same row):
```
JNPOGKRFCUZHTSLVYEQAD
```

Step 4: Decrypt using the completed bottom row
```
KNOW THYSELF? IF I KNEW MYSELF, I'D RUN AWAY.
```

## Advanced tips (K2)
- Bottom-row keyword visibly starts the cipher alphabet.  
- If two candidates fit, test by partial re-encryption.  
- Even partial rows often unlock many words.

## Common mistakes
- Confusing K2 with K1 or K3.  
- Duplicating letters in bottom row columns.  
- Forgetting that the bottom row ends with unused letters A–Z in order.

## Quick reference
- K2: plain A–Z (top), cipher keyed (bottom).  
- Decrypt: index in bottom row → take top[i].

## Practice (decryption only)
1) From partial pairs P↔C, place cipher letters in the bottom row under A..Z and complete the row.  
2) Read a deduped keyword from the completed row and decrypt a sentence.  
3) Use patterns (THE/AND/OF/TO) to seed mappings and finish the row.

### Answers
1) Completed rows vary; validate as a permutation with a keyword prefix and A–Z tail.  
2) Keyword is the bottom-row prefix; decryption is by index lookup into A–Z.  
3) Reconstructed rows should re-encrypt the plaintext consistently.

## Further Reading
- Codebusters keyed alphabet guides (K1–K3).  
- Keyword monoalphabetic ciphers in classical cryptography.
