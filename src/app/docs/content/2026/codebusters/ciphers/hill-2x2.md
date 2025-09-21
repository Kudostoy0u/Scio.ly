# Hill 2x2 Cipher

## What it is
- A block cipher on letter pairs using 2×2 matrix multiplication modulo 26. Convert letters A–Z to numbers 0–25, group plaintext into pairs (pad with X if needed), then for each pair P=[p1;p2] compute ciphertext C=K·P (mod 26) with an invertible 2×2 key K.
- Decryption uses the modular inverse matrix K⁻¹: P=K⁻¹·C (mod 26). K must satisfy gcd(det(K),26)=1 so that K⁻¹ exists.
- Hand rule: write numbers for letters, multiply by K (or K⁻¹) for each block, reduce mod 26 at every step, and map back to letters.

## Key facts you need
- Indexing: A=0, …, Z=25 (not 1..26).  
- Invertibility: det(K)=ad−bc must be coprime with 26.  
- Inverse formula (2×2): K⁻¹ ≡ det⁻¹ · [[ d, −b], [−c, a ]] (mod 26).  
- Always reduce negatives mod 26 (e.g., −3 ≡ 23).

## Setup
- Clean text to A–Z, uppercase; if odd length, pad with X.  
- Split into pairs and convert each to a column vector [p1;p2].

## Worked example (encryption)
Key K = [[3,3],[2,5]]  
- det(K) = 3·5 − 3·2 = 9; gcd(9,26)=1 → invertible.

Encrypt HELP → pairs HE, LP  
- H=7, E=4; L=11, P=15

Pair HE → P=[7;4]  
- c1 = 3·7 + 3·4 = 33 ≡ 7 → H  
- c2 = 2·7 + 5·4 = 34 ≡ 8 → I  
HE → HI

Pair LP → P=[11;15]  
- c1 = 3·11 + 3·15 = 78 ≡ 0 → A  
- c2 = 2·11 + 5·15 = 97 ≡ 19 → T  
LP → AT

Ciphertext: HIAT

## Worked example (decryption)
Same K. Compute K⁻¹:
- det = 9; det⁻¹ ≡ 3 (since 9·3 ≡ 1 mod 26)  
- adj(K) = [[5, −3], [−2, 3]] ≡ [[5,23],[24,3]]  
- K⁻¹ = 3·[[5,23],[24,3]] ≡ [[15,17],[20,9]] (mod 26)

Decrypt HIAT → pairs HI, AT  
- H=7, I=8; A=0, T=19

HI → C=[7;8]  
- p1 = 15·7 + 17·8 = 241 ≡ 7 → H  
- p2 = 20·7 +  9·8 = 212 ≡ 4 → E  
HI → HE

AT → C=[0;19]  
- p1 = 15·0 + 17·19 = 323 ≡ 11 → L  
- p2 = 20·0 +  9·19 = 171 ≡ 15 → P  
AT → LP

Recovered plaintext: HELP

## Validating keys quickly
- det(K) must be in {1,3,5,7,9,11,15,17,19,21,23,25}.  
- If det shares a factor with 26 (i.e., even or 13), no inverse exists.

## Solving without the key (crib-based)
1) Align a guessed word (e.g., HE→HI) across ciphertext pairs.  
2) Form equations for K using C=K·P; two distinct pairs solve for a,b,c,d.  
3) Check det(K) invertible; then decrypt entire text and confirm fluent English.

## Common pitfalls
- Using 1..26 index mapping (wrong).  
- Forgetting to reduce negatives mod 26.  
- Odd-length plaintext without padding.  
- Singular keys (no inverse) due to det not coprime with 26.

## Quick reference
- Encrypt: C = K·P (mod 26).  
- Decrypt: P = K⁻¹·C (mod 26).  
- K⁻¹ (2×2): det⁻¹ · [[ d, −b], [−c, a ]] (mod 26).

## Practice
1) Check invertibility of K=[[7,8],[11,11]]; if invertible, compute K⁻¹.  
2) Encrypt “MATH” with K=[[3,3],[2,5]].  
3) Decrypt “HIAT” with K⁻¹=[[15,17],[20,9]].  
4) Given HE→HI and LP→AT, solve K and verify det(K) is invertible.

### Answers
1) det = 7·11 − 8·11 = 77 − 88 = −11 ≡ 15; gcd(15,26)=1 → invertible. K⁻¹ = 15⁻¹·[[11,−8],[−11,7]]; 15⁻¹≡7; K⁻¹ ≡ 7·[[11,18],[15,7]] ≡ [[25,22],[1,23]].  
2) M(12)A(0) → C = [[3,3],[2,5]]·[12;0] = [36;24] ≡ [10;24] → K Y; T(19)H(7) → [3·19+3·7, 2·19+5·7]=[78, 93]≡[0,15] → A P → `KYAP`.  
3) From example above, `HIAT` → `HELP`.  
4) Solving yields K=[[3,3],[2,5]] (as in example); det=9 → invertible.

