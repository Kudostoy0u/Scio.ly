# Caesar Cipher

## What it is
- Every letter is shifted the same number of places through A–Z with wrap-around. Spaces and punctuation stay the same.
- Example (k=3 forward): A→D, B→E, C→F; decode reverses the shift by k.
- Hand rule for decode: rotate each letter backward by k; A backward 1 becomes Z, B backward 2 becomes Z, etc.

## Key facts you need
- Only 25 nontrivial shifts; you can try them all quickly.
- Keep spaces/punctuation as-is; only rotate letters A–Z.
- Clues: English has common short words (THE, AND, OF, TO) and E/T/A/O/N frequent; doubles like LL, EE, OO help confirm.

## Step-by-step solving workflow
1) Look for single-letter words. If you see `X`, test shifts that map `X→A` and `X→I` first.
2) Try candidate shifts on 1–2 short words to see if they become English.
3) Once a shift produces real words, apply it to the whole text and sanity-check the sentence.

## Worked example (full walk-through)
Ciphertext
```
P EXTRT DU XPEEXCTHH HWDJAS CTKTG QT IPZTC PH SJT.
```

1) Single-letter word `P` → test k=15 (P→A) or k=17 (P→I). Start with k=15.

2) Test a few words with k=15 (shift letters 15 backward)
- `IPZTC` → I→T, P→A, Z→K, T→E, C→N → "TAKEN"
- `PH` → P→A, H→S → "AS"
- Looks promising; keep k=15.

3) Apply k=15 to all letters
```
A PIECE OF HAPPINESS SHOULD NEVER BE TAKEN AS DUE.
```
Everything is clean English; k=15 is correct.

## Practice
1) Decrypt with k=7 backward: `ZOLSSZ`  
2) Try mapping the single-letter word `V` to A first; decode: `V DVYYL`  
3) Try all shifts quickly for: `URYYB JBEYQ` (hint: standard ROT)

### Answers
1) `SCHOOL`  
2) With k=21 (V→A): `I HELLO` (short sample can be ambiguous; use more context in real problems)  
3) With k=13 (ROT13): `HELLO WORLD`

## Common mistakes
- Forgetting wrap-around (A backward 1 becomes Z).
- Changing spaces/punctuation; only rotate letters.
- Not testing A/I for single-letter words early.

## Quick reference
- Try single-letter words → A or I → test those shifts first.
- If unclear, scan for THE/AND/OF, or run through all 25 shifts.
- Keep non-letters unchanged; apply one global shift.

## See also
- Affine (generalizes Caesar), Atbash (a specific mirror mapping), Random Aristocrat (variable mapping).

