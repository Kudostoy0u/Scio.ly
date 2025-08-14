## Overview
Teams cryptanalyze and decode messages using classic hand ciphers under strict time limits. Success depends on fast pattern recognition, strong mental arithmetic, systematic crib usage, and disciplined team coordination.

## Official References
- [SOINC Division B](https://www.soinc.org/codebusters-b)
- [SOINC Division C](https://www.soinc.org/codebusters-c)
- [SciOly Wiki – Codebusters](https://scioly.org/wiki/index.php/Codebusters)

## Event format and scoring
- First question: Timed Aristocrat (with spaces, no spelling errors). Submit as soon as solved; attempts before correct answer do not penalize. Typical timing bonus: `2 × (600 − seconds)`; 0 after 10 minutes.
- Remaining questions: mixture by difficulty and type. Close answers within 1–2 letters (excluding keyword/key phrase) may receive full or partial credit per current rules. After two errors, additional errors usually −100 each, not below 0 for that problem.
- Tiebreakers: designated problems in order (often the highest value), then degree of correctness and number attempted.

### Typical allowed materials (confirm annually)
- Up to three non‑programmable, Class I calculators
- No notes, no internet, no devices beyond calculators and writing utensils

## Team roles and workflow
- Substitution lead: Aristocrats/Patristocrats/Porta; frequency analysis; word shapes; contractions
- Math lead: Affine/Hill/cryptarithms; modular arithmetic; matrix operations
- Morse/Crib lead: Pollux/Morbit/Fractionated Morse/Columnar/Xenocrypt; mapping and crib placement
- All: Cross‑check mappings, read answers aloud before submission, and manage the timed first question

## Covered cipher types (2026)
- Monoalphabetic substitution (K1/K2/random)
- Aristocrats (spaced) and Patristocrats (unspaced)
- Misspelled Aristocrats (Division‑dependent)
- Baconian (A/B encodings via font/style/letters)
- Spanish Xenocrypt
- Pollux/Morbit (Morse encodings with partial digit mapping)
- Fractionated Morse (with ≥4‑letter crib)
- Cryptarithms (letter→digit puzzles; extract mapping word)
- Porta (keyed polyalphabetic; key usually given)
- Nihilist (Polybius + additive keyword; keys/cribs provided)
- Complete Columnar (≤9 columns; crib ≥ columns − 1)

Division B common adds: Caesar, Atbash, Affine (with given a, b).  
Division C common adds: K3 monoalphabetic, Hill 2×2 (encrypt/decrypt; 3×3 given decryption matrix when used).

---

## Solving playbook by cipher

### Cipher reference index (links to full guides)
Each link opens our in-depth, decryption-focused guide for that cipher. Divisions reflect what is typically used in practice selection for B vs C.

### Substitution (Aristocrats/Patristocrats)
- Single‑letter words: A, I (poetry may include O). Short words and triads: THE, AND, OF, TO, IN, THAT
- Frequency: ETAOIN SHRDLU; consider text length before over‑relying on frequency
- Contractions and apostrophes: 's, 't, 're, 've, 'll, 'm, 'd
- Doubled letters: LL, EE, SS, OO, TT; common bigrams: TH, HE, IN, ER, AN, RE, ED, ON, ES, ST
- Misspelled aristocrats: prioritize phonetics and grammar; common words usually spelled correctly

Worked micro‑example

| Ciphertext | …. …. …. …. |
|---|---|
| Pattern | 1‑2‑3 1‑4‑5 6‑7‑1 8‑3‑9 |

If the first word ends in a single letter, try A or I; test THE/AND patterns, then propagate.

### Baconian
- Partition tokens into two classes (A/B) based on visible property (e.g., font, capitalization, glyph, or letter set). Group five at a time, map 5‑bit groups to letters.
- Check variant: 24‑letter (I/J together, U/V together) vs 26‑letter. If decoding fails, flip A/B designation and retry.

Reference (26‑letter): A=AAAAA … Z=BBBBA. For 24‑letter, consult host’s mapping.

### Caesar / Atbash
- Caesar: try all 26 shifts; reject implausible English immediately. A quick scan of 3–4 letters usually narrows to 1–2 candidates.
- Atbash: mirror alphabet; encryption equals decryption (A↔Z, B↔Y, …).

### Affine
- Encryption: E(x) = (a·x + b) mod 26, with a ∈ {1,3,5,7,9,11,15,17,19,21,23,25}
- Decryption: D(y) = a⁻¹·(y − b) mod 26
- Cryptanalysis with crib: form two equations from paired plaintext/cipher letters, solve for a, b mod 26

Affine inverses (mod 26)

| a | a⁻¹ | a | a⁻¹ |
|---:|---:|---:|---:|
| 1 | 1 | 15 | 7 |
| 3 | 9 | 17 | 23 |
| 5 | 21 | 19 | 11 |
| 7 | 15 | 21 | 5 |
| 9 | 3 | 23 | 17 |
| 11 | 19 | 25 | 25 |

### Porta
- 13 paired alphabets; each key letter selects a fixed substitution pair (period‑2 effect). For plaintext P and key K: map using the alphabet row indexed by K’s pair (AB, CD, …, YZ).
- Practical: pre‑write the 13 row pairs or use a compact table; slide the key over text; decode letter‑by‑letter.

### Nihilist
- Construct Polybius square (usually 5×5 with I/J together) from keyword 1, fill remaining letters. Convert plaintext/cipher to numbers. Add keyword 2 (digit‑wise, mod 10 or 100 depending on format).
- With crib ≤ keyword length: align crib, subtract to recover square indices and infer keys.

### Complete Columnar
- Choose column count ≤ 9; write ciphertext by columns, read by rows after permuting columns by key order. With crib ≥ columns − 1, place crib across rows to test column orders quickly.
- Heuristics: try column counts that divide length; check short words crossing column boundaries.

### Fractionated Morse
- Convert digits/symbols to Morse with separators; group into triads; map via key table to letters. A ≥4‑letter crib anchors the triad stream to recover the key ordering.
- Enforce separator rules and plausible Morse sequences; propagate from short words.

### Pollux / Morbit
- Replace known digits with •/–/separators. Constraints: at most two separators in a row; Pollux cannot end with a separator; no letter has more than five Morse elements.
- Use word‑length patterns and tiny dictionaries (OF, TO, THE, AND) to confirm placements; backfill digit→symbol mapping.

### Xenocrypt (Spanish)
- Normalize accents; include ñ. Frequencies and anchors: DE, LA, QUE, EL, EN, LOS, LAS, DEL, POR, CON. Grammar (articles/adjective agreement) prunes false fits.

### Hill (Div C)
- 2×2 matrices over mod 26. Decrypt via E⁻¹ = det(E)⁻¹·adj(E) (mod 26). Confirm det(E) is coprime to 26. For 3×3, a decryption matrix is provided when used.

Hill 2×2 mini-reference
- det = a·d − b·c (mod 26); det inverse via affine inverse table; adj(E) = [[d, −b], [−c, a]] (mod 26)
- Multiply matrices with letters as 0–25 (A=0 … Z=25); wrap negatives into 0–25

### Cryptarithms
- Map letters→digits respecting leading‑zero rules and columnar addition with carries. Start with columns that force carry/no‑carry outcomes (0/9/10 patterns). Extract the required keyword from the mapping.

---

## The timed first question
- Pre‑assign roles; one person writes an alphabet line and fills common patterns (THE/AND/OF) immediately.
- Read the solution aloud; confirm spelling and punctuation; submit instantly. There’s no penalty for pre‑solve attempts until correct.

## Weekly drills (suggested)
- 1 timed Aristocrat; 2 substitutions (incl. 1 Patristocrat)
- 1 math cipher (Affine/Hill)
- 1 transposition (Columnar)
- 1 Morse (Pollux/Morbit)
- 1 cribbed polyalphabetic (Porta/Nihilist/Fractionated Morse)
- 1 specialty (Xenocrypt or cryptarithm)
Track average times and error types.

## Compact reference contents
- EN/ES frequencies; contractions and common trigrams
- Affine inverse table; mod‑26 arithmetic tips; gcd shortcuts
- Hill 2×2: determinant, adjugate formulas; inverses mod 26
- Morse chart; Pollux/Morbit separator rules
- Porta paired alphabets; Nihilist Polybius layout
- Columnar grid templates and crib placement checklist

## Worked mini‑examples

### Affine decrypt (a=21, b=14)
Given Y → P: x = a⁻¹·(y − b) = 5·(24 − 14) ≡ 5·10 ≡ 50 ≡ 24 ≡ Y → maps to Y (self‑check). Use table above for a⁻¹.

### Columnar with crib
Try 7–9 columns first; place crib across rows. If a letter must appear in two columns simultaneously, that key ordering is impossible.

### Pollux constraint
If the last symbol is a separator, contradiction: Pollux cannot end with a separator. Adjust digit→symbol mapping.

## Deep dives
### Porta quick table patterning
- Pre-write the 13 alphabet pairs (AB, CD, …, YZ) and note repeating columns; train to read mappings without constructing full tableau under pressure.

### Columnar brute-force strategy
- For ≤9 columns with a crib ≥ columns−1, enumerate column counts first, then use the crib to prune permutations. Keep a grid template and mark contradictions rapidly.

### Fractionated Morse key recovery
- With a ≥4-letter crib, align Morse triads and infer key ordering by consistent triad-to-letter mappings; enforce separator constraints to prune.

### Hill pitfalls
- Confirm that det(E) is coprime to 26; if not invertible, error in problem setup or intended decryption-only with provided inverse.

### Xenocrypt grammar heuristics
- Articles/adjectives must agree in gender/number (el/la/los/las; buen/buena); verbs conjugate per subject; use these to eliminate false plaintexts.

### Worked cipher walkthrough (Porta example)
Cipher: UJXWZ … with key SCIOLY.  
1) Write paired alphabets; align with SCIOLY repeating.  
2) Decode letter-by-letter; spot probable THE/AND patterns to validate key alignment.  
3) If mismatch persists, re-check alphabet rows and ensure A=0 mapping.

## Pitfalls
- Anchoring on an early wrong guess
- Ignoring Morse/separator constraints
- Modular arithmetic slips (especially negative mods)
- Over‑reliance on frequency in short texts

## Practice prompts
- Timed Aristocrat (10‑minute bonus window)
- Patristocrat with crib “TODAY”
- Affine: encrypt a=5, b=8; decrypt a=21, b=14
- Porta decrypt with key “SCIOLY”
- Columnar decrypt (8 columns) with 7‑letter crib
- Nihilist decrypt with two keys and a short crib
- Pollux with four unknown digits; Morbit partial map
- Spanish Xenocrypt with DE/LA/QUE anchors

## Helpful links and tools
- Use the in‑site practice tool: [/codebusters](/codebusters) for live cipher drills
- Past tests and writeups on the SciOly forums/wiki

## Tournament checklist
- Three Class I calculators + spare batteries
- Pencils/pens, scratch paper
- Pre‑discussed timing plan and submission protocol

---

Contribute corrections, worked examples, and updated clarifications for 2026.
