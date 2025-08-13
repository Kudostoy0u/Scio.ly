# Hill 2x2 Cipher

## Explanation
The Hill cipher is a polygraphic substitution cipher that encrypts blocks of letters using matrix multiplication modulo 26. For the 2x2 version, plaintext is processed two letters at a time as 2×1 column vectors and multiplied by a 2×2 key matrix K (mod 26).

Key requirements
- Alphabet indexing: A=0, B=1, …, Z=25.
- Key matrix K must be invertible modulo 26, i.e., gcd(det(K), 26) = 1.
- Encryption: C = K · P (mod 26) for each 2-letter block P.
- Decryption: P = K⁻¹ · C (mod 26), where K⁻¹ is the modular inverse of K.

Why it’s used in Codebusters
- Demonstrates linear algebra over modular arithmetic.
- Requires care with determinants, modular inverses, and padding.

## Setup and Notation
Index mapping
- A→0, B→1, …, Z→25; convert letters to numbers and back.

Block formation
- Clean plaintext to letters only, uppercase.  
- If length is odd, pad with a filler (often X) to make it even.  
- Split into pairs: (P1,P2), (P3,P4), …  
- Convert each pair into column vector [p1; p2].

Matrix operations
- Let K = [ [a, b], [c, d] ].  
- Determinant det(K) = ad − bc (mod 26).  
- K is invertible iff gcd(det(K), 26) = 1.

K⁻¹ (2x2) formula
- Compute det = ad − bc (mod 26).  
- Find det⁻¹ mod 26 (via Extended Euclid).  
- Adjugate(K) = [ [ d, −b], [−c,  a] ] (apply mod 26).  
- K⁻¹ = det⁻¹ · Adjugate(K) (mod 26).

## How Encryption Works (2x2)
Given key K and plaintext vector P=[p1;p2], compute C = K·P (mod 26) to get C=[c1;c2], then map c1,c2 to letters.

Worked example (classic 2x2)
Let K = [ [3, 3], [2, 5] ].
- det(K) = 3·5 − 3·2 = 15 − 6 = 9; gcd(9,26)=1 → invertible.

Encrypt HEL P → pairs: HE and LP.
- Map: H=7, E=4, L=11, P=15.

Pair 1: P=[7;4]
- c1 = 3·7 + 3·4 = 21 + 12 = 33 ≡ 7 → H
- c2 = 2·7 + 5·4 = 14 + 20 = 34 ≡ 8 → I
So HE → HI.

Pair 2: P=[11;15]
- c1 = 3·11 + 3·15 = 33 + 45 = 78 ≡ 0 → A
- c2 = 2·11 + 5·15 = 22 + 75 = 97 ≡ 19 → T
So LP → AT.

Ciphertext: HIAT.

## How Decryption Works (2x2)
Compute K⁻¹ and multiply C by K⁻¹ (mod 26).

Continuing the example
- K = [ [3, 3], [2, 5] ], det = 9, det⁻¹ ≡ 3 (since 9·3=27≡1 mod 26).
- Adjugate(K) = [ [ 5, −3], [−2, 3] ] ≡ [ [5, 23], [24, 3] ].
- K⁻¹ = 3 · [ [5,23],[24,3] ] ≡ [ [15, 69], [72, 9] ] ≡ [ [15,17],[20,9] ].

Decrypt HIAT → pairs HI and AT.
- H=7, I=8, A=0, T=19.

C=[7;8] → P = K⁻¹·C mod26
- p1 = 15·7 + 17·8 = 105 + 136 = 241 ≡ 241−234=7 → H
- p2 = 20·7 +  9·8 = 140 + 72 = 212 ≡ 212−208=4 → E
So HI → HE.

C=[0;19] → P
- p1 = 15·0 + 17·19 = 323 ≡ 323−312=11 → L
- p2 = 20·0 +  9·19 = 171 ≡ 171−156=15 → P
So AT → LP.

Recovered plaintext: HELP.

