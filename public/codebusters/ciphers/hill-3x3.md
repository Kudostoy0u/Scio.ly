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

## How Encryption Works (3x3)
Given K and plaintext vector P=[p1;p2;p3], compute C = K·P (mod 26). Map c1,c2,c3 back to letters.

Worked example (illustrative)
Let K = [ [6,24,1], [13,16,10], [20,17,15] ]. This is a classic invertible key.
- det(K) ≡ 25 (mod 26), gcd(25,26)=1 → invertible.

Encrypt ACT (A=0, C=2, T=19): P=[0;2;19]
- c1 = 6·0 + 24·2 + 1·19 = 0 + 48 + 19 = 67 ≡ 15 → P
- c2 = 13·0 + 16·2 + 10·19 = 0 + 32 + 190 = 222 ≡ 14 → O
- c3 = 20·0 + 17·2 + 15·19 = 0 + 34 + 285 = 319 ≡ 7 → H
Cipher: POH.

## How Decryption Works (3x3)
With K⁻¹ (given or computed), compute P = K⁻¹·C (mod 26).

Continuing the example, suppose K⁻¹ is known (for the above K):
K⁻¹ ≡ [ [8,5,10], [21,8,21], [21,12,8] ] (mod 26)  
Decrypt POH (P=15,O=14,H=7) → C=[15;14;7]
- p1 = 8·15 + 5·14 + 10·7 = 120 + 70 + 70 = 260 ≡ 0 → A
- p2 = 21·15 + 8·14 + 21·7 = 315 + 112 + 147 = 574 ≡ 2 → C
- p3 = 21·15 + 12·14 + 8·7 = 315 + 168 + 56 = 539 ≡ 19 → T
Recovered: ACT.

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
- Encrypt: C = K·P (mod 26).  
- Decrypt: P = K⁻¹·C (mod 26).  
- K⁻¹ = det⁻¹ · adj(K) (mod 26).  
- Division C: K⁻¹ commonly provided; use directly.

## Practice Exercises
1) Verify that det([ [6,24,1], [13,16,10], [20,17,15] ]) ≡ 25 (mod 26).  
2) Encrypt “ACT” with the K above to get POH.  
3) Decrypt POH with K⁻¹ to recover ACT.  
4) Construct a random invertible 3×3 K (mod 26) and compute K⁻¹ by hand (small entries recommended).

## Pseudocode (Reference)
Encryption
```text
alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
function idx(ch): return ord(ch)-ord('A')
function vec3(a,b,c): return [a,b,c]
function mul3(K, P):
  return [ (K[0][0]*P[0] + K[0][1]*P[1] + K[0][2]*P[2]) % 26,
           (K[1][0]*P[0] + K[1][1]*P[1] + K[1][2]*P[2]) % 26,
           (K[2][0]*P[0] + K[2][1]*P[1] + K[2][2]*P[2]) % 26 ]

function encrypt3x3(text, K):
  P = normalize(text)
  while len(P) % 3 != 0: P += 'X'
  out = ""
  for i in range(0, len(P), 3):
    v = vec3(idx(P[i]), idx(P[i+1]), idx(P[i+2]))
    w = mul3(K, v)
    out += alphabet[w[0]] + alphabet[w[1]] + alphabet[w[2]]
  return out
```

Decryption (provided K⁻¹)
```text
function decrypt3x3(text, Kinv):
  return encrypt3x3(text, Kinv) // same loop, using Kinv as the key
```

## Further Reading
- Modular linear algebra for 3×3 matrices.  
- Codebusters rules for Division C: provision of K⁻¹.  
- Classic Hill 3×3 examples and invertible keys.

