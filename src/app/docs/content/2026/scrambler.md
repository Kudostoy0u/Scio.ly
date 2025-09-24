## Overview
Scrambler devices transport an egg to a target quickly and accurately without breakage. Performance hinges on controllable acceleration, precise braking, and straight‑line alignment.

## Motion modeling
- Kinematics: stopping distance depends on pre‑brake speed and brake deceleration; reduce speed variance to stabilize stop distance.
- Energy budget: gravitational/elastic energy → translational + losses (rolling resistance, aerodynamic drag negligible at low speeds). Consistency beats peak speed.

## Braking systems
- Friction brakes: pads on wheels/drums; sensitive to surface and wear; adjustability is key.
- Mechanical stops: string wraps, cams, screw stops; robust but require careful calibration.
- Ramps/wedges: convert forward motion into lifting work; more tolerant to small speed changes; ensure repeatable geometry.

## Alignment and chassis
- Wheel alignment: toe and camber near zero; matched diameters; stiff chassis to prevent torsion under load.
- Mass distribution: lower CG to prevent tipping during braking; symmetric layout reduces yaw bias.
- Guidance: rails vs free‑running; if free, use longer wheelbase and track width for stability.

## Calibration
- Distance tables: command vs measured distance across temperatures/surfaces; interpolate near target; bracket target distances.
- Pre‑run checks: wheel cleanliness, brake reset, starting position and angle; battery/rubber condition if applicable.

## Worked micro‑examples
1) Brake linearization
- If friction brake decel varies with speed, pre‑slow before brake engage using a mild drag to reduce variance at the final brake.

2) Wheel mismatch
- 1% diameter difference across wheels causes curved path; compensate with slight toe or by matching wheels within tighter tolerance.

3) Ramp stop sensitivity
- Raising ramp angle slightly increases vertical work; tune to widen the tolerance band for final stop distance stability.

## Pitfalls
- Over‑optimized for speed with fragile braking repeatability.
- Calibrating on one surface only; ignoring temperature/humidity effects.
- Sloppy starting alignment; inconsistent release forces.

## Practice prompts
- Compare the repeatability of a friction brake vs ramp stop using 10 trials each and analyze variance.
- Design a toe measurement method with simple tools and specify acceptable tolerances.
- Build a distance interpolation method from a calibration table and validate against new targets.

## References
- SciOly Wiki – Scrambler: https://scioly.org/wiki/index.php/Scrambler
