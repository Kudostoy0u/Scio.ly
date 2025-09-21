# Cryptarithm

A cryptarithm is a mathematical puzzle where letters represent unique digits in an arithmetic equation. The goal is to find the digit-to-letter mapping that makes the equation valid.

## How to Solve

1. **Analyze the equation**: Look at the structure of the addition/subtraction problem
2. **Use the numeric example**: The puzzle provides a solved numeric version to help you understand the letter-to-digit mapping
3. **Apply logical constraints**:
   - Each letter represents a unique digit (0-9)
   - Leading letters cannot be zero
   - Column-wise addition must hold with carries
4. **Map letters to digits**: Use the provided grid to assign digits to letters
5. **Decode the message**: Use your mapping to decode the number strings into words

## Example

Given the cryptarithm:
```
  E A T
+ T H A T
---------
A P P L E
```

With the numeric example:
```
  8 1 9
+ 9 2 1 9
---------
1 0 0 3 8
```

**Solution Process:**
- From the numeric example: E=8, A=1, T=9, H=2, P=0, L=3
- Verify the addition: 819 + 9219 = 10038 ✓
- Decode the digit groups: 2 8 1 9 → H E A T, 9 2 8 → T H E, 0 3 1 9 8 → P L A T E
- Final answer: "HEAT THE PLATE"

## Tips

- Start with the rightmost column and work leftward
- Pay attention to carries between columns
- Use the hint to verify your decoded message makes sense
- Remember that leading letters cannot be zero

## Video Tutorial

<iframe width="560" height="315" src="https://www.youtube.com/embed/qwikGHbIbwM" title="Cryptarithm Tutorial" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
