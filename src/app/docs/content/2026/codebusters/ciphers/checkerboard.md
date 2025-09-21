# Straddling Checkerboard (Monome–Dinome)

## What it is
- A variable-length numeric substitution. Ten columns labeled 0–9; the top row holds the most common letters as single digits. Two row digits (R1, R2) mark the start of two-digit codes; letters in those rows use RkC (two digits). Often I/J are combined.
- Hand rule: read one digit; if it’s R1 or R2, read a second digit to form a two-digit code; otherwise it’s a single-digit top-row letter.

## Key facts you need
- You must know (or infer) the mixed alphabet and which digits are R1, R2.  
- Top row uses single digits excluding the two row digits.  
- Rows R1 and R2 each use two-digit codes of the form RkC (k∈{1,2}).

## Building the board (by keyword)
1) Choose a mixed alphabet: write unique letters from a keyword, then remaining A–Z (optionally combine I/J).  
2) Pick R1 and R2 (two distinct digits 0–9).  
3) Draw a 3×10 board with columns 0..9. In the top row, leave the cells at R1 and R2 blank. Fill the other 8 cells left→right with the first 8 letters of the mixed alphabet (the high-frequency set you want as single digits).  
4) Continue filling remaining letters into row R1 (cells 0..9), then row R2, left→right.  
Result: 8 single-digit letters in top row; the rest are two-digit codes starting with R1 or R2.

Example board (I/J combined)
- Mixed alphabet from KEYWORD: `KEYWORDABCFGHI/JKLMPQSTUVXYZ`  
- Choose R1=3, R2=7  
- Columns: 0 1 2 3 4 5 6 7 8 9

Top row (single digits; blanks at 3 and 7):
```
0 1 2   4 5 6   8 9
K E Y   W O R   D A
```
Rows R1=3 and R2=7 (two-digit codes):
```
Row 3: B C F G H I L M P Q
Row 7: S T U V X Y Z (and remaining letters)
```
Interpretation
- Single digits: 0→K, 1→E, 2→Y, 4→W, 5→O, 6→R, 8→D, 9→A.  
- Two digits: 3x → row 3, column x; 7x → row 7, column x.

## Decoding example
Cipher digits: `1 5 3 4 3 5 9 7 0 7 2`

Step-by-step
- `1` → top row col 1 → E  
- `5` → top row col 5 → O  
- `3` → row marker R1 → read next digit `4` → row 3, col 4 → H  
- `3` → R1 again → read next digit `5` → row 3, col 5 → I (I/J combined)  
- `9` → top row col 9 → A  
- `7` → row marker R2 → next digit `0` → row 7, col 0 → S  
- `7` → R2 again → next digit `2` → row 7, col 2 → U  
Plaintext: `EOHIASU` (toy example—actual board composition will determine exact letters).

## Solving without the board
- Identify R1 and R2: digits that frequently occur and are followed by a second digit are likely row markers.  
- Segment the stream: treat R1x and R2x as two-digit codes; others as single digits.  
- Frequency: single-digit letters are more common (top row often holds ETAOINSH).  
- Cribs: try placing THE/AND by mapping their digit patterns; adjust the board accordingly.  
- Reconstruct the mixed alphabet by consistent placement as you identify letters.

## Common mistakes
- Treating R1 or R2 as single letters (they are prefixes).  
- Forgetting to skip R1 and R2 positions when filling top row.  
- Mismatching I/J policy between encoding and decoding.

## Quick reference
- Read a digit; if it is R1 or R2, read one more to form RkC.  
- Top row: single-digit letters at all columns except the two row-digit columns.  
- Rows R1 and R2: two-digit codes RkC.

## Practice
1) With R1=3, R2=7 and top row `K E Y _ W O R _ D A`, decode: `1 5 3 4 3 5 9 7 0 7 2`.  
2) Identify likely row digits and segment: `7 1 3 2 5 7 8 0 7 9`.

### Answers
1) `EOHIASU` (given the example board above; your exact board may differ).  
2) Likely R digits: 7 and 3; segmentation: `7,1,3,2,5,7,8,0,7,9` → `7x` pairs at (7,8), (7,9); `3x` pair at (3,2); remaining singles 1,5,0.

