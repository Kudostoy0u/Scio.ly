# Random Aristocrat (Monoalphabetic Substitution with Spaces)

## Explanation
A Random Aristocrat is a monoalphabetic substitution cipher: each plaintext letter A–Z is consistently replaced by a unique ciphertext letter A–Z according to a random key (a permutation of the alphabet). Crucially, spaces and punctuation are preserved. Case is typically normalized to uppercase. Numbers may appear as-is or be removed depending on the source, but in Codebusters-style puzzles the letters and spacing generally remain visible, which provides important pattern clues.

- One-to-one mapping: each plaintext letter maps to a unique ciphertext letter; no two plaintext letters share the same ciphertext letter.
- Consistency: the same plaintext letter always encrypts to the same ciphertext letter throughout the message.
- Preserved spacing/punctuation: word boundaries, commas, apostrophes, hyphens often remain, providing strong pattern information.
- Language-driven: since it’s a substitution, English frequency and word patterns are very informative for recovery.

What this means in practice
- You can deduce letters by analyzing single-letter words, common digrams/trigrams, letter frequencies, and word shapes.
- Once you assign a few high-confidence letters (like E, T, A), you can propagate constraints and fill more of the mapping quickly.
- A correct mapping never contradicts itself: a letter can’t map to two different letters, and two letters can’t map to the same letter.

## How Decryption Works
1) Maintain a mapping table C→P (cipher to plain) and ensure one-to-one consistency.  
2) Use patterns (A/I, THE/AND/OF/TO, apostrophes, -ING) to hypothesize letters.  
3) Fill the table as hypotheses are confirmed; propagate across the whole text.  
4) Continue until the plaintext reads cleanly.

Because the key is consistent across the entire text, a single correct mapping instance works everywhere.

## English Letter Frequency (Useful Reference)
While individual quotes may deviate, English averages guide early guesses. Frequencies below are typical rounded values:

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
- E is usually the most common letter. T, A, O, I, N, S, H, R follow closely.
- J, X, Q, Z are rare.
- In short texts (like quotes), frequencies may be noisy. Use them as hints, not absolute rules.

## Common Words and Patterns (High-Value Targets)
Single-letter words
- A, I are the only standard one-letter words.
- If you see a single-letter ciphertext word like “X”, it’s very likely A or I. Check context to decide.

Two-letter words (very common)
- OF, TO, IN, IT, IS, BE, AS, AT, SO, WE, HE, BY, OR, ON, DO, IF, ME, MY, UP, AN, GO, NO, US
- High-frequency digrams: TH, HE, IN, ER, AN, RE, ON, AT, EN, ND

Three-letter words (common)
- THE, AND, FOR, ARE, BUT, NOT, YOU, ALL, ANY, CAN, HAD, HER, WAS, ONE, OUR, OUT, DAY, GET, HAS, HIM, HIS, HOW, MAN, NEW, NOW, OLD, SEE, TWO, WAY, WHO, BOY, DID, ITS, LET, PUT, SAY, SHE, TOO, USE

Articles and function words
- THE, A, AN, OF, TO, IN, IS, IT, AS, AT, BY, BE, HE, WE, OR, ON, DO, IF, ME, MY

Apostrophes (often preserved)
- Common forms: I'S (I'M, I’D, I’LL), DON’T, CAN’T, WON’T, IT’S, WE’RE, THEY’RE, YOU’RE, THERE’S
- Patterns like `X’Y` or `X’S` are strong clues. For example, a three-letter word with a middle apostrophe often maps to I’M or I’D.

Word endings / morphology
- -ED (past tense), -ING (gerund), -ER, -LY, -S, -ES, -ION, -TION
- Final -E is frequent; silent -E endings are common in English.

Double letters
- The most common double letters: LL, EE, SS, OO, TT; also FF, RR, NN, PP, CC.
- If you see a doubled ciphertext letter in a word shape like “BXXK”, candidates include BOOK, FEEL, HELL, MEET, NEED, POOL, etc.

