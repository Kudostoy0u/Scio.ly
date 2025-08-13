# Caesar Cipher

## What it is (brief)
Each plaintext letter is rotated by a fixed shift within the 26-letter alphabet. For solving, we reverse that rotation by the same shift to recover the plaintext. Only letter characters are shifted; spaces and punctuation remain where they are.

## Decryption strategy
- Try all 25 possible shifts (1–25) or quickly narrow using clues:
  - Single-letter words must be A or I. If the ciphertext has a single-letter word like `P`, test shifts that map `P → A` or `P → I`.
  - Look for common short words (THE, AND, OF, TO, BE, AS, AT, IS) and double letters (LL, EE, SS, OO, TT, RR).
  - Verify by partially decoding a few words; if they become meaningful, apply that shift to the whole text.
- Formal decryption rule (letters only): rotate each letter backward by k positions (k is the shift). A backward shift wraps around (e.g., A backward 1 becomes Z).

## Worked example (step-by-step)
Ciphertext:
```
P EXTRT DU XPEEXCTHH HWDJAS CTKTG QT IPZTC PH SJT.
```

Target: recover the plaintext by finding the correct shift and applying it.

1) Quick clues from the ciphertext
- There is a single-letter word `P`. In English, single-letter words are A or I.
  - If `P → A`, the shift is 15 backward (because P is 15 letters after A).
  - If `P → I`, the shift is 17 backward (P is 17 after I).
- We will test k = 15 first.

2) Test k = 15 on a few words
- Decode `IPZTC` by shifting each letter 15 backward:
  - I → T, P → A, Z → K, T → E, C → N → "TAKEN"
- Decode `PH` similarly: P → A, H → S → "AS"
- These look like valid English words, so keep k = 15.

3) Apply k = 15 to the entire ciphertext
Decoding every letter 15 backward (keeping spaces/punctuation) yields:
```
A PIECE OF HAPPINESS SHOULD NEVER BE TAKEN AS DUE.
```

4) Sanity checks and why k = 15 is consistent
- The initial `P` became `A`, matching the A/I rule for single-letter words.
- Multiple common words appear: PIECE, OF, SHOULD, NEVER, BE, TAKEN, AS, DUE.
- The result is fluent English throughout, confirming the shift.

## Tips and pitfalls
- If no immediate clue appears, scan for short words and try those shifts first before brute-forcing all 25.
- Double letters in ciphertext often indicate common doubles in English (LL, EE, SS, OO, TT, RR). Use them as anchors.
- Preserve spaces and punctuation during decryption; only rotate letters A–Z.
- Case does not matter for solving; maintain original case if you care about presentation after solving.

