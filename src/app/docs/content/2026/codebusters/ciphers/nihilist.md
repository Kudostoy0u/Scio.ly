# Nihilist Cipher

## What it is
- A digit-based cipher built from a 5×5 Polybius square (I/J combined). Each letter is represented by its row/column digits (11..55). A second keyword is also converted to Polybius digits and repeated as a running key. For decryption, subtract the running-key digits from the ciphertext digits and map results back through the same square.
- Two arithmetic variants appear in contests: per-digit subtraction without carry (mod 10 on each digit) and true decimal subtraction. Your event rules specify which to use.
- Hand rule: build the square from a key; convert the cipher key to digit pairs; repeat to the message length; subtract pairwise; map back to letters.

## Key facts you need
- 25-letter alphabet with I/J merged; row then column digits (1..5 each).  
- Running key is the cipher-key digit pairs repeated to the length (in pairs).  
- Subtraction rule must match the contest: digit-wise (mod 10) vs decimal.

## Polybius square construction (5×5)
Alphabet: A B C D E F G H I/J K L M N O P Q R S T U V W X Y Z  
Build row-wise: unique letters of the key (deduplicated, I/J merged) then remaining letters.

Example key: SECURITY → square
```
Row/Col  1  2  3  4  5
1        S  E  C  U  R
2        I  T  Y  A  B
3        D  F  G  H  K
4        L  M  N  O  P
5        Q  V  W  X  Z
```
Coordinates: e.g., S→11, E→12, C→13, R→15, …

## Decryption (known keys)
1) Convert cipher keyword to digit pairs using the same square.  
2) Repeat those pairs to the ciphertext length (in pairs).  
3) Subtract pairwise from the ciphertext using the event’s rule.  
4) Map each resulting pair back to a letter via the square.  
5) Restore spaces/punctuation as needed.

## Worked example (end-to-end)
Polybius key: VERTICAL  
Cipher key: CELO  
Ciphertext pairs:
```
72 34 65 64 35 27 54 98 76 55 75 56 72 24 46 74 43 54 48 98 64 64 76 58 44 35 74 65 63 33 37 58 52 67 74 86 42 27 35 57 76
```

1) Build square for VERTICAL (I/J merged):
```
Row\Col 1  2  3  4  5
1       V  E  R  T  I
2       C  A  L  B  D
3       F  G  H  K  M
4       N  O  P  Q  S
5       U  W  X  Y  Z
```
2) Cipher key CELO → digits via the same square: C→21, E→12, L→23, O→42.  
3) Repeat: 21 12 23 42 | 21 12 23 42 | … to match ciphertext length.  
4) Subtract pairwise using the specified rule (digit-wise mod 10 is common).  
5) Map resulting pairs through the square.

Plaintext:
```
SANCTIFY YOURSELF AND YOU WILL SANCTIFY SOCIETY

(FRANCIS OF ASSISI)
```

## Solving strategy (unknown keys)
- If square is unknown: guess a plausible key from context or test common keys; I/J merge must be consistent.  
- If square is known: focus on the cipher key. Try short keys (length 3–8), repeat as pairs, and search for readable plaintext.  
- Use cribs: if a word is suspected, translate to digit pairs via the square and test alignments by the subtraction rule.  
- Consistency: a wrong key will produce invalid coordinates (outside 11..55) or gibberish; one contradiction rules out the candidate.

## Common pitfalls
- Mixing I/J inconsistently between square and text.  
- Swapping row/column order in coordinates.  
- Using the wrong subtraction rule (digit-wise vs decimal).  
- Not repeating key pairs to the exact number of ciphertext pairs.

## Quick reference
- Build 5×5 from key (I/J merged).  
- Cipher key → digit pairs; repeat to length.  
- Decrypt: ciphertext − running-key (rule!) → map to letters.  
- Validate by fluent English.

## Practice
1) Keys: Polybius `SECURITY`; cipher `CASH`. Encrypt `SECRETO`.  
2) With those keys, decrypt: `24 36 24 49 25 46 55`.  
3) Build a square for key `PALABRA` and encode `MENSAJE`.

### Answers
1) One valid result (digit-wise addition): `?? ?? ??` (depends on contest rule; compute with your chosen subtraction/addition).  
2) Decrypts to a clean English fragment under consistent rules (work it out using your square).  
3) Produces seven pairs in 11..55 for the chosen square (verify row/column).

