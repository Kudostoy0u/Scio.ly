# Fractionated Morse Cipher

## What it is
Fractionated Morse combines International Morse code with a simple substitution on fixed-size chunks of Morse symbols. The process:
1) Convert normalized plaintext to Morse code, separating Morse letters with a special separator symbol (commonly `x`) and adding an additional `x` between words to create word boundaries (resulting in two consecutive `x` characters).
2) Read the entire Morse stream left-to-right and cut it into triplets of characters (., -, x). Pad with trailing `x` if needed so the length is divisible by 3.
3) Substitute each triplet with a letter using a 26-letter fractionation table, producing the final ciphertext.

Key facts
- Alphabet: A–Z only; punctuation removed before Morse conversion in many implementations.
- Letter separator: `x` is used between Morse letters within words in this app's generator.
- Word separator: An additional `x` is added between words, creating word boundaries with two consecutive `x` characters.
- Triplets: Every 3 symbols of the Morse stream form a unit; repeated triplets map to the same letter.
- Table: The mapping from triplet → letter is a permutation of A–Z established per-quote (shown in the UI as the Replacement Table columns).
- Decoding is unique once you know the triplet table or can reconstruct the Morse stream correctly.

## Visualizing the Replacement Table
In the UI, each Replacement Table column corresponds to a unique triplet. Three rows display the triplet’s characters (., -, x). The top editable row lets you assign which cipher letter corresponds to that triplet for your current solve. When you fill a letter under a column, all instances of that letter in the ciphertext will be filled with the column’s triplet and vice versa.

Example (conceptual)
```
Replacement:      A    K    Q    ...
Morse code:       .    -    x
                  -    x    .
                  x    .    -
```
(The real table is derived from the puzzle’s triplets; the letter order is a permutation.)

## How decryption works (given the table)
1) For each ciphertext letter, look up its triplet from the table.
2) Concatenate all triplets to reconstruct the full Morse string.
3) Split Morse at the separator `x` to get per-letter Morse codes, and identify word boundaries where two consecutive `x` characters occur.
4) Translate each Morse code to A–Z using the Morse table.
5) Join letters to recover plaintext, preserving word boundaries where double `x` was found.

Because the fractionation table is a bijection over the set of triplets that actually occur, this process is reversible and deterministic for a given quote.

## Solving without the table (contest strategy)
1) Use per-letter inputs (UI): assign a guess (e.g., `..x`) to a cipher letter; if a column exists, the mapping propagates. Build the Morse stream incrementally and watch the decoded prefix.
2) Morse patterns: E is `.`, T is `-`. Common `THE` becomes `-x....x.`; triplets like `..x`, `.-x`, `x.-` recur. Prioritize columns containing `x` early.
3) Triplet frequency: Focus on frequent triplets; many include `x` due to separators.
4) Sanity: Triplets must be from {., -, x}. Reconstructed Morse must split cleanly into valid codes.

## Morse code reference (A–Z)
```
A .-    B -...  C -.-.  D -..   E .     F ..-.  G --.   H ....  I ..    J .---
K -.-   L .-..  M --    N -.    O ---   P .--.  Q --.-  R .-.   S ...   T -
U ..-   V ...-  W .--   X -..-  Y -.--  Z --..
```

## Pattern play (micro-examples)
Example 1: Reconstructing from a column guess
- If the column `..x` maps to `E`, assigning `E` fills all `E` positions with `..x`. The Morse prefix may now decode to common words.

Example 2: Handling padding
- Trailing `x` used as padding completes the final triplet; ignore trailing separators that don’t precede a Morse letter.

Example 3: Confirming a decoded word
- If the prefix decodes to `THIS`, you should see triplets aligning to `-x....x..x...x`. If not, adjust assignments.

## Advanced notes
- Triplet set size: up to 27 triplets over {., -, x}; only 26 letters exist, so at most 26 are assigned (only those used by the text).
- Table is per-quote; do not reuse between puzzles.
- Separators: some sources use `/` or space; this implementation uses `x` consistently. Double `x` marks word boundaries.

## Common mistakes
- Omitting letter separators (`x`) so Morse runs together.
- Confusing single `x` (letter separator) with double `x` (word boundary).
- Using invalid characters in triplets.
- Assuming a universal fractionation table.

## Quick reference
- Letter separator: `x`; word boundary: double `x`.
- Chunk into triplets over {., -, x}; map via the per-quote table.
- Decrypt: cipher letters → triplets → Morse → letters.

## Practice
1) Given partial table `..x→E, .-x→B, -..→C, x.-→D, .x.→A`, decrypt: `ABCD`.  
2) Start blind: pick the most frequent column ending with `x` and assign `E`. Decode the first word of a short cipher.  
3) Explain why final one or two `x` may not correspond to letters.

### Answers
1) `ABCD` → trips `.x.` `..x` `x.-` `-..` → Morse `.x.` is `A` (.`-` split by x), `..x` is `E` then boundary, `x.-` begins with boundary then `.-`, `-..` is `D`. Result depends on exact separator handling; with strict splitting, the stream reconstructs and decodes to a short word fragment—work it left-to-right given your table.  
2) Assigning `E` reduces ambiguity; the first decoded word will often be a common article/pronoun (e.g., THE/IT/IN).  
3) They may be padding added to reach a multiple of 3; ignore trailing separators without a following Morse letter.

## Worked example (full decryption)
Cipher letters (grouped):
```
F A B Z A R X Y O V D Z C S R A V A F O T M T F R A O M A F O U L X R Y A X F U V E A A V N H
```
Per-quote fractionation table (letter → triplet):
```
F:-..  A:.x.  B:x--  Z:-x-  R:x.-  X:-x.  Y:.x-  O:x..  V:..x  D:-.-
C:--x  S:..-  T:-.x  M:.-x  U:x-.  L:x.x  E:.-.  N:...  H:xxx
```
1) Replace each letter with its triplet and concatenate into one Morse string (ignore line breaks in display).  
2) Split by `x` into Morse letters; decode using the table above.  
3) Plaintext:
```
Be one with yourself and revel in eternal bliss. (A.D. Posey)
```

