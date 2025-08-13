# Xenocrypt (Spanish Random Aristocrat)

## Explanation
In Science Olympiad Codebusters, a Xenocrypt is a Random Aristocrat in Spanish: a monoalphabetic substitution cipher with a random alphabet key applied to Spanish plaintext. Spaces and punctuation are preserved. Accented characters are normalized to unaccented forms, and ñ is normalized to N.

Key points
- Random monoalphabetic substitution (one-to-one mapping A–Z).
- Preserved spacing/punctuation (word boundaries visible).
- Spanish text: apply Spanish letter frequencies and common word patterns.
- Normalize accented characters: á→A, é→E, í→I, ó→O, ú→U, ü→U; ñ→N.

What this means in practice
- Solve like an English Aristocrat but use Spanish frequency and vocabulary.
- Single-letter words are rare; focus on articles/prepositions/conjunctions.

## How Decryption Works
1) Normalize accents mentally (á→A, …; ñ→N) when testing cribs.  
2) Build a cipher→plain mapping using Spanish cribs (QUE/DE/CON/POR/LOS/LAS/UNA/ES/EST).  
3) Enforce one-to-one consistency and propagate across the whole text.  
4) Iterate with frequency and morphology cues (-CION, -IDAD, -MENTE) until fluent Spanish appears.

Because the mapping is consistent, one correct letter guess propagates everywhere.

## Spanish Letter Frequency (Useful Reference)
Typical Spanish letter frequency (approximate):

| Letra | %   | Letra | %   | Letra | %   |
|------:|:---:|------:|:---:|------:|:---:|
| E     | 13.7| A     | 12.5| O     | 8.7 |
| S     | 7.9 | N     | 7.0 | R     | 6.9 |
| I     | 6.3 | L     | 5.2 | D     | 5.0 |
| T     | 4.6 | C     | 4.4 | U     | 4.0 |
| M     | 3.2 | P     | 2.9 | B     | 1.5 |
| G     | 1.3 | V     | 1.1 | Y     | 1.0 |
| Q     | 0.9 | H     | 0.7 | F     | 0.7 |
| Z     | 0.5 | J     | 0.4 | Ñ/K/W/X (rare) |

Notes
- E, A, O dominate; S, N, R also common.
- Q almost always followed by U (QU) in modern orthography.
- H is often silent; common in CH, TH (loanwords).

## High-Value Spanish Words and Patterns
Articles and determiners
- EL, LA, LOS, LAS, UN, UNA, UNOS, UNAS, LO
Prepositions
- DE, A, EN, POR, PARA, CON, SIN, SOBRE, HASTA, ENTRE
Conjunctions/pronouns
- Y, O, QUE, COMO, SI, PERO, MAS, ES, ESTA, ESTE, ESA, ESE
Common verbs (present/infinitives)
- ES, SON, SER, ESTAR, HAY, HABER; -AR/-ER/-IR endings (AMAR, COMER, VIVIR)
Common bigrams/trigrams
- QUE, DEL, CON, POR, UNA, LOS, LAS, EST, ENT, RES, CIO, ION

Word endings
- -CION (from -CIÓN), -IDAD, -ENTE/-ANTE, -AR/-ER/-IR, -ADO/-IDO, -MENTE, -OS/-AS plural, -O/-A gendered singular.

Double letters
- LL, RR within words; also CC in ACCION.

## Digrams and Trigrams (Spanish)
Frequent digrams
- DE, EN, LA, EL, UE (from QUE), ES, OS, AS, CI, IO, RE, RA, AN, ON

Frequent trigrams
- QUE, DEL, CON, POR, LOS, LAS, UNA, EST, ENT, ION, CIO, ADO, ARA

Usage
- When a ciphertext shows repeating pairs/triples, test Spanish candidates; ensure consistency with one-to-one mapping.

## Solving Method (Step-by-Step)
1) Normalize accents (mentally or in notes)
- á→A, é→E, í→I, ó→O, ú→U, ü→U; ñ→N. Work with A–Z.

2) Identify high-value words
- Scan for QUE, DEL, CON, POR, LOS, LAS, UNA. Try mappings and validate across multiple appearances.

3) Use frequency intelligently
- The most frequent cipher letter may be E or A; cross-check with bigrams/trigrams and likely QUE.

4) Build mapping table
- Maintain Plain↔Cipher consistency; avoid conflicts.

