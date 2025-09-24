## Overview
Bungee Drop requires predicting cord length so a mass approaches but does not touch a landing surface. Performance depends on modeling cord behavior, careful calibration, and uncertainty control.

## Cord mechanics (qualitative)
- Elasticity: real cords deviate from ideal Hooke’s law (F≈kΔL) due to nonlinearity, hysteresis (different up vs down paths), and rate dependence (viscoelasticity).
- Energy balance: gravitational potential mgh transforms into elastic strain energy and damping. Peak extension occurs when velocity reaches zero; simple Hooke model gives ½k(ΔL)² ≈ mgh (approximate; adjust empirically).
- Multi‑strand cords: effective stiffness scales with strand count (roughly k_total ≈ n·k_single if equal load sharing). Knots and attachments add compliance.

## Calibration strategy
- Build tables: for each mass, record (drop height, required cord length) to hit near target–ε without touching. Fit simple models (linear or quadratic) to estimate required length at new heights.
- Normalize: work with dimensionless ratios (extension/length vs height) to compare cords; track temperature effects.
- Hysteresis handling: pre‑stretch protocol (standard number of pre‑drops) to stabilize behavior before official runs.

## Uncertainty and safety margins
- Error sources: reading drop height, cord length marks, knot slip, mass variation, temperature.
- Margining: choose a small positive clearance margin (e.g., +1–2 cm above target) based on observed variance; err on the safe side.
- Logging: record each trial’s commanded length and measured closest approach; compute mean error and standard deviation; update margin accordingly.

## Construction and markings
- Attachment: consistent closed ring; minimize slippage; mark reference zero consistently.
- Length marks: high‑contrast, fine marks at regular intervals; note parallax; measure under light tension to remove slack.

## Worked micro‑examples
1) Simple fit
- With a 500 g mass, drop height H=3.0 m. Trials show lengths L=[1.58, 1.60, 1.59] m yield clearances [+3, +1, +2] cm. Mean needed for 0 cm ≈ 1.61 m; apply +1.5 cm safety → set L≈1.595 m.

2) Quadratic correction
- Extension E vs H shows slight curvature. Fit E ≈ aH + bH² by two‑point increments; use added term to improve long‑height predictions.

3) Temperature shift
- Cooler gym increases stiffness; extension drops by ~2%. Adjust required length by +2% to preserve clearance.

## Pitfalls
- Calibrating only at one height; extrapolating without testing intermediate points.
- Ignoring hysteresis; failing to pre‑stretch consistently before trials.
- Inconsistent measurement technique (tension, viewpoint) leading to systematic bias.

## Practice prompts
- Design a pre‑stretch protocol to reduce hysteresis effects and validate its impact on variance.
- Build a residual plot of predicted vs observed clearance and propose a better fit or safety margin.
- Compare single‑strand vs two‑strand cords: measure effective stiffness and discuss pros/cons.

## References
- SciOly Wiki – Bungee Drop: https://scioly.org/wiki/index.php/Bungee_Drop
