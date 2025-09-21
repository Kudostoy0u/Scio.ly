# Atbash Cipher

## What it is
- A fixed mirror of the alphabet. Each letter is replaced by its opposite: A↔Z, B↔Y, C↔X, …, M↔N. There is no key; the mapping never changes.
- Example: THE → GSV (T→G, H→S, E→V); AND → ZMW (A→Z, N→M, D→W). Applying the mapping twice returns the original text.
- Hand rule for decode: replace each letter with its mirror partner; keep spaces and punctuation.

## Key facts you need
- The mapping table (A↔Z, B↔Y, …) is all you need; memorize or keep a small reference.
- Only letters change; preserve spacing and punctuation.

Alphabet mirror (A→Z, …, M→N)
```
A Z
B Y
C X
D W
E V
F U
G R
H S
I T
J Q
K P
L O
M N
```

## Step-by-step solving workflow
1) Decode one short word to confirm (e.g., `GSV` should become `THE`).
2) Decode a few more words to ensure it’s consistent.
3) Apply the mirror to the full text.

## Worked example (full walk-through)
Ciphertext
```
GSV XLWV RH Z ORPV GSVIV.
```

1) `GSV` → `THE`.
2) XLWV → CODE; RH → IS; Z → A; ORPV → LIKE; GSVIV → THERE.
3) Full plaintext
```
THE CODE IS A LIKE THERE.
```
If a letter seems off, re-check mid-alphabet pairs like I↔R and J↔Q; these are easy to mix.

## Practice
1) Decode: `ZMW NVHHZT`  
2) Decode: `GSV XLILI ZMW GSV XOFHLM`  
3) Encode with Atbash: `HELLO WORLD`

### Answers
1) `AND SECRET`  
2) Depends on exact spelling; typical corrected reading: `THE CRUEL AND THE WOLF`  
3) `SVOOL DLIOW`

## Common mistakes
- Mixing up the middle pairs (I↔R, J↔Q).
- Changing spaces/punctuation (don’t; only letters change).
- Assuming a key—there is none; it’s a fixed mapping.

## Quick reference
- Use the A↔Z mirror table.
- `THE` ↔ `GSV`, `AND` ↔ `ZMW` are quick confirmation pairs.

## See also
- Caesar (shift), Affine (scale+shift), Random Aristocrat (arbitrary substitution).

