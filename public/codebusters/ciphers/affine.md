# Affine Cipher

## Explanation
The Affine cipher is a monoalphabetic substitution over indices A=0, …, Z=25 using modular arithmetic. For solving, we only care about reversing the linear transformation with the decryption rule:

- D(y) = a⁻¹ · (y − b) mod 26, where a⁻¹ is the modular inverse of a modulo 26.

Key facts
- a must be coprime with 26 to have an inverse (gcd(a, 26) = 1). Valid a values: 1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25.
- b can be any integer mod 26 (0..25).
- Only 312 total keys (12 × 26), so brute-force decryption is practical.

## Decryption strategy
- Brute force: try all valid a values and all b from 0..25; pick the key yielding coherent English. Good for short texts.
- Two-pair solve: if you can guess two plaintext letters aligned to two ciphertext letters, solve for (a, b) with modular equations, then verify on more letters.
- Quick screens: test a=1 (Caesar family) quickly by trying b=0..25; if nothing fits, proceed with full affine search.

Formal decryption rule (letters only): map letters to 0..25; compute x = a⁻¹·(y − b) mod 26; map back to A..Z. Preserve spaces/punctuation.

## Worked example (step-by-step)
Ciphertext
```
ZGXY SBWX JN YBQ VLUYXNN, JQ JN YBQ SBWX.
```

Given key: a = 3, b = 11

1) Compute a⁻¹ mod 26
- 3 · 9 = 27 ≡ 1 (mod 26), so a⁻¹ = 9.

2) Decrypt with D(y) = 9 · (y − 11) mod 26
- Work a few words to confirm the key:
  - Z G X Y → indices 25,6,23,24
    - (25−11)=14; 9·14=126 ≡ 22 → W
    - (6−11)=−5≡21; 9·21=189 ≡ 7 → H
    - (23−11)=12; 9·12=108 ≡ 4 → E
    - (24−11)=13; 9·13=117 ≡ 13 → N
    - "WHEN"
  - S B W X → 18,1,22,23 → (18−11)=7 → 9·7=63 ≡ 11 → L; … → "LOVE"

3) Apply to the full text
```
WHEN LOVE IS NOT MADNESS, IT IS NOT LOVE.
```

4) Sanity checks
- Clean English throughout with common words (WHEN, LOVE, IS, NOT, MADNESS, IT).
- Punctuation and spacing preserved.

## Valid a values and modular inverses (mod 26)
| a  | a⁻¹ |
|----|-----|
| 1  | 1   |
| 3  | 9   |
| 5  | 21  |
| 7  | 15  |
| 9  | 3   |
| 11 | 19  |
| 15 | 7   |
| 17 | 23  |
| 19 | 11  |
| 21 | 5   |
| 23 | 17  |
| 25 | 25  |

Notes
- a=1 collapses to a Caesar shift with key b.
- a=25 corresponds to a reversed shift with offset b.

## Solving (a, b) from two letter pairs
If you can posit (x₁→y₁) and (x₂→y₂) with x as plaintext index and y as ciphertext index:
- a x₁ + b ≡ y₁ (mod 26)
- a x₂ + b ≡ y₂ (mod 26)
Subtract: a (x₁ − x₂) ≡ (y₁ − y₂) (mod 26). If d = (x₁ − x₂) is invertible, then a ≡ (y₁ − y₂)·d⁻¹ (mod 26) and b ≡ y₁ − a x₁ (mod 26). If not invertible (gcd(d,26) ∈ {2,13}), choose a different pair or add a third.

Mini example of the algebra
- Suppose E(4) → C(2), T(19) → Z(25): d = 4−19 = −15 ≡ 11; 11⁻¹ = 19; y₁ − y₂ = 2 − 25 ≡ 3 → a ≡ 3·19 ≡ 5; b ≡ 2 − 5·4 ≡ 8.

## Common mistakes
- Using a not coprime with 26 (no inverse) → decryption impossible.
- Forgetting to wrap (y − b) into 0..25 before multiplying by a⁻¹.
- Mixing 1..26 letter indices with 0..25; stick to 0..25.
- Over-relying on frequency for tiny texts; brute force is cheap—use it.

## Quick reference
- Decrypt: x = a⁻¹·(y − b) mod 26
- Valid a: 1,3,5,7,9,11,15,17,19,21,23,25; table above gives a⁻¹
- Solve (a, b) from two letter pairs when you have cribs
- Preserve spaces/punctuation; only rotate letters A–Z

## Practice (decrypt only)
1) Compute a⁻¹ mod 26 for a ∈ {3, 5, 7, 9, 11, 15}.  
2) Decrypt “ZOLSSZ” by brute force; report (a, b) and plaintext.  
3) If G→C and O→A under the same Affine cipher, solve for (a, b) and decrypt a short line containing those letters to verify.

## Pseudocode (reference)
Decryption
```text
alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
function idx(ch): return ord(ch) - ord('A')  // 0..25

function invMod(a, m=26): // extended Euclid
  t, newt = 0, 1
  r, newr = m, a
  while newr != 0:
    q = r // newr
    t, newt = newt, t - q*newt
    r, newr = newr, r - q*newr
  if r > 1: return null // no inverse
  if t < 0: t += m
  return t

function dec(text, a, b):
  ainv = invMod(a, 26)
  out = ""
  for ch in text:
    if 'A'<=ch<='Z':
      y = idx(ch)
      x = (ainv * ((y - b) % 26)) % 26
      out += alphabet[x]
    else:
      out += ch
  return out
```

Brute-force search (keys only for decryption)
```text
validA = [1,3,5,7,9,11,15,17,19,21,23,25]
for a in validA:
  for b in range(26):
    pt = dec(cipher, a, b)
    check if pt looks like English → keep best candidates
```

## Further reading
- Modular arithmetic and the Extended Euclidean Algorithm (for a⁻¹).
- English scoring (word lists, n-grams) to rank brute-force decrypts.