## Digrams and Trigrams (Helpful Tables)
Frequent digrams
- TH, HE, IN, ER, AN, RE, ON, AT, EN, ND, TI, ES, OR, TE, OF, ED, IS, IT, AL, AR, ST, TO, NT, NG, SE

Frequent trigrams
- THE, AND, ING, HER, ERE, ENT, THA, NTH, WAS, ETH, FOR, DTH, ION, TIO, VER, TER, ATI, HES

Usage
- When a ciphertext shows a repeating pair/triple, test whether a common English digram/trigram could fit without violating the one-to-one mapping constraint.

## Solving Method (Step-by-Step)
1) Scan for the easiest wins
- Find single-letter words → map to A or I by context.
- Identify likely THE, AND, OF, TO, IN from short word positions and common patterns.
- Mark these hypotheses lightly (pencil in) and verify against other instances.

2) Use frequency analysis wisely
- Note the most frequent ciphertext letter(s). Try E or T/A/S/H.
- Cross-check with digram/trigram candidates. If top-frequency letter pairs well with others to form THE/HE/TH, your guess strengthens.

3) Leverage word shapes
- Look for patterns like `_’_` (apostrophes), `__ING`, `__ED`, double letters, and common suffixes/prefixes.
- Use cross-checking across the text: a guessed letter must work everywhere.

4) Build a partial key table
- Create a two-row mapping table with Plain (A–Z) on top and Cipher (A–Z) below.
- Each confident guess fills exactly one cell pair (e.g., PLAIN E → CIPHER X).
- Avoid conflicts: if cipher X is already assigned to a different plain letter, your guess is wrong.

5) Iterate: propagate and confirm
- As more letters are fixed, more words become readable.
- Confirm/refute tentative mappings by checking other occurrences.
- Use process of elimination when only a few letters remain unassigned.

6) Finalize
- Once all letters in the message are consistent and readable, you have the full decryption and the full key (or at least the portion used).

## Pattern Play (Worked Micro-Examples)
Example 1: Single-letter word
- Cipher: `... X ...` as a standalone word.
- Try X→A or X→I. If adjacent words suggest a pronoun or start of a sentence (“X AM”), X is likely I.

Example 2: THE detection
- Suppose a three-letter word appears very frequently and the middle letter repeats in many words. Try mapping it to THE.
- If cipher `QWF` is candidate THE, then Q→T, W→H, F→E. Check other instances: do `Q_` followed by common vowels appear as T + vowel? Does `F` behave like E in common endings?

Example 3: Apostrophe
- Cipher: `B’N` in context `I THINK B’N READY`. Likely “I’M” in plaintext, so B→I, N→M (or vice versa if casing differs), and `’` is literal. Confirm with other “I’_” forms.

Example 4: -ING ending
- Cipher word `PRCZG`: last three letters `CZG` repeat in other words of length ≥4; hypothesize `CZG` → ING. Map C→I, Z→N, G→G. Verify consistency across text.

## Worked example (full decryption)
Cipher (grouped per word lines for readability):
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

Step 1: Single-letter words and common function words
- Single-letter words likely A or I → here we see standalone `X` and `C`. Try X→A, C→I (or vice versa) and test both paths against other words.
- Short words like “THE”, “ARE”, “THEM”, “YOU”, “WE” emerge from patterns across lines; use cross-checking to settle A/I roles.

Step 2: Build mapping C→P progressively
- From consistent pattern fits (three-letter “THE”, frequent endings, repeated phrase `U C G W X V K W T`), a coherent mapping emerges without contradictions.

Step 3: Decrypt fully with the completed mapping
```
SOMETIMES THE MOST BEAUTIFUL PEOPLE ARE BEAUTIFULLY BROKEN.

(ROBERT M. DRAKE)
```
Notes
- Spaces and punctuation are preserved in Aristocrats; only letters are substituted.
- Validate by re-encrypting the plaintext using your recovered mapping to ensure one-to-one consistency.

