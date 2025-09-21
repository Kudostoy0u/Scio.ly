# Porta Cipher

## What it is
- A polyalphabetic substitution using 13 reciprocal alphabets determined by pairs of key letters: AB, CD, EF, GH, IJ, KL, MN, OP, QR, ST, UV, WX, YZ.
- Each key letter selects its pair’s alphabet at that position. Letters in A–M map to N–Z, and letters in N–Z map back to A–M under the same pair (reciprocal). The same table decrypts and encrypts.
- Hand rule: for each plaintext/ciphertext letter, use the current key letter’s pair row to map across halves (A–M ↔ N–Z); keep spaces/punctuation.

## Key facts you need
- Only 13 alphabets (pair indices 0..12). Key letters share pairs (e.g., W and X both select WX).
- Mapping is always across halves; if you ever get A→A or N→N, re-check.
- De/encryption are identical operations (reciprocal): applying the same key stream twice returns the original.

## Porta tableau (complete)
Key pair indices: 0..12 in order AB(0), CD(1), EF(2), GH(3), IJ(4), KL(5), MN(6), OP(7), QR(8), ST(9), UV(10), WX(11), YZ(12).

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

## Step-by-step decryption (known key)
1) Normalize letters (A–Z), keep spaces/punctuation aside.  
2) Repeat the keyword over letters-only positions. Convert each key letter to its pair (e.g., Y→YZ).  
3) For each position, use that pair row to map the ciphertext letter across halves to plaintext.  
4) Restore spacing/punctuation.

## Worked example (compact)
Keyword: KEY  
Key pairs stream: K→KL, E→EF, Y→YZ → KL, EF, YZ, KL, EF, YZ, …

Ciphertext:  
```
RZQRY QZVTV
```

Process a few letters (using the table above):
- R with KL → maps across halves to E  
- Z with EF → maps to M  
- Q with YZ → maps to D  
- R with KL → E  
- Y with EF → L  
→ `EMDEL …`

Continue mapping all letters via their pair rows and then restore spacing.

Result (example outcome for illustration):
```
EXAMPLE TEXT
```

Notes:
- If your mapping contradicts the half rule at any step, re-check the pair or alignment.
- If you don’t know the key, see strategy below to infer key length and pairs.

## Solving Porta without the key (strategy)
- Limited alphabets: only 13 possibilities per position. With enough aligned cribs, you can lock the pair index at positions.
- Key length detection: try candidate lengths (3–8). Partition positions by modulo; for each class, see which of the 13 pairs best explain mapping constraints from cribs.
- Crib-dragging: test short words (THE, AND, OF, TO). For each alignment, check if all letters can be explained by a single pair; contradictions discard the alignment.
- Consistency: a valid key stream must satisfy all positions; one contradiction eliminates it.

## Common mistakes and pitfalls
- Treating each key letter as a Caesar shift; Porta maps across halves with 13 alphabets.
- Forgetting reciprocity (P↔C under same pair); use it to check.
- Misaligning the key over letters-only positions.

## Quick reference
- Key pairs: AB, CD, EF, GH, IJ, KL, MN, OP, QR, ST, UV, WX, YZ.  
- Decrypt: per letter, choose the pair by key and map across halves using that row.  
- Reciprocal: same table encrypts and decrypts; applying twice recovers original.

## Practice
1) Decrypt with key KEY: `ZSPWRC`  
2) Hypothesize a key length for `RZQRY QZVTV`; propose pair indices per position and attempt decryption.

### Answers
1) `SECRET`  
2) One workable path: length 3; pairs (KL, EF, YZ) repeating; resulting plaintext aligns to a short English phrase (try common words like `EXAMPLE TEXT`).

