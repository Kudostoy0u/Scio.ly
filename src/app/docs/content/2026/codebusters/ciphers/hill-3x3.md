# Hill 3x3 Cipher

## What it is
- A block cipher on triplets of letters using 3×3 matrix multiplication modulo 26. Convert A–Z → 0–25, group plaintext into 3-letter blocks (pad with X if needed), then for each block P=[p1;p2;p3] compute ciphertext C=K·P (mod 26) with an invertible 3×3 key K.
- Decryption uses K⁻¹ (mod 26): P=K⁻¹·C (mod 26). In Division C problems, K⁻¹ is often given to save time.
- Hand rule: map letters to numbers, multiply by K (or K⁻¹) per block, reduce mod 26 at each step, and map back to letters.

## Key facts you need
- Indexing: A=0,…,Z=25.  
- Invertibility: gcd(det(K),26)=1.  
- K⁻¹ = det⁻¹·adj(K) (mod 26) where adj(K) is the transpose of the cofactor matrix.  
- Reduce negatives and intermediates mod 26 consistently.

## Setup
- Clean to A–Z, uppercase; pad with X to multiple of 3.  
- Form 3×1 vectors per block.

## Worked example (decryption with provided matrices)
Ciphertext:
```
HJLBEL IIWSHL MYHDZJ WAHWTU KSSTBN EYROGA NRNXOX
```
Given:
```
K   = [ [18,  4, 21],
        [16, 23, 11],
        [ 3,  8, 23] ]

K⁻¹ = [ [ 7, 14,  5],
        [ 5, 13, 22],
        [ 3, 14, 20] ]
```
Steps
1) Remove spaces/punctuation; map letters → 0..25.  
2) Split into 3-letter blocks; form C=[c1;c2;c3].  
3) Compute P = K⁻¹·C (mod 26) for each block; map back to letters.

First two blocks
- "HJL" → [7;9;11] → p = [230,394,367] ≡ [22,4,3] → W E D  
- "BEL" → [1;4;11] → p = [118,299,279] ≡ [14,13,19] → O N T

Continue through all blocks →
```
WE DONT SEE THINGS AS THEY ARE WE SEE THEM AS WE ARE
```
Restore punctuation/case:
```
We don't see things as they are, we see them as we are. (Anaïs Nin)
```

## Computing K⁻¹ (outline)
- Compute det(K) mod 26; ensure gcd(det,26)=1.  
- Form cofactors from 2×2 minors with alternating signs; transpose to get adj(K).  
- Find det⁻¹ mod 26; multiply adj(K) by det⁻¹ (mod 26).

## Solving without the key
- Crib-based: align a suspected word across consecutive blocks; set up C=K·P equations. Three independent blocks can determine K; verify det(K) invertible.  
- If K⁻¹ is given, decrypt directly and validate readability.

## Common pitfalls
- Forgetting to pad to a multiple of 3.  
- Sign mistakes in cofactors; not reducing mod 26.  
- Using a non-invertible K.

## Quick reference
- Decrypt: P = K⁻¹·C (mod 26).  
- Division C often provides K⁻¹; use it directly.

## Practice
1) Using the K⁻¹ above, decrypt the first three blocks by hand.  
2) Verify K·K⁻¹ ≡ I (mod 26) for one row/column pair.  
3) Given three independent P→C blocks, set up equations to solve for K and check det(K) invertible.

### Answers
1) `WED` `ONT` `SEE`  
2) Example: row1(K)·col1(K⁻¹) ≡ 1; row1·col2 ≡ 0 (mod 26).  
3) Produces a unique K (mod 26) if pairs are independent; det(K) must be coprime with 26.

