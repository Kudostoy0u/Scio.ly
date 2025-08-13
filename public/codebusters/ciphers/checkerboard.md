# Straddling Checkerboard (Monome-Dinome)

## Explanation
Variable-length numeric substitution. Most-frequent letters get single digits (top row). All others get two-digit codes starting with one of two row digits (R1, R2). Commonly I/J may be combined if desired.

## Solving Method
1. Build mixed alphabet from a keyword (unique letters first, then remaining A–Z; optionally combine I/J).
2. Choose two distinct row digits R1 and R2 (0–9). Label columns 0..9; leave top-row columns at R1 and R2 blank.
3. Fill the top row left→right skipping the two blanks; those letters encode as single digits = their column.
4. Fill remaining letters into two more rows headed by R1 and R2 across columns 0..9; letters here encode as RkC (two digits).
5. Decode a stream by reading one digit; if it equals R1 or R2, read one more digit for RkC; otherwise it’s a top-row letter.

## Tips
- R1/R2 always mark the start of a pair.
- Top-row letters are more common due to single-digit mapping.
- Use frequency and word shapes (THE, AND) on decoded positions.
- If using I/J combined, remember J→I when interpreting plaintext.
- Reconstruct the board visually—columns 0..9 with blanks at R1, R2 in the top row.

## Common Mistakes
- Treating R1 or R2 as a single-digit letter.
- Not skipping R1/R2 columns while filling top row.
- Forgetting I/J policy when matching cribs.
- Assuming fixed R1/R2; they can be any two distinct digits.

## Reference Table
- Columns: 0 1 2 3 4 5 6 7 8 9 (top row blanks at R1 and R2)
- Top row: single digits (skip R1, R2)
- Row R1: two-digit codes R1C
- Row R2: two-digit codes R2C

