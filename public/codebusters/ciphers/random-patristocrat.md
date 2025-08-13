# Random Patristocrat (Monoalphabetic Substitution without Spaces)

## Explanation
A Random Patristocrat is the same random monoalphabetic substitution as the Random Aristocrat, but with spaces and punctuation removed from the ciphertext, typically grouped in blocks (often 5-letter groups). This elimination of word boundaries makes pattern-spotting harder and emphasizes letter-frequency, n-grams, and segmentation strategies.

- One-to-one mapping: each plaintext letter maps to a unique ciphertext letter A–Z via a random key.
- Consistency: the same plaintext letter always encrypts to the same ciphertext letter throughout the message.
- No spaces/punctuation: ciphertext is continuous letters, commonly grouped in 5s (e.g., ABCDE FGHIJ ...). Word boundaries are unknown and must be inferred.
- Language-driven: English frequency and common patterns still apply, but segmentation is required.

What this means in practice
- You’ll rely more on common digrams/trigrams, frequency, double-letter cues, and plausible segmentation to reconstruct words.
- Common short words (THE, AND, OF, TO, IN) still exist but are not visually separated—test candidate segmentations and validate via consistent mappings.

## How It Works (Encryption/Decryption)
Encryption
1) Generate a random key (permutation of A..Z).  
2) Remove spaces/punctuation from plaintext; uppercase letters.  
3) Substitute each letter by key mapping.  
4) Group output into equal-length blocks (often 5). Grouping is purely visual.

Decryption
1) Invert the key (C→P).  
2) Remove visual grouping; substitute back to plaintext letters.  
3) Insert spaces by understanding the plaintext—spaces are not encoded.

Because the mapping is consistent, a single correct assignment works globally.

## English Letter Frequency (Useful Reference)
Same as Aristocrat; use as probabilistic guidance when segmentation is ambiguous.

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

Notes: Short quotes may deviate—combine frequency with pattern and crib tests.

## High-Value Patterns for Patristocrat
- Digrams/trigrams: TH, HE, IN, ER, AN, RE, ON, AT, EN, ND; THE, AND, ING, HER, ERE, ENT, THA…  
- Double letters: LL, EE, SS, OO, TT; also FF, RR, NN, PP, CC.  
- Common endings: -ING, -ED, -ER, -LY, -TION, -S, -ES.  
- Short function words embedded: THE, AND, OF, TO, IN, IT, IS appear but must be segmented.

## Solving Method (Step-by-Step)
1) Frequency and digram/trigram scouting
- Identify the most frequent cipher letters and pairs.  
- Hypothesize E/T/A or TH/HE based on frequency and compatibility.

2) Build a mapping table
- Maintain P↔C consistency (one-to-one).  
- Pencil in tentative assignments; validate across the entire text.

3) Segmentation attempts
- Insert provisional spaces where common patterns could appear (e.g., _THE_, _ING_, _ED_).  
- Try multiple segmentations; retain ones that yield many recognizable short words without conflicts.

4) Iterate and propagate
- As you confirm assignments, more words emerge.  
- Resolve conflicts promptly; backtrack on weak guesses.

5) Finalize
- Once the text reads fluently under a consistent mapping, you have the decryption and the key.

## Worked Micro-Examples
Example: spotting -ING within a run
- Cipher run: `...CZG...` seen repeatedly near word ends. Hypothesize CZG→ING (map C→I, Z→N, G→G). Validate against other appearances.

Example: THE embedded
- Cipher run shows `QWF` often at positions where a word might start; try THE → Q→T, W→H, F→E; check global consistency.

## Advanced Techniques
- Parallel hypotheses: keep multiple viable segmentations and mapping sets until evidence decides.  
- Cross-run consistency: repeated runs at similar positions likely reflect the same words/suffixes.  
- N-gram scoring: for long texts, score candidate decryptions by English n-grams to choose among segmentations.

## Common Mistakes
- Treating 5-letter block boundaries as word boundaries—they are not.  
- Overfitting a segmentation that causes mapping conflicts elsewhere.  
- Ignoring that all spacing must be inferred from language, not from the cipher text itself.

## Quick Reference
- Patristocrat = monoalphabetic substitution with NO spaces/punctuation; grouping is cosmetic.  
- Use frequency, digrams/trigrams, double letters, and common suffixes.  
- Enforce one-to-one letter mapping always.  
- Try multiple segmentations; keep consistent ones.

## Practice Exercises
1) Given a 5-letter grouped cipher, hypothesize likely positions of THE/AND/ING and propose two segmentations.  
2) Map the most frequent cipher letter to E and verify across digrams.  
3) Decrypt a short Patristocrat by iterating mapping + segmentation.

## FAQ
Q: What’s the difference from Aristocrat?  
A: Aristocrat preserves spaces/punctuation; Patristocrat removes them, requiring you to infer word boundaries. The substitution mapping is otherwise identical.

Q: Are 5-letter groups meaningful?  
A: No—purely for readability. Ignore them when solving.

Q: Can frequency still help?  
A: Yes, but use it with pattern checks since segmentation is ambiguous.

## Pseudocode (Solving Skeleton)
```text
given ciphertext (letters only, possibly grouped):
  remove grouping

mappingPlainToCipher  = {}
mappingCipherToPlain  = {}

function assign(p, c):
  if p in mappingPlainToCipher and mappingPlainToCipher[p] != c: return false
  if c in mappingCipherToPlain and mappingCipherToPlain[c] != p: return false
  mappingPlainToCipher[p] = c
  mappingCipherToPlain[c] = p
  return true

while unresolved:
  propose segmentations and cribs (THE, AND, ING, ED, ER, LY)
  test digram/trigram fits; propose assignments
  validate globally; backtrack on contradictions

derive key from mappingCipherToPlain
```

## Further Reading
- Monoalphabetic substitution strategies for unspaced text.
- English n-gram statistics for segmentation.