## Advanced Techniques
- Multiple hypotheses: Keep 2–3 plausible mappings in parallel until more evidence arrives; just ensure you never merge conflicting assignments.
- Cross-line repeats: If the quote repeats a distinctive word/phrase in different places, force consistency across appearances.
- Thematic cribs: Codebusters quotes are often from well-known figures; if a proper noun appears (e.g., “SCIENCE”), its structure can be distinctive.
- Letter distribution by position: Initial letters of sentences are often capitals in plaintext; in all-caps normalizations, look for grammar cues like short connective words after punctuation.
- Hill-climb/heuristics (optional): For long ciphers, you can score a candidate key by English fitness (bigrams/trigrams) and iterate improvements. Overkill for short quotes, but instructive.

## Common Mistakes
- Forcing a mapping to fit one word while it breaks many others.
- Ignoring the one-to-one rule (two plaintext letters mapping to the same cipher letter).
- Over-trusting raw frequency in very short texts.
- Forgetting contractions and apostrophes as strong clues.
- Not revisiting early guesses when contradictions pile up.

## Quick Reference
- Random Aristocrat = monoalphabetic substitution; spaces/punctuation preserved.
- Start with: single-letter words (A/I), THE/AND/OF/TO/IN, common digrams/trigrams.
- Use a mapping table and never allow duplicate targets.
- Double letters suggest LL/EE/SS/OO/TT first.

Mini table: likely quick mappings
- Most frequent cipher letter → try E (verify with THE/HE/RE/ER).
- Repeated 3-letter word → THE/AND/NOT/YOU/ONE/ALL/ARE/HER/HIS.
- Word ending with three letters repeating across text → test ING/ION/ENT/EST/ERS/IES.

## Practice Exercises
1) Map single-letter words and fill likely THE/AND on the cipher:
```
JVF R QXO, QXO R JVF.
```

2) Solve this short Aristocrat using frequency, digrams, and apostrophes:
```
X’V RZQ TZX, Z’QV? RZQ TZX!
```

3) Longer practice (try systematic mapping; author is a famous scientist):
```
LMK PLS’F SE PLS, YS PLS SL GYLMUG, ZS YS PLS SL XLMUG.
```

Verify your final solution by re-encrypting plaintext with your recovered key.

## FAQ
Q: How is Random Aristocrat different from Patristocrat?
A: Patristocrat removes spaces and punctuation, making pattern spotting harder. Aristocrat preserves them, which greatly aids solving.

Q: Is frequency analysis always reliable?
A: It’s a guide, not a guarantee. Short texts can be misleading. Combine frequencies with word patterns and consistency checks.

Q: Can a letter map to itself?
A: Yes, a random key could leave some letters fixed (e.g., E→E). Don’t assume self-maps, but allow them if consistent.

Q: What about numbers?
A: Usually left as-is or removed; follow the specific puzzle’s instructions.

## Pseudocode (Solving Skeleton)
```text
given ciphertext:
  normalize to A–Z, keep spaces/punct

mappingPlainToCipher  = {}  // P→C
mappingCipherToPlain  = {}  // C→P

function assign(p, c):
  if p in mappingPlainToCipher and mappingPlainToCipher[p] != c: return false
  if c in mappingCipherToPlain and mappingCipherToPlain[c] != p: return false
  mappingPlainToCipher[p] = c
  mappingCipherToPlain[c] = p
  return true

// strategy loop
while unresolved letters remain:
  apply single-letter word rules (A/I)
  try THE/AND/OF/TO/IN cribs where shapes fit
  use digram/trigram matches to propose assignments
  propagate constraints; remove contradictions
  backtrack if conflicts arise

derive full key from mappingCipherToPlain
decrypt by substituting each cipher char via mappingCipherToPlain
```

## Further Reading
- Monoalphabetic substitution techniques in classical cryptography texts.
- Wordlists of common two/three-letter English words.
- Letter/digram/trigram frequency tables for English.

