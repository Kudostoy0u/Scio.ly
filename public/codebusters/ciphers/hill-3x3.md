# Hill 3x3 Cipher

## Explanation
The Hill cipher (3x3 variant) encrypts blocks of three letters at a time using a 3×3 key matrix K over modulo 26 arithmetic. Plaintext is processed as 3×1 column vectors, multiplied by K (mod 26) to produce ciphertext vectors.

Key requirements
- Alphabet indexing: A=0, B=1, …, Z=25.
- K must be invertible modulo 26: gcd(det(K), 26) = 1.
- Encryption: C = K · P (mod 26).
- Decryption: P = K⁻¹ · C (mod 26).
- In Division C problems, the decryption matrix K⁻¹ is often provided to you to avoid computing it during the event.

Why 3x3 is different from 2x2
- Blocks are size 3 (triplets); padding must bring length to a multiple of 3.  
- Computing K⁻¹ requires 3×3 cofactors and adjugate; more arithmetic.  
- Provided K⁻¹ (common in Division C) lets you decrypt directly without inverting.

## Setup and Notation
Index mapping
- A→0, B→1, …, Z→25.

Block formation
- Clean plaintext to letters only, uppercase.  
- If length not multiple of 3, pad with X to complete the last block.  
- Form 3×1 vectors [p1;p2;p3] for each triple of letters.

Matrix operations
- Let K be 3×3 with entries in 0..25.  
- Determinant det(K) computed mod 26 must be coprime with 26.

K⁻¹ (3x3) overview
- Compute matrix of cofactors C where C[i,j] = (−1)^{i+j} · det(M_{ij}) (minor), all mod 26.  
- Adjugate(K) = transpose(C).  
- Find det(K) and det⁻¹ (mod 26).  
- K⁻¹ = det⁻¹ · adj(K) (mod 26).

In contest settings, K⁻¹ is typically given to you; use it as the encryption key for decryption.

## How Decryption Works (3x3)
With K⁻¹ (given or computed), compute P = K⁻¹·C (mod 26).

Worked example (full decryption with provided matrices)
Ciphertext (grouped for readability):
```
HJLBEL IIWSHL MYHDZJ WAHWTU KSSTBN EYROGA NRNXOX
```

Given
```
Encryption matrix K   = [ [18,  4, 21],
                          [16, 23, 11],
                          [ 3,  8, 23] ]   // (S E V; Q X L; D I X)

Decryption matrix K⁻¹ = [ [ 7, 14,  5],
                          [ 5, 13, 22],
                          [ 3, 14, 20] ]   // provided in contest
```

Steps
1) Normalize to letters A–Z, uppercase; remove spaces/punctuation.  
2) Map A→0, …, Z→25.  
3) Split the ciphertext into 3-letter blocks; form column vectors C=[c1;c2;c3].  
4) For each block, compute P = K⁻¹·C (mod 26) and map back to letters.

First two blocks (shown step-by-step)
- Block 1: "HJL" → [7;9;11]
  - p = K⁻¹·C = [ 7·7 +14·9 + 5·11,
                  5·7 +13·9 +22·11,
                  3·7 +14·9 +20·11 ] (mod 26)
           = [230, 394, 367] ≡ [22, 4, 3] → W E D
- Block 2: "BEL" → [1;4;11]
  - p = [ 7·1 +14·4 + 5·11,
          5·1 +13·4 +22·11,
          3·1 +14·4 +20·11 ] (mod 26)
    = [118, 299, 279] ≡ [14, 13, 19] → O N T

Continuing through all blocks yields:
```
WE DONT SEE THINGS AS THEY ARE WE SEE THEM AS WE ARE
```
Restore punctuation/case:
```
We don't see things as they are, we see them as we are. (Anaïs Nin)
```

## Computing K⁻¹ (3x3) Outline
If K⁻¹ is not provided:
1) Compute det(K) mod 26.  
2) Ensure gcd(det,26)=1; else pick a new K.  
3) Build cofactor matrix C by 2×2 minors with signs.  
4) Take adj(K) = transpose(C).  
5) Find det⁻¹ mod 26.  
6) Multiply adj(K) by det⁻¹ (mod 26) to get K⁻¹.

Caution: Always reduce after each operation; handle negatives mod 26 by adding 26 as needed.

## Validating Key Matrices
- det(K) ∈ {1,3,5,7,9,11,15,17,19,21,23,25} (mod 26).  
- If det(K) ≡ 13 or any even number, K is singular mod 26 → no inverse.

## Solving Without the Key (Strategy)
1) Crib-based solving
- Align a likely word (e.g., THE) across ciphertext triples; create equations C = K·P for consecutive blocks.  
- Three independent P→C blocks can determine K (9 unknowns), though fewer may suffice if structured.

2) Use provided K⁻¹ (Division C)
- Directly multiply ciphertext blocks by K⁻¹ to decrypt; check plaintext plausibility and padding.

3) Heuristic search (advanced)
- For long texts, search over candidate K with valid determinants, score decrypted text by English fitness.

## Padding and Formatting
- Pad the last block with X if plaintext length not divisible by 3.  
- Group ciphertext in 3s or 6s for readability (contest-dependent).  
- Only letters A–Z are processed; punctuation/spaces typically stripped.

## Common Pitfalls
- Forgetting to pad to multiples of 3.  
- Miscomputing minors/cofactors (sign errors).  
- Not reducing intermediate results mod 26 (especially negatives).  
- Using a non-invertible K (det not coprime with 26).

## Quick Reference
- Decrypt: P = K⁻¹·C (mod 26).  
- K⁻¹ = det⁻¹ · adj(K) (mod 26).  
- Division C: K⁻¹ commonly provided; use directly.

## Practice Exercises (Decryption Only)
1) Given K⁻¹, decrypt two 3-letter blocks and validate against a guessed word.  
2) With three independent plaintext–ciphertext blocks, solve for K and confirm det(K) is invertible.  
3) Confirm that your K⁻¹ is truly the inverse by checking K·K⁻¹ ≡ I (mod 26).

## Pseudocode (Reference)
Decryption (provided K⁻¹)
```text
function decrypt3x3(text, Kinv):
  return encrypt3x3(text, Kinv) // same loop, using Kinv as the key
```

## Further Reading
- Modular linear algebra for 3×3 matrices.  
- Codebusters rules for Division C: provision of K⁻¹.  
- Classic Hill 3×3 examples and invertible keys.