## Computing K⁻¹ (2x2) Step-by-Step
1) det = ad − bc (mod 26).  
2) det⁻¹ via Extended Euclid.  
3) Adjugate(K) = [ [ d, −b], [−c,  a] ] (mod 26).  
4) Multiply every entry by det⁻¹ mod 26.

Tip: Always reduce negatives mod 26 (e.g., −3 ≡ 23).

## Validating Key Matrices
- det(K) must be in {1,3,5,7,9,11,15,17,19,21,23,25}.  
- Avoid det(K) ≡ 0, 2, 4, 6, 8, 10, 12, 13, 14, 16, 18, 20, 22, 24 mod 26.

## Solving Without the Key (Strategy)
1) Guess a probable word (crib) and align over ciphertext pairs.  
2) Generate equations C = K·P for one or two pairs:  
   - Given (p1,p2)→(c1,c2), you have:  
     a·p1 + b·p2 ≡ c1 (mod 26)  
     c·p1 + d·p2 ≡ c2 (mod 26)
3) With two distinct pairs, you can solve the 4 unknowns (a,b,c,d).  
4) Check det(K) is invertible mod 26; if not, discard and try another crib.  
5) Validate across more pairs; decrypt full text.

Heuristics
- Even if you don’t fully solve K, try small candidate matrices with valid det and score the decrypted text for English.
- Two high-confidence pairs usually suffice to solve K uniquely.

## Common Pitfalls
- Forgetting to pad to even length; misaligns pairs.  
- Using a singular key (det not coprime with 26) → no inverse exists.  
- Failing to wrap negatives and sums mod 26 at each step.  
- Mapping letters to 1..26 instead of 0..25 in calculations.

## Quick Reference
- Encrypt: C = K·P (mod 26).  
- Decrypt: P = K⁻¹·C (mod 26).  
- Inverse (2×2): K⁻¹ = det⁻¹ · [ [ d, −b], [−c, a] ] (mod 26).  
- det(K) must be coprime with 26.

## Practice Exercises
1) For K=[ [7,8],[11,11] ] compute det(K) and check if invertible. If so, find K⁻¹.  
2) Encrypt “MATH” with K=[ [3,3],[2,5] ].  
3) Decrypt “HIAT” with the K⁻¹ above.  
4) Given pairs HE→HI and LP→AT, solve for K.

## Pseudocode (Reference)
Encryption
```text
alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
function idx(ch): return ord(ch)-ord('A')
function vec2(a,b): return [a,b]
function mul2(K, P):
  return [ (K[0][0]*P[0] + K[0][1]*P[1]) % 26,
           (K[1][0]*P[0] + K[1][1]*P[1]) % 26 ]

function encrypt2x2(text, K):
  P = normalize(text)          // A–Z only
  if len(P) % 2 == 1: P += 'X' // pad
  out = ""
  for i in range(0, len(P), 2):
    v = vec2(idx(P[i]), idx(P[i+1]))
    w = mul2(K, v)
    out += alphabet[w[0]] + alphabet[w[1]]
  return out
```

Decryption (requires K⁻¹)
```text
function inv2x2(K):
  det = (K[0][0]*K[1][1] - K[0][1]*K[1][0]) % 26
  invdet = invMod(det, 26)         // extended Euclid
  adj = [ [ K[1][1], -K[0][1] ],
          [ -K[1][0], K[0][0] ] ]
  // reduce mod 26
  for r in 0..1:
    for c in 0..1:
      adj[r][c] = (adj[r][c] % 26 + 26) % 26
  // scale by invdet mod 26
  for r in 0..1:
    for c in 0..1:
      adj[r][c] = (adj[r][c] * invdet) % 26
  return adj

function decrypt2x2(text, K):
  Kinv = inv2x2(K)
  return encrypt2x2(text, Kinv) // same loop but using Kinv
```

## Further Reading
- Linear algebra over modular rings (Z/26Z).  
- Codebusters references for Hill cipher rules and Division B/C distinctions.  
- Classic Hill cipher examples and known keys.

