# Baconian Cipher

## Explanation
The Baconian cipher encodes letters using groups of five symbols drawn from a binary alphabet written as A and B. Each plaintext letter is represented by a unique 5-character pattern of A/B. Historically, the cipher is often used steganographically: the A/B patterns are hidden in a carrier text using two different typographic styles (e.g., lowercase vs uppercase, italic vs roman, light vs bold), where one style represents A and the other represents B.

In this app, the Baconian cipher uses a 24-letter alphabet by combining I/J and U/V, which matches common classical conventions.

Key facts
- Fixed-length encoding: every letter → 5 A/B symbols.  
- Binary alphabet: A and B are abstract categories that can be rendered with any two distinct styles.  
- 24-letter alphabet here: I/J share a code; U/V share a code.  
- Decoding requires grouping into 5s and mapping each group to a letter via the Baconian table.

Why it’s approachable
- Single table of 24 patterns to memorize or reference.  
- Very systematic: group into 5s, translate each group using the table.  
- If stego-carrier is used, first extract A/B by deciding which visual feature is A and which is B.

## Alphabet Variants
- 24-letter classical (used here): I/J combined, U/V combined.  
- 26-letter modern variants exist but are not standard; patterns are adjusted to cover all 26 letters. Always follow the puzzle’s stated convention.

## Baconian Table (24-letter, I/J and U/V combined)
Each letter maps to a 5-symbol pattern of A’s and B’s. In this app, the mapping is:

```
A  AAAAA   B  AAAAB   C  AAABA   D  AAABB   E  AABAA   F  AABAB   G  AABBA   H  AABBB
I  ABAAA   J  ABAAA   K  ABAAB   L  ABABA   M  ABABB   N  ABBAA   O  ABBAB   P  ABBBA
Q  ABBBB   R  BAAAA   S  BAAAB   T  BAABA   U  BAABB   V  BAABB   W  BABAA   X  BABAB
Y  BABBA   Z  BABBB
```

Notes
- I and J use the same code ABAAA.  
- U and V use the same code BAABB.  
- When decoding, choose I vs J or U vs V based on word context.

## How Decryption Works (Step-by-Step)
1) Obtain the A/B stream. If stego-carrier is used, decide which visual feature is A and which is B, and extract A/B accordingly.  
2) Remove any characters that aren’t A or B.  
3) Group the A/B stream into 5-character chunks.  
4) Translate each chunk via the Baconian table to letters (choose I/J or U/V by context).  
5) Join letters, add spaces based on natural language.

Example (decoding)
A/B: AABBB AABAA ABABA ABABA ABBAB  
→ H E L L O → HELLO

## Binary Representation Types
The Baconian cipher can use various binary representations beyond simple A/B. In this app, you may encounter:

### Traditional Representations
- **A/B**: Standard A and B symbols
- **Vowels/Consonants**: Vowels (AEIOU) vs Consonants (BCDFGHJKLMNPQRSTVWXYZ)
- **Odd/Even**: Odd-positioned letters (ACEGIKMOQSUWY) vs Even-positioned letters (BDFHJLNPRTVXZ)

### Thematic Emoji Representations (Set-Based)
These themes use multiple symbols from each category, randomly selected for variety:

- **Fire vs Ice**: 🔥🌋☀️⚡💥🌡️ vs ❄️🧊🌨️💎🔮🌊
- **Day vs Night**: ☀️🌅🌞🌤️🌻🐦 vs 🌙⭐🌃🌌🦉🦇
- **Land vs Sea**: 🏔️🌲🦁🐻🌵🏜️ vs 🌊🐋🐙🦈🏝️⚓
- **Tech vs Nature**: 💻📱🤖🚀⚡🔋 vs 🌿🌸🦋🌳🍃🌺
- **Sweet vs Spicy**: 🍰🍭🍫🍪🍦🍯 vs 🌶️🔥💥⚡🌋💣
- **Fast vs Slow**: 🏃🚀⚡💨🏎️🦅 vs 🐌🐢🦥🌱⏰🕰️
- **Loud vs Quiet**: 🔊📢🎵💥⚡🌋 vs 🔇🤫🦋🍃🌙💤
- **Hot vs Cold**: 🔥🌡️☀️🌋💥⚡ vs ❄️🧊🌨️💎🔮🌊
- **Light vs Dark**: 💡☀️⭐🌟✨🔆 vs 🌑🌙🕯️🌃🌌⚫
- **Old vs New**: 📜🏛️🕰️📚🕯️⚔️ vs 💻📱🚀⚡🔋🤖
- **Big vs Small**: 🐘🐋🦕🏔️🌋🌊 vs 🐜🦋🌸💎⭐🌱
- **Strong vs Weak**: 💪🏋️🦁🐻⚡💥 vs 🦋🌸🍃🌱💤🕊️
- **Happy vs Sad**: 😊😄😃😁😆😅😂🤣😉😋 vs 😞😔😟😕🙁☹️😣😖😫😩
- **Food vs Drink**: 🍕🍔🍟🌭🌮🌯🥪🥙🍖🍗 vs ☕🍺🍷🍸🍹🥤🧃🥛🍼🧋
- **Weather vs Nature**: ☀⛅☁🌧⚡❄ vs 🌿🌱🌲🌳🌴🌵🌸🌺🌻🌼
- **Animals vs Plants**: 🐯🦁🐻🐨🐼🦊🐸🐙🦋🦅 vs 🌱🌿🌲🌳🌴🌵🌸🌺🌻🌼
- **Sports vs Games**: ⚽🏀🏈⚾🎾🏐🏓🏸🏊🏃 vs 🎮🎲♟️🎯🎪🎨🎭🎪🎤🎧
- **Music vs Art**: 🎵🎶🎸🎹🎺🎻🥁🎤🎧🎼 vs 🎨🖼️🎭🎪🎬📷🎥🎞️🎟️🎫
- **Space vs Earth**: 🚀🛸⭐🌙🌌🌠☄️🪐🌍🌎 vs 🌍🌎🌏🏔️🌊🌋🏜️🏝️🌲🌳
- **Fantasy vs Reality**: 🐉🦄🧙‍♀️🧝‍♀️🧚‍♀️👻💫✨🔮⚡ vs 🏠🚗📱💻📚🏢🚌🛒💼👔
- **Summer vs Winter**: ☀️🌞🏖️🍦🌊🏄🌴🍉🌻🦋 vs ❄️⛄🏂🎿🧤🧥🌨️🏔️🦌🦊
- **Ocean vs Sky**: 🌊🐋🐙🦈🐠🐡🦀🦞🦐🐚 vs ☁️🌈🦅🕊️🦢🦆🦉🦇🦋🦗
- **City vs Country**: 🏢🏪🚗🚌🚇🏭💡🌃🎭🍕 vs 🌾🚜🐄🐓🌲🏡🌻🦋🐝🌿
- **Morning vs Evening**: 🌅☀️🐓☕🍳🚶📰💼🚌🏢 vs 🌆🌙🦉🍷🍽️🛋️📺🛏️🌃💤
- **Adventure vs Relaxation**: 🗺️🏔️🧗‍♀️🏕️🔥🔦🎒🧭⚔️🛡️ vs 🛋️🛁☕📖🎵🕯️🧘‍♀️💆‍♀️🛏️🌙

### Text Formatting Representations
- **Bold vs Italic**: ** vs *
- **Underline vs Plain**: _ vs (space)
- **UPPER vs lower**: U vs L
- **Double vs Single**: || vs |
- **Brackets vs Parentheses**: [ vs (
- **Curly vs Square**: { vs [
- **Hash vs At**: # vs @
- **Dollar vs Cent**: $ vs ¢
- **Plus vs Minus**: + vs -
- **Equal vs Not Equal**: = vs ≠
- **Greater vs Less**: > vs <
- **Arrow Up vs Down**: ↑ vs ↓
- **Arrow Left vs Right**: ← vs →
- **Circle vs Square**: ○ vs □
- **Triangle vs Diamond**: △ vs ◇
- **Star vs Heart**: ★ vs ♥
- **Sun vs Moon**: ☀ vs ☾
- **Check vs X**: ✓ vs ✗
- **Infinity vs Zero**: ∞ vs 0
- **Pi vs E**: π vs e
- **Greek Letters**: α vs β, γ vs δ, ω vs θ, σ vs φ, λ vs μ, ρ vs τ, χ vs ψ

### Strategy for All Types
- Identify the two distinct symbols or styles being used
- Map one to A and the other to B
- Extract the A/B pattern from the representation
- Group into 5s and decode using the Baconian table
- If the result doesn't make sense, try swapping A/B assignments

## Solving in Codebusters (Practical Guide)
1) Identify encoding mode
- If given raw A/B sequences: proceed to grouping.  
- If given suspiciously styled text: hypothesize the A/B assignment and extract.

2) Clean and group
- Keep only A and B; group into 5s. If the total isn’t divisible by 5, check for missing/extra characters or a partial trailing group.

3) Translate with table
- Use the 24-letter table above.  
- Decide I vs J and U vs V by reading the emerging words.

4) Validate
- Common words should appear quickly (THE, AND, OF, TO).  
- If nonsense, try swapping A/B (invert mapping) or reconsider the stego feature.

