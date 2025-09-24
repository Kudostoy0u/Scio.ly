## Overview
Write It Do It tests precise technical communication: one partner writes an instruction set for a model; the other reconstructs it without seeing the original. Performance depends on standardized notation, spatial references, and ambiguity control.

## Writer strategies
- Global frame: define a fixed reference (front/back/left/right), orientation (x/y/z), and naming scheme for parts (e.g., BRICK‑2x4‑RED = B24R).
- Inventory: count and list parts with quantities before writing; note duplicates and unique features (studs, holes, colors, lengths).
- Step structure: use short, numbered steps; one action per step; order steps from stable base to details; avoid backtracking.
- Phrasing: avoid vague terms ("a little"); specify positions ("attach centered on the long edge, studs facing up"); use consistent units and counts (studs/holes/pegs).
- Modularity: define subassemblies with names; re‑use references ("attach SUB‑A to SUB‑B at…").
- Error traps: explicitly state symmetry or lack thereof; warn about similar parts ("choose the shorter of the two blue rods").

## Builder strategies
- Pre‑read: scan entire instruction set; lay out parts by category and color; stage subassemblies.
- Parse and confirm: mark completed steps, annotate uncertain phrases, maintain orientation consistently; re‑check counts after each module.
- Stability first: prioritize steps that lock geometry; brace assemblies before handling.

## Notation toolkit (suggested)
- Parts: [NAME]=[TYPE][SIZE][COLOR] (e.g., P1=B24R); provide a legend at top.
- Orientation: +x right, +y forward, +z up relative to base; rotations in 90° increments unless stated.
- Placement: (offset_x, offset_y, offset_z) in studs/holes/units from a defined origin corner.
- Repetition: "Repeat step 7 mirrored across x‑axis"; "Repeat ×4 around z‑axis at 90° increments".

## Common failure modes and fixes
- Ambiguous reference frames → always define front and origin; keep constant.
- Similar parts confusion → preface with a parts key and distinguishing features.
- Large steps with multiple actions → split into atomic steps.
- Unstable partial builds → re‑order steps to create a stable base earlier.

## Worked micro‑examples
1) Symmetry callout
- "Place two B24R parallel, studs up, long edges along +y at offsets (0,0,0) and (0,4,0). Bridge with a B26B centered at y=2." This eliminates mirroring ambiguity.

2) Rotation clarity
- "Rotate SUB‑A 90° about +z (clockwise when viewed from +z) before attachment."

3) Counting studs
- "Attach P3 so its left edge is 1 stud from the −x edge and centered along +y; 4 studs remain visible on each exposed short edge."

## Practice prompts
- Write a 15‑step instruction set for a 10–15 piece model with at least one rotation and one mirror.
- Convert a poorly written set into precise, stepwise instructions; list each ambiguity you removed.
- As builder, annotate the minimal set of clarifications that would have eliminated your errors.

## Pitfalls
- Failing to lock orientation terms; oscillating between color/shape terms without part codes; omitting counts.

## References
- SciOly Wiki – Write It Do It: https://scioly.org/wiki/index.php/Write_It,_Do_It
