# Porta Cipher

## Explanation
The Porta cipher is a classical polyalphabetic substitution cipher similar to Vigenère, but with a key difference: it uses only 13 reciprocal substitution alphabets, each determined by the key letter’s pair. The 26 letters are grouped into 13 key pairs:

AB, CD, EF, GH, IJ, KL, MN, OP, QR, ST, UV, WX, YZ

Each key pair selects one of 13 fixed substitution alphabets. These alphabets are reciprocal (self-inverse), so the same table is used for both encryption and decryption. This reciprocity means that if you encrypt twice with the same key stream, you get back the original text.

High-level idea:
- The alphabet is split into two halves: A–M and N–Z.
- For a given key pair (e.g., AB), letters in A–M are mapped to letters in N–Z using a specific shift, and letters in N–Z are mapped back into A–M using a corresponding shift in the opposite direction.
- The key determines which of the 13 shifts/pairings is used at each position of the text.

Why it’s useful in Codebusters:
- It’s a standard event cipher with well-known properties and recognizable patterns.
- With a strong grasp of its table and properties, you can quickly test cribs, spot consistent mappings, and recover the key or the plaintext even without the key.


## Porta Tableau (Complete)
Below is a complete Porta tableau showing, for each key pair, how A–M map into N–Z and how N–Z map back into A–M. Think of each key pair as selecting a specific two-way mapping. Use it position-by-position along your text with the repeated keyword.

Key pair indices: we number the pairs as 0..12 in order AB (0), CD (1), EF (2), GH (3), IJ (4), KL (5), MN (6), OP (7), QR (8), ST (9), UV (10), WX (11), YZ (12).

Notation: A↔N means A maps to N and N maps to A (reciprocal pair). For clarity, we show A–M lines and N–Z lines for each pair.

### AB (k=0)
Plain A–M: A B C D E F G H I J K L M
Cipher N–Z: N O P Q R S T U V W X Y Z

Plain N–Z: N O P Q R S T U V W X Y Z  
Cipher A–M: A B C D E F G H I J K L M

Pairs: A↔N, B↔O, C↔P, D↔Q, E↔R, F↔S, G↔T, H↔U, I↔V, J↔W, K↔X, L↔Y, M↔Z

### CD (k=1)
Plain A–M: A B C D E F G H I J K L M  
Cipher N–Z: O P Q R S T U V W X Y Z N

Plain N–Z: N O P Q R S T U V W X Y Z  
Cipher A–M: M A B C D E F G H I J K L

Pairs: A↔O, B↔P, C↔Q, D↔R, E↔S, F↔T, G↔U, H↔V, I↔W, J↔X, K↔Y, L↔Z, M↔N

### EF (k=2)
Plain A–M: A B C D E F G H I J K L M  
Cipher N–Z: P Q R S T U V W X Y Z N O

Plain N–Z: N O P Q R S T U V W X Y Z  
Cipher A–M: L M A B C D E F G H I J K

Pairs: A↔P, B↔Q, C↔R, D↔S, E↔T, F↔U, G↔V, H↔W, I↔X, J↔Y, K↔Z, L↔N, M↔O

### GH (k=3)
Plain A–M: A B C D E F G H I J K L M  
Cipher N–Z: Q R S T U V W X Y Z N O P

Plain N–Z: N O P Q R S T U V W X Y Z  
Cipher A–M: K L M A B C D E F G H I J

Pairs: A↔Q, B↔R, C↔S, D↔T, E↔U, F↔V, G↔W, H↔X, I↔Y, J↔Z, K↔N, L↔O, M↔P

### IJ (k=4)
Plain A–M: A B C D E F G H I J K L M  
Cipher N–Z: R S T U V W X Y Z N O P Q

Plain N–Z: N O P Q R S T U V W X Y Z  
Cipher A–M: J K L M A B C D E F G H I

Pairs: A↔R, B↔S, C↔T, D↔U, E↔V, F↔W, G↔X, H↔Y, I↔Z, J↔N, K↔O, L↔P, M↔Q

