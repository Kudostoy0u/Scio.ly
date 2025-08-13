# Fractionated Morse Cipher

## Explanation
Fractionated Morse combines International Morse code with a simple substitution on fixed-size chunks of Morse symbols. The process:
1) Convert normalized plaintext to Morse code, separating Morse letters with a special separator symbol (commonly `x`).
2) Read the entire Morse stream left-to-right and cut it into triplets of characters (., -, x). Pad with trailing `x` if needed so the length is divisible by 3.
3) Substitute each triplet with a letter using a 26-letter fractionation table, producing the final ciphertext.

Key facts
- Alphabet: A–Z only; punctuation removed before Morse conversion in many implementations.
- Letter separator: `x` is used between Morse letters in this app’s generator.
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

## How Decryption Works (Given the Table)
1) For each ciphertext letter, look up its triplet from the table.
2) Concatenate all triplets to reconstruct the full Morse string.
3) Split Morse at the separator `x` to get per-letter Morse codes.
4) Translate each Morse code to A–Z using the Morse table.
5) Join letters to recover plaintext.

Because the fractionation table is a bijection over the set of triplets that actually occur, this process is reversible and deterministic for a given quote.

## Solving Without the Table (Contest Strategy)
Often you’ll be given just the ciphertext and the ability to fill a Replacement Table. Strategies:

1) Use the UI’s per-letter inputs
- For a ciphertext letter C, try filling its three-character input with a guess like `.-x` or `..x`. If that triplet exists as a column, the Replacement Table will update that column with C and propagate across the whole ciphertext.
- Build the Morse string incrementally, starting from position 1, and leverage the “Longest Continuous Morse Code” helper to see what the prefix decodes to.

2) Leverage English patterns in Morse
- Common letters (E=., T=-) appear often; if you see many single-dot triplets like `..x` that end with `x`, they might correspond to E’s letter boundary.
- Common digrams like `THE` in Morse: `- .... .` with separators become `-x....x.x`. Grouping into triplets can create recognizable motifs when aligned at the start.

3) Triplet frequency
- Some triplets recur; those likely map to frequent letters or common separator-inclusive patterns like `..x`, `.-x`, `-..`, `x.-`.
- Because `x` is common (letter separator), triplets containing `x` will be abundant; prioritize columns with `x` when guessing early.

4) Sanity checks
- Every guessed triplet must be exactly three characters from {., -, x}.
- If your concatenated Morse doesn’t split cleanly at `x` into valid Morse codes (e.g., `---`, `.-..`, `..-`), your assignments need revision.

## Morse Code Reference (A–Z)
```
A .-    B -...  C -.-.  D -..   E .     F ..-.  G --.   H ....  I ..    J .---
K -.-   L .-..  M --    N -.    O ---   P .--.  Q --.-  R .-.   S ...   T -
U ..-   V ...-  W .--   X -..-  Y -.--  Z --..
```

## Pattern Play (Worked Micro-Examples)
Example 1: Reconstructing from a column guess
- Suppose you guess that the column with triplet `..x` maps to cipher letter `E`. Filling `E` under that column sets every `E` in ciphertext to `..x` in the per-letter inputs. Now the Morse prefix may decode to words starting with frequent letters like E, T.

Example 2: Handling padding
- If the last Morse chunk ends with one or two extra `x`, remember they were added to complete the final triplet. When translating back, trailing separators that don’t precede a valid Morse letter can be ignored.

Example 3: Confirming a decoded word
- If your longest continuous prefix decodes to `THIS`, you should see triplets aligning to `-x....x..x...x` in the Morse reconstruction; if not, adjust assignments.

## Advanced Notes
- Triplet alphabet size: There are up to 3^3 = 27 possible triplets from {., -, x}; only 26 letters exist, so at most 26 triplets are assigned. In practice, the generator only assigns letters to triplets that occur in the text.
- Table consistency: The mapping triplet→letter is one-to-one among used triplets; the inverse letter→triplet is used during checking and the Replacement Table UI.
- Separator variants: Some sources use `/` or a space between Morse letters; this implementation uses `x` consistently.
- Word separation: In plain Morse, `/` or `x x` could serve as inter-word spacing; here, word spaces are removed before Morse, so recovered plaintext has no original word spacing unless the puzzle re-inserts it.

