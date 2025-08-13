# K2 Aristocrat (Keyed Cipher Alphabet)

## Explanation
K2 Aristocrat is a monoalphabetic substitution cipher where the CIPHERTEXT alphabet is keyed by a keyword and the PLAINTEXT alphabet remains the normal A–Z. Spaces and punctuation are preserved. The same mapping applies throughout the text.

Conceptually: index letters against two rows. The top row is the standard plaintext alphabet (A–Z). The bottom row is the keyed cipher alphabet. To decrypt, take ciphertext letter C, find its index in the bottom row, and output the letter at that index in the top row.

Why this matters
- Knowing it’s K2 tells you the plain alphabet is the normal A–Z, while the cipher alphabet is the keyed variant.  
- Reconstructing the two-row mapping from a solved section lets you read off the keyed cipher alphabet and infer the keyword.

## Alphabet Construction (K2)
Given a keyword, build the keyed CIPHER alphabet:
1) Write the keyword in order, removing duplicate letters as they appear.  
2) Append the remaining letters A–Z that were not used, in normal alphabetical order.

Example: keyword = SCIENCE
- Remove duplicates → SCIEN  
- Remaining letters (A–Z without S,C,I,E,N): ABDFGHJKLMOPQRTUVWXYZ

Plain Alphabet (top, normal):
```
A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
```
Keyed Cipher Alphabet (bottom):
```
S C I E N A B D F G H J K L M O P Q R T U V W X Y Z
```

One-row pairing (P↔C for a few letters):
```
A→S, B→C, C→I, D→E, E→N, F→A, G→B, H→D, I→F, J→G, K→H, L→J, M→K, N→L, O→M, P→O, Q→P, R→Q, S→R, T→T, U→U, V→V, W→W, X→X, Y→Y, Z→Z
```

Notes
- Some letters may map to themselves (e.g., T→T) depending on the keyword.  
- Mapping is a permutation; each plain letter maps to a unique cipher letter.

## How Decryption Works (K2 only)
1) Reconstruct or assume the keyed cipher alphabet (bottom row).  
2) For each ciphertext letter C, find index i in the bottom row.  
3) Output A–Z[i].  
4) Preserve spaces/punctuation.

## Solving Method (Step-by-Step)
Approach overview: Deduce letter mappings from patterns, reconstruct the keyed cipher row (bottom row), and read off the keyword from its beginning.

1) Pattern-based mapping
- Single-letter words A/I; THE/AND/OF/TO/IN; apostrophes and suffixes.  
- Build consistent mapping pairs P↔C without conflicts.

2) Reconstruct bottom row (keyed cipher alphabet)
- Place the normal A–Z on the top row. For each known mapping A→C, put C in the bottom row under A, etc.  
- As letters fill in, the bottom row reveals a deduplicated keyword prefix followed by unused letters in alphabetical order.

3) Extract the keyword
- Read the bottom row from the start; the initial segment up to where alphabetical order resumes is the keyword (deduped).  
- Propose dictionary words matching that segment; verify by encrypting some plaintext positions and checking consistency.

4) Complete and verify
- Finish the mapping and decrypt the text.  
- Re-encrypt the plaintext with your recovered keyword to confirm.

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
- Remove punctuation for alignment checks (keep for final output). Map A–Z positions to observed cipher letters.
- Partial bottom row (indexed by A..Z on the top row; unknown = ·):
```
idx:  A  B  C  D  E  F  G  H  I  J  K  L  M  N  O  P  Q  R  S  T  U  V  W  X  Y  Z
bot:  J  ·  ·  O  G  K  ·  F  C  ·  Z  H  T  S  L  ·  ·  E  Q  A  D  ·  I  ·  W  ·
```

Step 2: Complete the bottom row as a keyword-first, then A–Z tail
- Fill the remaining letters so that the bottom row is a deduplicated keyword prefix followed by unused letters in alphabetical order. One valid completion consistent with all observed pairs is:
```
JNPOGKRFCUZHTSLVYEQADBIMWX
```

Step 3: Read a valid keyword
- The deduplicated keyword is the initial segment of the bottom row up to where the alphabetical tail begins. A compatible recovered keyword (one of many that generate the same row) is:
```
JNPOGKRFCUZHTSLVYEQAD
```

Step 4: Decrypt using the completed bottom row
- For each ciphertext letter, find its index in the bottom row and output the A..Z letter at that index. This yields:
```
KNOW THYSELF? IF I KNEW MYSELF, I'D RUN AWAY.
```
Add attribution to match the full quote.

## Advanced Tips (K2-specific)
- Bottom-row keyword: In K2, the keyword is literally visible at the start of the cipher alphabet row as you reconstruct it.  
- Ambiguity handling: If two plausible keywords share the same deduped prefix, test both by partial re-encryption.  
- Mixed strategies: Even with partial bottom row, many words become readable; iterate.

## Common Mistakes
- Confusing K2 with K1 (keyed plain) or K3 (both keyed).  
- Forcing mappings that produce duplicate letters in the bottom row for the same column.  
- Ignoring that the bottom row must finish with the unused letters of the alphabet in order.

## Quick Reference
- K2: Plain = A–Z, Cipher = keyed(keyword).  
- Encrypt: P at index i in A–Z → C = keyedCipher[i].  
- Decrypt: C at index i in keyedCipher → P = A–Z[i].  
- Reconstruct bottom row and read keyword prefix.

## Practice Exercises (Decryption Only)
1) From partial pairs P↔C, place cipher letters on the bottom row under A..Z and complete the row.  
2) Read a deduplicated keyword from the completed row and decrypt a sentence.  
3) Use word patterns (THE/AND/OF/TO) to seed mappings and finish the row.

## Pseudocode (Reference)
```text
alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

function buildK2CipherAlphabet(keyword):
  key = []
  seen = {}
  for ch in keyword:
    if ch not in seen and 'A'<=ch<='Z':
      key.append(ch); seen[ch] = true
  for ch in alphabet:
    if ch not in seen: key.append(ch)
  return key.join("")

// Encrypt: for P with index i in alphabet → C = cipher[i]
// Decrypt: for C with index i in cipher   → P = alphabet[i]
```

## Further Reading
- Codebusters keyed alphabet guides (K1–K3).  
- Keyword monoalphabetic ciphers in classical cryptography.