### KL (k=5)
Plain A–M: A B C D E F G H I J K L M  
Cipher N–Z: S T U V W X Y Z N O P Q R

Plain N–Z: N O P Q R S T U V W X Y Z  
Cipher A–M: I J K L M A B C D E F G H

Pairs: A↔S, B↔T, C↔U, D↔V, E↔W, F↔X, G↔Y, H↔Z, I↔N, J↔O, K↔P, L↔Q, M↔R

### MN (k=6)
Plain A–M: A B C D E F G H I J K L M  
Cipher N–Z: T U V W X Y Z N O P Q R S

Plain N–Z: N O P Q R S T U V W X Y Z  
Cipher A–M: H I J K L M A B C D E F G

Pairs: A↔T, B↔U, C↔V, D↔W, E↔X, F↔Y, G↔Z, H↔N, I↔O, J↔P, K↔Q, L↔R, M↔S

### OP (k=7)
Plain A–M: A B C D E F G H I J K L M  
Cipher N–Z: U V W X Y Z N O P Q R S T

Plain N–Z: N O P Q R S T U V W X Y Z  
Cipher A–M: G H I J K L M A B C D E F

Pairs: A↔U, B↔V, C↔W, D↔X, E↔Y, F↔Z, G↔N, H↔O, I↔P, J↔Q, K↔R, L↔S, M↔T

### QR (k=8)
Plain A–M: A B C D E F G H I J K L M  
Cipher N–Z: V W X Y Z N O P Q R S T U

Plain N–Z: N O P Q R S T U V W X Y Z  
Cipher A–M: F G H I J K L M A B C D E

Pairs: A↔V, B↔W, C↔X, D↔Y, E↔Z, F↔N, G↔O, H↔P, I↔Q, J↔R, K↔S, L↔T, M↔U

### ST (k=9)
Plain A–M: A B C D E F G H I J K L M  
Cipher N–Z: W X Y Z N O P Q R S T U V

Plain N–Z: N O P Q R S T U V W X Y Z  
Cipher A–M: E F G H I J K L M A B C D

Pairs: A↔W, B↔X, C↔Y, D↔Z, E↔N, F↔O, G↔P, H↔Q, I↔R, J↔S, K↔T, L↔U, M↔V

### UV (k=10)
Plain A–M: A B C D E F G H I J K L M  
Cipher N–Z: X Y Z N O P Q R S T U V W

Plain N–Z: N O P Q R S T U V W X Y Z  
Cipher A–M: D E F G H I J K L M A B C

Pairs: A↔X, B↔Y, C↔Z, D↔N, E↔O, F↔P, G↔Q, H↔R, I↔S, J↔T, K↔U, L↔V, M↔W

### WX (k=11)
Plain A–M: A B C D E F G H I J K L M  
Cipher N–Z: Y Z N O P Q R S T U V W X

Plain N–Z: N O P Q R S T U V W X Y Z  
Cipher A–M: C D E F G H I J K L M A B

Pairs: A↔Y, B↔Z, C↔N, D↔O, E↔P, F↔Q, G↔R, H↔S, I↔T, J↔U, K↔V, L↔W, M↔X

### YZ (k=12)
Plain A–M: A B C D E F G H I J K L M  
Cipher N–Z: Z N O P Q R S T U V W X Y

Plain N–Z: N O P Q R S T U V W X Y Z  
Cipher A–M: B C D E F G H I J K L M A

Pairs: A↔Z, B↔N, C↔O, D↔P, E↔Q, F↔R, G↔S, H↔T, I↔U, J↔V, K↔W, L↔X, M↔Y


## How Decryption Works (Step-by-Step)
Because the cipher is reciprocal, decryption applies the same key-driven pair mapping to the ciphertext letters, producing plaintext. Think of each key letter as selecting one of the 13 A–M↔N–Z pairing tables; apply the table at each position.