5) Iterate and confirm
- Resolve contradictions promptly; revise weak guesses.
- Use morphology (-CION/-IDAD/-MENTE) to extend partial matches.

6) Finalize
- When text reads fluent Spanish (normalized), you have the full mapping.

## Pattern Play (Worked Micro-Examples)
Example 1: QUE detection
- A frequent 3-letter ciphertext cluster is an excellent QUE candidate. Mapping it forces Q→cipherX, U→cipherY, E→cipherZ; validate in QUI, QUIEN, etc.

Example 2: Articles
- Two/three-letter words frequently at starts: EL, LA, LOS, LAS, UN, UNA. Test and check for gender/number agreement (-O/-A; -OS/-AS) nearby.

Example 3: -CION ending
- Cipher words ending with a recurring 4-letter motif may map to CION. Pin C, I, O, N and propagate.

## Worked Example (Full Walkthrough)
Ciphertext
```
WN FRWWRIN VRGRQR RE WNSAHN VGRB RX AETBGPNW RE RW NGPR
```

Target plaintext
```
LA BELLEZA PERECE EN LA VIDA, PERO ES INMORTAL EN EL ARTE. (Leonardo Da Vinci)
```

Step 1: High-value words and structure
- The phrase structure suggests a comma in the Spanish original; function words like LA/EN/EL/ES are likely.  
- Single-letter words are rare; focus on two-letter determiners EL/LA and prepositions EN.

Step 2: Build mapping with cribs
- Try mapping patterns for LA, EN, EL, ES across the text; check one-to-one consistency.  
- As consistent pairs accumulate (e.g., L→W, A→N for an instance of LA, etc.), propagate throughout to reveal BELLEZA, PERECE, VIDA, PERO, INMORTAL, ARTE.

Step 3: Complete decryption
```
LA BELLEZA PERECE EN LA VIDA, PERO ES INMORTAL EN EL ARTE.
```
Add attribution and normalize accents in the final rendering if desired.

## Advanced Techniques
- Thematic cribs: Function words and Latin-rooted nouns/adjectives; leverage -CION, -MENTE, -IDAD.
- Position cues: Articles before nouns (EL/LA/LOS/LAS) and agreement provide constraints (-O/-A; -OS/-AS).
- Proper nouns: Spanish names (JUAN, MARIA) can be distinctive.

## Common Mistakes
- Forgetting to normalize accents and ñ/ü.
- Applying English frequency blindly.
- Violating one-to-one mapping to fit a single word.
- Ignoring gender/number agreement.

## Quick Reference
- Xenocrypt = Spanish Random Aristocrat (random alphabet; spaces preserved).
- Normalize accents (áéíóúü→AEIOUU; ñ→N).
- High-value cribs: QUE, DE(L), CON, POR, LOS/LAS, UNA/UNO, ES, EST.
- Validate mapping with morphology and agreement.

Mini mapping tips
- Very frequent 3-letter → QUE.
- Q almost always followed by U.
- Common suffixes: -CION, -IDAD, -MENTE; endings -OS/-AS, -O/-A.

## Practice Exercises
1) Identify and map QUE from a Spanish xenocrypt and extend to DE/DEL.
2) Given a ciphertext ending with “… CION”, determine C, I, O, N and propagate.
3) Map articles (EL/LA/LOS/LAS) and check adjectives for -O/-A agreement.
4) Use crib-driven mapping and digram constraints to converge.

## Pseudocode (Solving Skeleton)
```text
given ciphertext (Spanish):
  normalize accents/ñ/ü → A–Z

mappingPlainToCipher = {}
mappingCipherToPlain = {}

function assign(p, c):
  if p in mappingPlainToCipher and mappingPlainToCipher[p] != c: return false
  if c in mappingCipherToPlain and mappingCipherToPlain[c] != p: return false
  mappingPlainToCipher[p] = c
  mappingCipherToPlain[c] = p
  return true

while unresolved letters:
  try QUE/DEL/CON/POR/LOS/LAS/UNA cribs
  consider -CION/-IDAD/-MENTE and -OS/-AS endings
  propose consistent assignments; validate globally

return full decryption and key
```

## Further Reading
- Spanish letter frequencies and n-gram tables.
- Codebusters xenocrypt guides and practice sets.
- Monoalphabetic substitution solving techniques (cribbing, constraints).

