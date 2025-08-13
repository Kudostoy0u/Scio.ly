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

## How It Works (Encryption/Decryption)
Encryption
1) Generate a random key: a permutation of A..Z (e.g., Plain: ABCDEFGHIJKLMNOPQRSTUVWXYZ → Cipher: QWERTYUIOPASDFGHJKLZXCVBNM).
2) Replace each plaintext letter by its ciphertext counterpart using the key.
3) Leave spaces and punctuation unchanged (unless instructions say otherwise).

Decryption
1) Invert the key (e.g., if P→C encrypts, then C→P decrypts).
2) Replace each ciphertext letter using the inverse mapping.
3) Spaces/punctuation pass through unchanged.

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

## Worked Example (Full Walkthrough)
Ciphertext
```
QZK XQ BQF, QZK XQ BQF; UZ QZK XQ BQF.
```
Observation
- Short repeated phrase `QZK XQ BQF` appears three times → good crib candidate.
- Pattern: `3-2-3` letters with spaces and punctuation preserved.

Hypothesis: “THE TO END” style? Try high-frequency words of 3-2-3 length: THE TO MAN, THE IN END, YOU TO SEE, etc.
Test “YOU TO SEE” (common, fits pronoun + TO + verb):
- QZK → YOU → Q→Y, Z→O, K→U
- XQ → TO → X→T, Q→O (but Q already → Y from YOU).

Contradiction: Q already mapped to Y; can’t also map to O. Discard “YOU TO SEE”.

Try “THE TO END”:
- QZK → THE → Q→T, Z→H, K→E
- XQ  → TO  → X→T, Q→O (contradiction again: Q can’t be both T and O). Discard.

Try “YOU WE YOU” (structure fits 3-2-3, though odd):
- QZK → YOU → Q→Y, Z→O, K→U
- XQ  → WE  → X→W, Q→E (Q mapped to Y earlier, contradiction). Discard.

Try “ALL IS ALL” (common proverb shape):
- QZK → ALL → Q→A, Z→L, K→L
- XQ  → IS  → X→I, Q→S (but Q→A already). Discard.

Try “MEN AT MEN” (still odd):
Better approach: Frequency within the phrase: `Q` appears 3× as first letter. Common first letters for 3-letter words include T, A, I, O, W, Y. Consider “TIS ** TIS; ** TIS” antiquated? Unlikely.

Alternate approach: guess repeated 3-letter word is “ALL”, “THE”, “YOU”, “NOT”, “MAN”, “SHE”, “HER”. Check punctuation variant `, ;` suggests a rhetorical repetition like “X and X; so X.” Another common triplet is “ONE” or “ANY”.

Try “ONE BY ONE” (3-2-3 and a classic rhetorical form):
- QZK → ONE → Q→O, Z→N, K→E
- XQ  → BY  → X→B, Q→Y (fits; Q→O already, contradiction). Discard.

Try “EYE TO EYE” (proverb):
- QZK → EYE → Q→E, Z→Y, K→E (consistent inside word)
- XQ  → TO  → X→T, Q→O (contradiction again: Q can’t be E and O). Discard.

Try “NOW OR NOW”:
- QZK → NOW → Q→N, Z→O, K→W
- XQ  → OR  → X→O, Q→R (Q already N). Discard.

At this point, consider systematic search: list common 3-2-3 idioms. Another classic is “MAN TO MAN”. Test it:
- QZK → MAN → Q→M, Z→A, K→N
- XQ  → TO  → X→T, Q→O (Q already M). Discard.

Try “WAR IS WAR”:
- QZK → WAR → Q→W, Z→A, K→R
- XQ  → IS  → X→I, Q→S (Q already W). Discard.

Try “ALL IS ALL”: already failed. Consider “FUN IS FUN”, “ART IS ART”, “LAW IS LAW”. Try “LAW IS LAW”:
- QZK → LAW → Q→L, Z→A, K→W
- XQ  → IS  → X→I, Q→S (Q already L). Discard.

Try “EVE IS EVE”:
- QZK → EVE → Q→E, Z→V, K→E
- XQ  → IS  → X→I, Q→S (Q already E). Discard.

When guesses stall, pivot: look at the final clause `UZ QZK XQ BQF.` — the leading `UZ` could be “SO”, “AS”, “IF”, “IN”, “WE”, “BE”, “BY”, etc. If `UZ=SO`, then U→S, Z→O. That gives `QZK` → Q O/E? Wait we had Z→O → `QOK`. Does “QOK” fit common 3-letter words? Maybe “YOU” if Q→Y and K→U, but then Z→O means O in the middle, okay “YOU”. Then `XQ` must be “TO” (X→T, Q→O). Consistent with `UZ=SO`? U→S, Z→O is fine.

Let’s adopt: U→S, Z→O. Then `QZK` = Q O K. Try “YOU”: Q→Y, K→U.
`XQ` then “TO”: X→T, Q→O (but Q→Y just set). Contradiction.

Try `UZ=AS` (U→A, Z→S). Then `QZK` = Q S K. Try “THE”: Q→T, S→H, K→E. That sets Z→S conflicts later? Z maps to S (cipher→plain), that’s okay if unique.

Check full phrase with these tentative mappings:
`QZK XQ BQF, QZK XQ BQF; UZ QZK XQ BQF.` → “THE TO ?E?, THE TO ?E?; AS THE TO ?E?”.
`BQF` with our partial mapping has B→?, Q→T, F→? → “?T?”. Common 3-letter words ending T? include “GET”, “SET”, “LET”, “MET”, “BET”. After “THE TO ___” a verb like “GET/SET/LET/SEE” fits; SEE maps ? T ? incorrectly, so not SEE. “LET” fits pattern _ E T (middle E), but we have ? T ? (T middle). So try “SET”: S E T → cipher must be B Q F → B→S, Q→E (but Q→T from THE). Contradiction.

This example demonstrates how to systematically try candidates, enforce one-to-one mapping, and abandon paths quickly upon contradiction. Real solves often pivot earlier to other clues (double letters, different word positions) and come back once more letters are fixed.

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