Decryption steps
1) Normalize the ciphertext: use uppercase A–Z; remove or ignore punctuation/spaces for the mapping step.  
2) Prepare the keyword: remove non-letters and repeat it to the length of the letters being decrypted.  
3) For each position i: pick the key pair from the table using the current key letter; map the ciphertext letter across halves with that pair.  
4) Restore spacing and punctuation to obtain the final readable plaintext.


Quick check: If you apply the mapping twice with the same key stream, you return to the original text (reciprocal property).


## Worked Example (Full Decryption)
Keyword: BYOK  
Key pair stream (repeating by letters-only positions): B→AB, Y→YZ, O→OP, K→KL → AB, YZ, OP, KL, AB, YZ, ...

Ciphertext (grouped 5s for readability):
```
WXBVS
CSYIE
JXAYP
QOSFO
SEJZT
ZSQVP
GFFDU
EODUL
RZXFH
SUESX
JKRLO
AHSFP
SNPKR
HJQVE
IBKTM
I
```

1) Normalize and align
- Join into a single letters-only string; ignore punctuation/spaces for mapping.  
- Repeat the keyword BYOK to match the number of letters; at each letter position, select the pair: AB, YZ, OP, KL, AB, YZ, ...

2) Map using the Porta tableau
- For each position i, take ciphertext letter Ci and key pair Ki. Using the row for Ki in the tableau (above), map Ci across halves to plaintext Pi. Because the table is reciprocal, the same row is used to go from ciphertext to plaintext.
- Example of the process for the first few positions (abbreviated; use the tableau rows shown above to look up each pair):
  - i=1: key B (pair AB). Use AB row to map C1 → P1.  
  - i=2: key Y (pair YZ). Use YZ row to map C2 → P2.  
  - i=3: key O (pair OP). Use OP row to map C3 → P3.  
  - i=4: key K (pair KL). Use KL row to map C4 → P4.  
  - Continue for all letters.

3) Restore formatting
- After mapping all letters, reinsert spacing and punctuation to get readable English:
```
Whenever you feel like criticizing any one...just remember that all the people in this world haven't had the advantages that you've had.
```

Notes
- BYOK yields the repeating pair sequence AB, YZ, OP, KL. If you observe contradictions during mapping at any position, re-check alignment of the key against letters-only positions.
- Porta always maps across halves (A–M ↔ N–Z) for a fixed pair. If you ever get a same-half mapping (e.g., A→A), something is off in the lookup.


## Solving Porta Without the Key (Strategy Guide)
Porta has distinctive features you can exploit:

Pattern properties
- Reciprocal mapping: If you suspect that a ciphertext letter corresponds to a plaintext letter, the table forces a very specific counterpart in the opposite half.  
- Half-to-half mapping: Every encryption maps across halves (A–M ↔ N–Z). So plaintext vowels/consonants may shift distribution in recognizable ways depending on context.
- Limited alphabets: Only 13 alphabets exist. With enough aligned guesses (cribs), you can pin down which alphabet indices are used at positions, thus revealing the repeated keyword pattern (its period and letters’ pairs).

Crib-dragging for common words
- Try high-frequency short words: THE, AND, OF, TO, IN.  
- For each position alignment, check whether a consistent mapping exists under any of the 13 alphabets (i.e., whether each pair would map correctly).  
- If multiple positions agree on the same k, you get the key pair index at those positions.

Key length detection
- Use coincidence tests (Kasiski-like repeats) to estimate the keyword length. Since there are only 13 alphabets, repeats can be strong clues.  
- Once a likely key length L is guessed, partition the text into L columns and analyze each column for which of the 13 alphabet pairings best explains the mapping distribution.

Frequency hints
- Because Porta maps across halves, letters A–M in plaintext always emerge as N–Z in ciphertext at that position.  
- If you can guess some plaintext letters belong to A–M (e.g., many Es in English often map to the second half under many k values), you can test against the table to reduce possibilities.