## Worked Examples
Example 1: Straight A/B text
```
AABBB AABAA ABABA ABABA ABBAB
```
Decode: H E L L O → HELLO

Example 2: Hidden in letter case (extract A/B, then decode)
Carrier: “ciPHeRTeXtIsFuN”  
Interpret lowercase=A, uppercase=B; extract A/B by scanning each letter in order (c=A, i=A, P=B, H=B, e=A, r=A, T=B, e=A, X=B, t=A, I=B, s=A, F=B, u=A, N=B).  
Group into 5s and decode using the table.

Example 3: I/J and U/V decisions
A/B groups decode to “JULIUS” vs “IULIUS” (classical Latin). Choose the historically appropriate spelling for context.

## Advanced Notes
- Error handling: If a single wrong A/B in a chunk yields nonsense, consider that chunk suspect; a single-bit error corrupts one letter only.  
- Punctuation and spaces are not encoded—insert them by reading comprehension.  
- Non-English carriers: The carrier language doesn’t matter; only the binary feature does.

## Common Mistakes
- Forgetting to group exactly by 5 symbols.  
- Mixing A/B with other characters; always filter before grouping.  
- Misassigning the carrier’s A vs B (swap them and try again).  
- Assuming 26-letter table when the problem uses 24 letters (or vice versa).  
- Forcing J or V when table uses I/J or U/V combined; use context.

## Quick Reference
- Encoding unit: 5-symbol A/B patterns.  
- Table here: 24-letter (I=J; U=V).  
- Steps: extract A/B → group 5 → table-translate → choose I/J and U/V by context.  
- Stego: two visual styles = A vs B.

## Practice Exercises
1) Decode this A/B stream:  
```
AABAA AABAB AABBA AABBB
```
2) Extract A/B from this mixed-case carrier (lower=A, upper=B) and decode:  
```
CoDeBuStErS
```
3) You decode “IULIVS CAESAR”. Decide final spelling.  
4) Create your own Baconian stego in 30 characters of carrier text using lowercase vs uppercase.

## Worked Example (Provided A/B stream → full sentence)
Variant: 24-letter alphabet (I/J same, U/V same)

Input (A/B groups; periods indicate punctuation):
```
BAABA
BAAAA
BAABB
BAAAB
BAABA
BABBA
ABBAB
BAABB
BAAAA
BAAAB
AABAA
ABABA
AABAB
.
BABBA
ABBAB
BAABB
ABAAB
ABBAA
ABBAB
BABAA
ABABB
ABBAB
BAAAA
AABAA
BAABA
AABBB
AAAAA
ABBAA
BABBA
ABBAB
BAABB
BAABA
AABBB
ABAAA
ABBAA
ABAAB
BABBA
ABBAB
BAABB
AAABB
ABBAB
.
```

Step-by-step
1) Clean and group: remove non A/B characters (already grouped as 5s above).
2) Translate each 5-symbol group using the 24-letter Baconian table:
   - BAABA=T, BAAAA=R, BAABB=U, BAAAB=S, BAABA=T → “TRUST”
   - BABBA=Y, ABBAB=O, BAABB=U, BAAAA=R, BAAAB=S, AABAA=E, ABABA=L, AABAB=F → “YOURSELF”
   - Period → “.”
   - Continue through all groups, deciding I/J and U/V by context when they arise.
3) Reconstruct spacing and punctuation by reading comprehension:
```
Trust yourself. You know more than you think you do.

(Benjamin Spock)
```

## Pseudocode (Reference)
Decoding
```text
// baconianMap: A/B → letter (24-letter table)
function decodeBaconian(input):
  ab = []
  for ch in input:
    if ch == 'A' or ch == 'B': ab.append(ch)
    else if isLower(ch) or isUpper(ch):
      // optional: infer A/B from style; caller can pass a function styleToAB
      // here we treat non A/B as ignorable unless mapped externally
      continue
  groups = chunk(ab, 5)
  out = ""
  for g in groups:
    if len(g) < 5: break // or handle partial
    code = join(g)
    out += baconianMap.get(code, '?')
  return out
```

## Further Reading
- Francis Bacon’s biliteral cipher (historical context and steganography).  
- Classical cryptography texts on Baconian variants (24- vs 26-letter).  
- Codebusters event docs and examples for Baconian decoding.

