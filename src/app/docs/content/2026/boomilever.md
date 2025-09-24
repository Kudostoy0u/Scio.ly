## Overview
Boomilever structures maximize load supported per unit mass. Performance depends on efficient geometry, material properties, and joint quality.

## Structural mechanics
- Load paths: map forces from load point to wall attachment via tension and compression members; minimize bending in tension members.
- Compression stability: Euler buckling risk increases with slenderness λ = L/k; increase area moment of inertia I (e.g., box/triangular sections, bracing) rather than only adding mass.
- Shear and local failures: joint peel and shear at interfaces; bearing stresses around fasteners or hooks; introduce gussets/fillets where stress concentrates.

## Materials and joints
- Wood selection: straight grain, low defect density; weigh sticks to sort by density; orient grains along principal stress directions.
- Adhesives: surface prep (fresh, clean, lightly sanded); controlled glue line thickness; cure time and humidity influence.
- Joint types: lap and scarf joints distribute stress better than butt joints; avoid prying configurations.

## Geometry and optimization
- Triangulation: convert bending into axial loads; avoid long unsupported compression members.
- Cross‑sections: place material far from neutral axis to raise I; use thin webs with flanges (I‑like behavior) where rules allow.
- Attachment: wall brace geometry influences moment arm; minimize lever arm for compression members to reduce required capacity.

## Testing and calibration
- Subcomponent testing: column coupons for buckling; joint shear/peel tests; collect strength vs mass data.
- Full tests: record load vs deflection; identify first failure location; iterate geometry and joints accordingly.
- Environmental control: humidity swings alter wood strength and mass; condition and store builds consistently.

## Worked micro‑examples
1) Column buckling estimate (qualitative)
- Halving unsupported length roughly quadruples buckling load (P_cr ∝ 1/L²), holding cross‑section constant.

2) Joint redesign
- A butt joint at a high‑moment location fails early; replacing with overlapping lap joint and gusset increases shear area and shifts failure elsewhere.

3) Mass placement
- Moving 10% of mass from web to flanges increases I disproportionately, improving stiffness without increasing total mass.

## Pitfalls
- Over‑gluing (heavy joints) without strength benefit; brittle glue lines from rushed curing.
- Ignoring grain orientation; placing knots/defects in compression members.
- Focusing only on ultimate load instead of efficiency (load/mass) across iterations.

## Practice prompts
- Sketch a triangulated boomilever with indicated tension/compression members and justify member sizing.
- Propose a joint detail that reduces peel stress at the wall plate.
- Design an experiment to compare compression member buckling for different bracing spacings.

## References
- SciOly Wiki: https://scioly.org/wiki/index.php/Boomilever
