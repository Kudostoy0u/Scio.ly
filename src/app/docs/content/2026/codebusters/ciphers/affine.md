# Affine Cipher

## What it is
- Letters A–Z are mapped to numbers 0–25. Encryption applies the rule y ≡ a·x + b (mod 26). Decryption inverts it: x ≡ a⁻¹·(y − b) (mod 26), where a⁻¹ is the modular inverse of a modulo 26.
- Example (a=3, b=11): E(4) → y=3·4+11=23→X; T(19) → y=3·19+11=68≡16→Q. To decode, multiply (y − b) by a⁻¹ mod 26.
- Hand rule for decode: write letters as 0..25, subtract b, multiply by a⁻¹, wrap into 0..25, map back to A..Z.

## Key facts you need
- Valid a (coprime with 26): 1,3,5,7,9,11,15,17,19,21,23,25. b is 0–25.
- Decrypt formula: x = a⁻¹·(y − b) mod 26. a⁻¹ exists only if gcd(a,26)=1.
- Only 312 keys total (12×26) → brute force feasible; test a=1 first (Caesar family).

## Step-by-step solving workflow
1) Quick screen: try a=1 with all b (Caesar). If none fit, continue.
2) If you have two plaintext–ciphertext letter pairs (cribs), solve for a and b using modular equations; then verify on a few letters/words.
3) Otherwise brute force over valid a and b; pick the clean English result.

### Solving (a, b) from two letter pairs
If x₁→y₁ and x₂→y₂ (0–25 numbering):
- a·x₁ + b ≡ y₁ (mod 26)
- a·x₂ + b ≡ y₂ (mod 26)
Subtract: a·(x₁ − x₂) ≡ (y₁ − y₂) (mod 26).
If d = (x₁ − x₂) has an inverse mod 26, then a ≡ (y₁ − y₂)·d⁻¹ (mod 26), b ≡ y₁ − a·x₁.

## Worked example (full walk-through)
Ciphertext
```
ZGXY SBWX JN YBQ VLUYXNN, JQ JN YBQ SBWX.
```
Given key: a = 3, b = 11.

1) Find a⁻¹ mod 26
- 3·9 = 27 ≡ 1 (mod 26) → a⁻¹ = 9.

2) Decrypt a few letters to confirm
- Z G X Y → 25 6 23 24.
- x = 9·(y − 11) mod 26 → 25→(14)→9·14=126≡22→W; 6→(−5≡21)→9·21=189≡7→H; 23→(12)→9·12=108≡4→E; 24→(13)→9·13=117≡13→N → `WHEN`.
- Next word SBWX → `LOVE`. Looks good; proceed.

3) Full decryption
```
WHEN LOVE IS NOT MADNESS, IT IS NOT LOVE.
```

## Practice
1) Try a=5, b=8; decrypt: `ZEBBW`  
2) Suppose you think E→C and T→Z. Solve for (a, b) and verify.  
3) Brute force: `KQXK TFQE` → find (a, b) and plaintext.

### Answers
1) a=5 → a⁻¹=21; `ZEBBW` → `TERRA`.  
2) E(4)→C(2), T(19)→Z(25): d=11; d⁻¹=19; a≡(2−25)·19≡5; b≡2−5·4≡8 → (a,b)=(5,8).  
3) One valid result: (a,b)=(11,6) → `GOOD LUCK`.

## Common mistakes
- Using a not coprime with 26 → no a⁻¹ → cannot decrypt.
- Mixing 1–26 with 0–25 indices; stick to 0–25.
- Forgetting to wrap y−b into 0..25 before multiplying by a⁻¹.

## Quick reference
- Try Caesar first (a=1). If it fails, brute force valid a and b.
- Or use two letter pairs (cribs) to solve for (a, b) and verify.
- Decrypt: x = a⁻¹·(y − b) mod 26; keep spaces/punct.

## See also
- Caesar (a=1 special case), Random Aristocrat, K1/K2/K3 Aristocrat.

