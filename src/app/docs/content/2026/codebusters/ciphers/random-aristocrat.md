# Random Aristocrat (Monoalphabetic Substitution with Spaces)

## What it is
A Random Aristocrat is a monoalphabetic substitution: each plaintext letter A–Z is consistently replaced by a unique ciphertext letter A–Z according to a random key (a permutation of the alphabet). Spaces and punctuation are preserved, so word boundaries, commas, apostrophes, and hyphens remain visible and provide strong pattern clues.

- One-to-one mapping: each plaintext letter maps to a unique ciphertext letter; no two plaintext letters share the same ciphertext letter.  
- Consistent across the message.  
- Preserved spacing/punctuation: makes pattern-driven solving highly effective.

## How decryption works
1) Maintain a mapping table C→P and ensure one-to-one consistency.  
2) Use patterns (A/I, THE/AND/OF/TO, apostrophes, -ING) to hypothesize letters.  
3) Fill the table as hypotheses are confirmed; propagate across the whole text.  
4) Iterate until the plaintext reads cleanly; validate by re-encrypting with the recovered mapping.

## English letter frequency (useful reference)
While quotes vary, English averages guide early guesses:

| Letter | %   | Letter | %   | Letter | %   |
|-------:|:---:|-------:|:---:|-------:|:---:|
| E      | 12.7| T      | 9.1 | A      | 8.2 |
| O      | 7.5 | I      | 7.0 | N      | 6.7 |
| S      | 6.3 | H      | 6.1 | R      | 6.0 |
| D      | 4.3 | L      | 4.0 | C      | 2.8 |
| U      | 2.8 | M      | 2.4 | W      | 2.4 |
| F      | 2.2 | G      | 2.0 | Y      | 2.0 |
| P      | 1.9 | B      | 1.5 | V      | 1.0 |
| K      | 0.8 | J      | 0.15| X      | 0.15|
| Q      | 0.10| Z      | 0.07|        |     |

Notes
- E is usually most common; T, A, O, I, N, S, H, R follow.  
- J, X, Q, Z are rare.  
- In short texts, frequencies are noisy—use as hints with pattern checks.

## Common words and patterns (high-value targets)
Single-letter words
- A, I are the only standard one-letter words.

Two-letter words (very common)
- OF, TO, IN, IT, IS, BE, AS, AT, SO, WE, HE, BY, OR, ON, DO, IF, ME, MY, UP, AN, GO, NO, US

Three-letter words (common)
- THE, AND, FOR, ARE, BUT, NOT, YOU, ALL, ANY, CAN, HAD, HER, WAS, ONE, OUR, OUT, DAY, GET, HAS, HIM, HIS, HOW, MAN, NEW, NOW, OLD, SEE, TWO, WAY, WHO, BOY, DID, ITS, LET, PUT, SAY, SHE, TOO, USE

Apostrophes (often preserved)
- Common: I’M, I’D, I’LL; DON’T, CAN’T, WON’T; IT’S; WE’RE; THEY’RE; YOU’RE; THERE’S

Word endings / morphology
- -ED, -ING, -ER, -LY, -S, -ES, -ION, -TION; final -E is frequent.

Double letters
- LL, EE, SS, OO, TT; also FF, RR, NN, PP, CC.

## Digrams and trigrams (helpful tables)
Frequent digrams
- TH, HE, IN, ER, AN, RE, ON, AT, EN, ND, TI, ES, OR, TE, OF, ED, IS, IT, AL, AR, ST, TO, NT, NG, SE

Frequent trigrams
- THE, AND, ING, HER, ERE, ENT, THA, NTH, WAS, ETH, FOR, DTH, ION, TIO, VER, TER, ATI, HES

Usage
- When ciphertext shows a repeating pair/triple, test whether a common English digram/trigram could fit without violating one-to-one mapping.

## Solving method (step-by-step)
1) Scan for easy wins: single-letter words (A/I); likely THE/AND/OF/TO/IN; mark hypotheses lightly and cross-check.  
2) Use frequency wisely: try E/T/A on the most frequent cipher letter; check digram fits (THE/HE/TH).  
3) Leverage word shapes: apostrophes, __ING/__ED, doubles; test across all occurrences.  
4) Build a partial key table: Plain (A–Z) on top, Cipher (A–Z) below; fill bijective pairs only.  
5) Iterate and propagate: more letters fixed → more words readable; eliminate contradictions; use elimination for remaining letters.  
6) Finalize and validate by re-encrypting.

## Pattern play (worked micro-examples)
Example 1: Single-letter word
- Cipher: `... X ...` standalone → test X→A or X→I. If preceding “AM” appears, X is likely I.

Example 2: THE detection
- Cipher `QWF` suspected THE → Q→T, W→H, F→E. Validate across other words where these letters occur.

Example 3: Apostrophe
- `B’N` in `… B’N READY` → likely I’M → B→I, N→M; confirm with other I’_ forms.

Example 4: -ING ending
- `PRCZG` recurring at word ends → hypothesize CZG→ING → C→I, Z→N, G→G; verify globally.

## Worked example (full decryption)
Cipher:
```
E A D C X V D C E
X J C
D A E X
U C G W X V K W T
F C A F T C
G I C
U C G W X V K W T T Q
U I A H C L.
```
Goal:
```
Sometimes the most beautiful people are beautifully broken. (Robert M. Drake)
```
Steps
- Map single-letter words; place THE/ARE/… where shapes fit; build consistent C→P table; propagate to full solution.

Decryption:
```
SOMETIMES THE MOST BEAUTIFUL PEOPLE ARE BEAUTIFULLY BROKEN.

(ROBERT M. DRAKE)
```

## Advanced techniques
- Maintain 2–3 parallel hypotheses until evidence decides; never merge conflicts.  
- Exploit repeated phrases across lines.  
- Thematic cribs (proper nouns, common quotes).  
- N-gram scoring for longer ciphers.

## Common mistakes
- Forcing a mapping that breaks elsewhere.  
- Violating one-to-one mapping.  
- Over-trusting frequency in very short texts.  
- Ignoring contractions and apostrophes.

## Quick reference
- Spaces/punctuation preserved → use patterns aggressively.  
- Start with A/I; THE/AND/OF/TO/IN; common digrams/trigrams.  
- Use a bijective mapping table; doubles suggest LL/EE/SS/OO/TT first.

## Practice exercises
1) Map single-letter words and fill likely THE/AND on the cipher:
```
JVF R QXO, QXO R JVF.
```
2) Solve this short Aristocrat using frequency, digrams, and apostrophes:
```
X’V RZQ TZX, Z’QV? RZQ TZX!
```
3) Longer practice (systematic mapping; author is a famous scientist):
```
LMK PLS’F SE PLS, YS PLS SL GYLMUG, ZS YS PLS SL XLMUG.
```

### Answers
- These are open-ended drills; verify your decryption by re-encrypting with your recovered C→P mapping. Aim for fluent English and zero mapping conflicts.  
- For (1), you should observe a symmetric phrase structure once common words are placed.  
- For (2) and (3), expect contractions and repeated clauses that help confirm your mapping.

## Further reading
- Classical monoalphabetic substitution techniques.  
- Common English wordlists and n-gram tables.