Consistency checks
- Any candidate key stream must satisfy all letter pairs in its positions. A single contradiction eliminates that candidate.


## Common Mistakes and Pitfalls
- Using Vigenère thinking: Porta is not a simple Caesar shift per key letter. It’s half-to-half mapping with only 13 alphabets.  
- Forgetting reciprocity: If P→C, then C→P under the same k at the same position. Use this to check your work.  
- Mixing halves: For a fixed k, A–M only map to N–Z and N–Z only map to A–M. If you get A→A or N→N, something is wrong.  
- Wrong key repetition: Ensure the keyword is repeated precisely; misalignment breaks everything.  
- Ignoring key pairs: The letter X (for example) doesn’t pick a unique alphabet by itself; it shares an alphabet with W (pair WX). Remember to use pair indices.


## Quick Reference
- Key pairs: AB, CD, EF, GH, IJ, KL, MN, OP, QR, ST, UV, WX, YZ  
- Pair index from key letter: floor((position of letter in A..Z)/2)  
- Decrypt: for each position, use the pair row to map the ciphertext letter across halves (A–M ↔ N–Z) to plaintext.  
- Reciprocal: applying the same mapping twice (with the same key stream) returns the original text.

## Step-by-Step Checklist (Solving)
1) Normalize the text and pick a candidate key length (try 3–8 first).  
2) Partition positions by modulo key length.  
3) For each position class, test which k in {0..12} best explains letter correspondences you observe/guess.  
4) Derive the repeating sequence of k’s; convert each k to its key pair (0→AB, 1→CD, etc.).  
5) Narrow to a specific keyword by choosing one of the two letters in each pair that makes sense (dictionary words often emerge).  
6) Decrypt fully using the reconstructed key (or directly with the pair stream).


## Practice: Short Exercises (Decryption Only)
Try solving these by hand using the tableau.

Exercise 1
- Cipher: ZSPWRC  
- Key: KEY  
- Task: Decrypt.

Exercise 2 (Key length inference)
- Cipher: RZQRY QZVTV IQLGU ZJFFW WXJ  
- Task: Hypothesize a key length, propose key pairs per column, and attempt decryption.


## FAQ
Q: How is Porta different from Vigenère?  
A: Vigenère uses 26 Caesar shifts; Porta uses 13 reciprocal alphabets that map across halves. Porta de/encryption is the same operation; Vigenère’s are inverse operations with different shifts.

Q: Do I need to know the key to decrypt?  
A: Not necessarily. With cribs, pattern analysis, and key length detection, you can often reconstruct the key pairs and then the exact keyword.

Q: Can I treat Porta as ROT13 sometimes?  
A: Only when k=0 (key pair AB). For other key pairs, the mapping differs.

Q: Are spaces and punctuation encrypted?  
A: Depends on the puzzle source. In Codebusters-style problems, plaintext is typically letters only, but always follow the specific instructions.


## Pseudocode (Reference)
```text
alphabetFirst  = "ABCDEFGHIJKLM"   // indices 0..12
alphabetSecond = "NOPQRSTUVWXYZ"   // indices 0..12

function keyIndex(letter):
  // A=0..Z=25 → pairIndex = floor(idx/2)
  return floor((ord(letter) - ord('A')) / 2)  // 0..12

function portaMap(pChar, kChar):
  k = keyIndex(kChar) // 0..12
  if pChar in alphabetFirst:
    i = indexOf(pChar in alphabetFirst)       // 0..12
    return alphabetSecond[(i + k) mod 13]
  else if pChar in alphabetSecond:
    j = indexOf(pChar in alphabetSecond)      // 0..12
    return alphabetFirst[(j - k + 13) mod 13]
  else:
    return pChar  // punctuation/spaces
```


## Further Reading
- Classical cryptography texts on Porta (Porta cipher, Porta table).  
- Comparisons with Vigenère/Vernam for intuition on polyalphabetic ciphers.  
- Codebusters rules and reference guides for event-specific expectations.

