## Overview
Codebusters is a speed puzzle: you win by turning a jumble of symbols into words through disciplined pattern hunting, quick arithmetic, and crisp team choreography. Study by learning the characteristic fingerprints of each cipher family, practicing how to place cribs without painting yourself into contradictions, and drilling until you can recognize archetypal patterns on sight. During competition, write the obvious first, exploit mistakes to your advantage, and speak answers aloud before submitting.

## Team workflow
Strong teams divide labor by cipher family and rotate based on the set in front of them. One person lays down the alphabet line and fills common English patterns for substitutions; another tackles math‑heavy items such as Affine, Hill, and cryptarithms; a third handles Morse‑based encodings and transpositions where crib placement and separator rules matter most. Everyone cross‑checks mappings and keeps the timed first question in view.

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

Division B often adds Caesar, Atbash, and Affine (with given a, b), while Division C commonly includes K3 monoalphabetic and Hill 2×2 (and 3×3 with provided inverse).

## Playbook highlights by cipher
Substitutions live on word shapes and short anchor words—single letters A/I, common trigrams (THE, AND, ING), doubled letters, and apostrophes. Frequency helps only when texts are long enough. Baconian depends on partitioning the token set into two classes and grouping by five; if it fails, flip the class mapping or confirm the 24‑ vs 26‑letter variant. Affine requires modular inverses and two letter pairs from a crib to solve for a and b; errors usually come from forgetting to wrap negatives mod 26. Porta uses 13 fixed paired alphabets—pre‑write the pairs and slide the key. Columnar with a strong crib prunes column permutations fast; contradictions show up as letters forced into two columns at once. Morse family ciphers obey separator rules; enforce them to eliminate impossible mappings. Xenocrypts reward Spanish anchors (DE, LA, QUE, EL) and agreement rules; Hill 2×2 demands checking invertibility (det coprime to 26) and using adjugate formulas.

## Worked mini‑examples
- Affine decrypt (a=21, b=14): x = a⁻¹·(y − b) → with a⁻¹=5, y=24 (Y), x=5·(24−14)=50 ≡ 24 mod 26 → Y (self‑check).
- Columnar with crib: try 7–9 columns; laying the crib across rows that force a letter into two columns rules out an ordering immediately.
- Pollux constraint: a ciphertext ending with a separator contradicts Pollux rules—adjust digit→symbol mapping.

## Weekly drills (suggested)
- 1 timed Aristocrat; 2 substitutions (include 1 Patristocrat)
- 1 math cipher (Affine/Hill); 1 transposition (Columnar)
- 1 Morse (Pollux/Morbit); 1 cribbed polyalphabetic (Porta/Nihilist/Fractionated Morse)
- 1 specialty (Xenocrypt or cryptarithm); track average times and error types

## Pitfalls
Anchoring on an early wrong guess, ignoring separator constraints, slipping modular arithmetic (especially negatives), and over‑relying on frequency in short texts account for most unforced errors. Writing mappings cleanly and checking for contradictions before committing prevents wasted minutes.

## Practice prompts
- Timed Aristocrat (10‑minute bonus window)
- Patristocrat with crib “TODAY”
- Affine: encrypt a=5, b=8; decrypt a=21, b=14
- Porta decrypt with key “SCIOLY”
- Columnar decrypt (8 columns) with 7‑letter crib
- Nihilist decrypt with two keys and a short crib
- Pollux with four unknown digits; Morbit partial map
- Spanish Xenocrypt with DE/LA/QUE anchors

## References
- SciOly Wiki – Codebusters: https://scioly.org/wiki/index.php/Codebusters

## Crib cookbook and pattern cues
Cribs work because they constrain structure. Start with words that encode unique shapes (THE, AND, ING, THAT), then place them where punctuation or structure suggests. In Porta and Nihilist, use the crib to align key rows or subtract to recover Polybius indices; in Columnar, slide the crib across rows and cross out permutations that force a letter into two columns at once. In Affine and Hill, short plaintext–ciphertext pairs generate solvable equations—write them cleanly and check inverses before committing.

- Shape anchors: one‑letter words (A/I), two‑letter function words (TO, OF, IN), apostrophe forms (’S, ’RE, ’LL) that rarely vary
- Bigram/trigram habits: TH/HE/IN/ER/AN/RE and ING/ION; doubled letters LL/EE/SS are strong constraints
- Affine pairs: pick two non‑collinear pairs from a crib; solve for a and b mod 26; verify with a third letter before propagating
- Porta rows: pre‑write the 13 paired alphabets; verify period‑2 behavior (same row every other letter); slide key until multiple letters fit sensibly
- Columnar contradictions: any placement that requires the same cipher column for two positions of one plaintext letter is impossible—prune hard
- Morse rules: Pollux cannot end with a separator; at most two separators in a row; enforce triad plausibility for Fractionated Morse
- Hill sanity checks: det(E) must be coprime to 26; if not invertible, you’re intended to use a provided inverse or the cipher is mis‑set

## Team communication checklist
- Say mappings aloud before writing final answers; a second voice catches transpositions and misspellings
- Mark contradictions with a clear symbol and do not erase them—failed paths prevent repeats under time
- Timebox stuck items (e.g., 90 seconds), then rotate ciphers or swap roles to regain momentum

## Advanced timed drills (team rotation)
Build speed and reliability with structured sprints. Run 12–15 minute sets cycling roles every 3 minutes: Substitution → Math → Morse/Transposition → Review. Score as solved/partial/unsolved and track error types. Increase difficulty by mixing in K3 substitutions, Hill with noisy cribs, and Columnar near the 9‑column limit. Finish with a 90‑second Aristocrat lightning round from a clean alphabet line. Rotate who handles the timed first question so every member practices signaling and reading answers aloud under pressure.