## Common Mistakes
- Forgetting to include separators: Without `x`, adjacent Morse letters run together and become ambiguous.
- Using invalid characters in triplets: Only `.`, `-`, and `x` are valid.
- Assuming the fractionation table is standard: It is generated per-quote; do not reuse between puzzles.
- Ignoring padding: You must pad with `x` until length % 3 == 0 during encryption, and you may see extraneous `x` at the end during decryption.

## Quick Reference
- Separator: `x` between Morse letters.
- Chunking: 3-symbol triplets over {., -, x}.
- Table: triplet → letter, permutation of A–Z for used triplets.
- Decoding: ciphertext → triplets → Morse (split by `x`) → plaintext.

## Practice Exercises
1) Decrypt given fractionated Morse with known table:
- Table sample: `..x→A, .-x→B, -..→C, x.-→D, .x.→E` (extend accordingly)
- Cipher: `ABCD E...`
- Task: Reconstruct Morse, split by `x`, read plaintext.

2) Blind solve (partial):
- Start with assigning `E` to the most frequent column that ends with `x`.
- Use the UI to build the longest Morse prefix; report the first deciphered word.

3) End-padding check:
- Explain why the final one or two `x` may not correspond to actual letter boundaries.

## Pseudocode (Reference)
```text
// Given: letterToTriplet map (per-quote), and standard Morse map (A–Z)
// Goal: decrypt cipher letters into plaintext

function decryptFractionated(cipher, letterToTriplet, morseMap):
  // 1) Reconstruct Morse
  morseStream = ""
  for ch in cipher:           // consider only A–Z; ignore punctuation/spaces
    if 'A'<=ch<='Z': morseStream += letterToTriplet[ch]
  
  // 2) Split Morse by separator 'x' into letter codes
  codes = split(morseStream, 'x')
  
  // 3) Translate each Morse code via inverse morseMap
  invMorse = invertMap(morseMap) // e.g., {".-": "A", "-...": "B", ...}
  out = ""
  for code in codes:
    if code == "": continue  // consecutive x's or padding
    out += invMorse.get(code, '?')
  return out
```

## Worked Example (Full Decryption)
Cipher letters (one per line; grouped for readability):
```
F A B Z A R X Y O V D Z C S R A V A F O T M T F R A O M A F O U L X R Y A X F U V E A A V N H
```

Per-quote fractionation table (letter → triplet):
```
F: -..
A: .x.
B: x--
Z: -x-
R: x.-
X: -x.
Y: .x-
O: x..
V: ..x
D: -.-
C: --x
S: ..-
T: -.x
M: .-x
U: x-.
L: x.x
E: .-.
N: ...
H: xxx
```

1) Reconstruct the Morse stream by replacing each cipher letter with its triplet (concatenate):
```
-..
.x.
x--
-x-
.x.
x.-
-x.
.x-
x..
..x
-. -
-x-
--x
..-
x.-
.x.
..x
.x.
-..
x..
-.x
.-x
-.x
-..
x.-
.x.
x..
.-x
.x.
-..
x..
x-.
x.x
-x.
x.-
.x-
.x.
-x.
-..
x-.
..x
.-.
.x.
.x.
..x
...
xxx
```
(Line breaks are for display; the algorithm concatenates all triplets into a single Morse string.)

2) Split by the separator `x` to get Morse for each letter, then decode using the standard Morse table above.

3) Resulting plaintext (spacing/punctuation restored):
```
Be one with yourself and revel in eternal bliss. (A.D. Posey)
```

## Further Reading
- Classical descriptions of Fractionated Morse and fractionation-based ciphers.
- Morse code references and timing/separation conventions.
- Codebusters docs on Fractionated Morse solving approaches.

