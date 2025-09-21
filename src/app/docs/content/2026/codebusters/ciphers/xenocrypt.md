# Xenocrypt (Spanish Random Aristocrat)

## What it is
In Science Olympiad Codebusters, a Xenocrypt is a Random Aristocrat in Spanish: a monoalphabetic substitution cipher with a random alphabet key applied to Spanish plaintext. Spaces and punctuation are preserved. Accented characters are treated as their unaccented forms (á→A, é→E, í→I, ó→O, ú/ü→U), and ñ → N.

- Random monoalphabetic substitution (one-to-one A–Z).  
- Preserved spacing/punctuation (word boundaries visible).  
- Spanish text: use Spanish frequencies, vocabulary, and morphology.

## How decryption works
1) Normalize accents/ñ/ü mentally when testing cribs.  
2) Build a cipher→plain mapping using Spanish cribs (QUE/DE/CON/POR/LOS/LAS/UNA/ES/EST).  
3) Enforce one-to-one consistency and propagate across the text.  
4) Iterate with frequency and morphology cues (-CION, -IDAD, -MENTE) until fluent Spanish appears.

## Spanish letter frequency (reference)
Approximate frequencies:

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
- E, A, O dominate; S, N, R are also common.  
- Q almost always followed by U (QU).  
- H is often silent; CH digraph is common.

## High-value Spanish words and patterns
Articles/determiners
- EL, LA, LOS, LAS, UN, UNA, UNOS, UNAS, LO

Prepositions
- DE, A, EN, POR, PARA, CON, SIN, SOBRE, HASTA, ENTRE

Conjunctions/pronouns
- Y, O, QUE, COMO, SI, PERO, MAS, ES, ESTA, ESTE, ESA, ESE

Common verbs/endings
- ES, SON, SER, ESTAR, HAY, HABER; -AR/-ER/-IR; -ADO/-IDO; -MENTE; -OS/-AS; -O/-A.

Common bigrams/trigrams
- QUE, DEL, CON, POR, UNA, LOS, LAS, EST, ENT, RES, CIO, ION

Word endings
- -CION (→ -CIÓN), -IDAD, -ENTE/-ANTE, -AR/-ER/-IR, -ADO/-IDO, -MENTE, -OS/-AS plural, -O/-A gender.

Double letters
- LL, RR within words; CC in ACCION.

## Solving method (step-by-step)
1) Normalize accents (mentally/in notes): á→A, …; ñ→N; ü→U.  
2) Identify high-value words: QUE, DE(L), CON, POR, LOS, LAS, UNA; test and validate across repeats.  
3) Use frequency: most frequent cipher letter often E or A; cross-check with QUE and other trigrams.  
4) Build mapping table (bijective) and propagate.  
5) Iterate with morphology: -CION, -IDAD, -MENTE, -OS/-AS; confirm gender/number agreement.  
6) Finalize: fluent normalized Spanish → solution.

## Pattern play (micro-examples)
Example 1: QUE detection
- A frequent 3-letter cluster → QUE; mapping forces Q/U/E and helps expand to QUI, QUIEN, QUE/QUE… forms.

Example 2: Articles
- Short two/three-letter words at starts: EL, LA, LOS, LAS, UN, UNA; use agreement (-O/-A; -OS/-AS) nearby to confirm.

Example 3: -CION ending
- Recurring 4-letter motif at ends → CION; pin C, I, O, N and propagate to related words.

## Worked example (full walkthrough)
Ciphertext
```
WN FRWWRIN VRGRQR RE WNSAHN VGRB RX AETBGPNW RE RW NGPR
```
Target plaintext
```
LA BELLEZA PERECE EN LA VIDA, PERO ES INMORTAL EN EL ARTE. (Leonardo Da Vinci)
```
Steps
- Focus on LA/EN/EL/ES and QUE-like clusters; build consistent pairs and propagate to BELLEZA, PERECE, VIDA, PERO, INMORTAL, ARTE.

Decryption
```
LA BELLEZA PERECE EN LA VIDA, PERO ES INMORTAL EN EL ARTE.
```

## Common mistakes
- Not normalizing accents and ñ/ü.  
- Applying English frequency blindly.  
- Violating bijection to force a word.  
- Ignoring gender/number agreement.

## Quick reference
- Xenocrypt = Spanish Random Aristocrat (spaces preserved).  
- Normalize accents; use QUE/DE/CON/POR/LOS/LAS/UNA; leverage -CION/-IDAD/-MENTE and agreement cues.

## Practice
1) Identify and map QUE; extend to DE/DEL.  
2) Given a ciphertext ending with “…CION”, determine C, I, O, N and propagate.  
3) Map EL/LA/LOS/LAS and check adjective agreement nearby.

### Answers
- Open-ended drills: your mapping should decrypt to fluent Spanish (normalized). Verify by round-trip re-encryption.  
- For (2), the -CION mapping should consistently confirm across multiple words.

## Further reading
- Spanish letter frequencies and n-gram tables.  
- Codebusters xenocrypt guides and practice sets.  
- Monoalphabetic substitution solving techniques (cribbing, constraints).