## Mod arithmetic quick tips (Affine/Hill)
Working mod 26 is easier with a few habits. Always wrap negatives back into 0–25 (e.g., −3 ≡ 23). When a must be inverted in Affine, restrict choices to values coprime to 26; memorize a small inverse table (e.g., 3↔9, 5↔21, 7↔15, 11↔19, 17↔23, 25↔25). For Hill 2×2, det = a·d − b·c must be coprime to 26; find det⁻¹ from the same inverse set and compute E⁻¹ = det⁻¹·adj(E) with adj(E) = [[d, −b], [−c, a]] before multiplying. Reduce each multiplication and addition mod 26 as you go to keep numbers small and mistakes visible.

## Decision tree and error recovery
Open with structure. If spaces are preserved and letter shapes look English‑like, start with Aristocrat; if grouped and spacing is removed, treat as Patristocrat and rely on word‑shape anchors and frequency only when text is long. If typography alternates or encodes two classes, try Baconian. If a crib is supplied and the text is arranged in lines with hints at columns, prioritize Columnar. Digit‑rich Morse‑like strings suggest Pollux/Morbit or Fractionated Morse; enforce separator rules and triad plausibility. Keys provided usually point to Porta or Nihilist; place cribs and verify against multiple letters before committing. Spanish text with K1/K2 hints is a Xenocrypt—apply grammar anchors.

- When stuck on a substitution, write a clean alphabet line, fill A/I and THE/AND/OF, and test 2–3 bigrams; abandon frequency if length is short
- On Columnar, switch column counts quickly if the crib never lands cleanly across rows; contradictions early save minutes
- For Affine/Hill, verify with a third letter before propagating a mapping; bad inverses produce entire lines of noise—reset fast
- In Morse families, re‑check separators first; most errors are illegal runs or endings; remap a single digit to flip a dead end
- Rotate roles on a timer; a fresh pair of eyes turns dead ends into progress under time

## Xenocrypt (Spanish) anchors and cues
Spanish plaintext unlocks quickly with a few anchors and agreement checks. Articles and prepositions (DE, LA/EL, LOS/LAS, DEL, AL, EN, POR, CON) appear frequently and set gender/number downstream. Common bigrams and words (QUE, UNA/UNO, COMO, PARA, ESTE/ESTA) confirm placements. Adjectives agree with nouns (plural ‑S/‑ES; feminine ‑A), participles and verbs mark tense/person, and accent marks are often dropped in puzzles but the underlying grammar still constrains vowels. Use these grammatical hooks to prune false fits rapidly after placing a short crib.

## Patristocrat heuristics (spacing removed)
When spaces vanish, lean harder on vowels, digrams, and syllable shape. English pushes vowels into every few letters; test placements that keep words pronounceable and avoid long consonant runs. Common digrams (TH, HE, IN, ER, AN, RE, ON, EN) and trigrams (ING, THE) still apply; doubled letters LL/EE/SS often sit mid‑word. Apostrophes are gone, but contractions leave residue (DNT for DON’T, ILL for I’LL). Start by penciling likely vowels into patterns like CVCVC or CVCCV, then propagate with two or three high‑probability consonants. If a path yields impossible clusters (e.g., JQZ patterns without vowels), reset rather than forcing a bad mapping.

## Advanced Hill inversion (2×2 and 3×3)
Hill relies on linear algebra mod 26. With plaintext–ciphertext pairs treated as column vectors (A=0 … Z=25), E·P ≡ C (mod 26). If you have two consistent pairs for a 2×2, form P = [p1 p2] and C = [c1 c2]; if det(P) is coprime to 26, then P⁻¹ exists and E ≡ C·P⁻¹ (mod 26). Compute det(P), find det(P)⁻¹ in the small inverse set, build adj(P), then P⁻¹ ≡ det(P)⁻¹·adj(P) (reduce each entry mod 26). Verify E against a third letter pair; if it fails, your crib alignment is wrong or the pairs are not independent. For 3×3 (when given or when three independent pairs exist), assemble 3 columns; if det(P) is invertible, the same E ≡ C·P⁻¹ logic holds. Practically, many contests provide E or E⁻¹ for 3×3; use the provided inverse to decrypt via P ≡ E⁻¹·C, keeping all arithmetic reduced mod 26 at every multiply/add to prevent error growth.

A fast sanity cycle: check det(E) coprime to 26; confirm that E·E⁻¹ ≡ I on a test vector; and always validate the recovered matrix on extra pairs before propagating to the full text. When negatives appear, wrap immediately into 0–25; do not postpone reduction.

## Nihilist crib-driven decoding
Nihilist builds numbers from a Polybius square (keyworded K1; typically I/J combined) and adds a digit stream from a second keyword K2. Encryption is digit‑wise addition (row and column digits separately), usually mod 10 without carry; decryption subtracts K2’s digits mod 10 to recover valid Polybius pairs (11–55) that map back through K1. With a crib, slide its numeric Polybius over the ciphertext and subtract mod 10 digit‑wise. Alignments that yield many valid 1–5 pairs indicate the correct offset. From there, the K2 digit stream is fixed; extend it to the whole message and decode.

Keep conventions straight: confirm whether the Polybius reads row‑digit first or column‑digit first (stick to one and test on a short known word), and whether I/J are merged. If subtraction produces 0 or >5 digits, that alignment is invalid. Cross‑check with language: common bigrams and word shapes should appear as soon as a few pairs decode, otherwise adjust the alignment or re‑key the square. If two keys are given, generate both K1 and K2 numerics directly; if one is missing, a good crib plus valid pairs typically reveals K2’s digit pattern within a few placements.
