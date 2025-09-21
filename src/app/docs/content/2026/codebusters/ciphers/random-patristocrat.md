# Random Patristocrat (Monoalphabetic Substitution without Spaces)

## What it is
A Random Patristocrat is the same random monoalphabetic substitution as the Random Aristocrat, but spaces and punctuation are removed from the ciphertext and it is often grouped visually (e.g., 5s). Word boundaries must be inferred from language.

- One-to-one mapping via a random key (permutation of A–Z).  
- Consistent across the message.  
- No spaces/punctuation: segmentation is part of solving; grouping is cosmetic.

## How it works (decrypt)
1) Build a cipher→plain mapping (bijective) from pattern fits.  
2) Remove grouping; substitute letters back.  
3) Insert spaces based on language (common words, suffixes, doubles).  
4) Iterate until plaintext reads fluently; validate by re-encrypting.

## Frequency and high-value patterns
- English letter frequency as guidance (E/T/A… common; J/X/Q/Z rare).  
- Digrams/trigrams: TH/HE/IN/ER/AN/RE/ON/AT/EN/ND; THE/AND/ING/HER/ERE/ENT/…  
- Doubles: LL/EE/SS/OO/TT; also FF/RR/NN/PP/CC.  
- Endings: -ING, -ED, -ER, -LY, -TION, -S/-ES.

## Solving method (step-by-step)
1) Frequency + digrams/trigrams: hypothesize E/T/A; TH/HE; validate globally.  
2) Mapping table: maintain consistent P↔C without conflicts.  
3) Segmentation: try multiple spacings (_THE_, _ING_, _ED_ placements); keep ones yielding many valid short words.  
4) Iterate: confirm assignments; backtrack on contradictions; use elimination for leftovers.  
5) Finalize: fluent text + consistent mapping = solution.

## Worked micro-examples
- -ING spotting: recurring `…CZG` at ends → map CZG→ING; propagate.  
- THE embedded: recurring 3-letter candidate → test THE; confirm with other appearances.

## Common mistakes
- Treating 5-letter blocks as word boundaries.  
- Overfitting a segmentation that breaks mapping elsewhere.  
- Violating bijection to force a single word.

## Quick reference
- Patristocrat = no spaces; grouping is cosmetic.  
- Enforce one-to-one mapping; use digrams/trigrams, doubles, suffixes.  
- Try multiple segmentations; keep consistent ones.

## Practice
1) Given a 5-grouped cipher, propose two segmentations using THE/AND/ING placements.  
2) Map the most frequent cipher letter to E and test against digrams.  
3) Decrypt a short Patristocrat by iterating mapping + segmentation.

### Answers
- Open-ended drills: verify by round-trip re-encryption and fluent final plaintext.

## Further reading
- Monoalphabetic substitution strategies for unspaced text.  
- English n-gram statistics for segmentation.

