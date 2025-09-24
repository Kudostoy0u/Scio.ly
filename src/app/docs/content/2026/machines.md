## Overview
Machines focuses on simple machines, mechanical advantage (MA), efficiency, and power. Master free‑body diagrams (FBDs), torque balance, multi‑stage systems, and error‑aware calculations.

## Simple machines and relations
- Levers: classes I–III by fulcrum/effort/load positions. Ideal mechanical advantage (IMA) ≈ effort arm / load arm. Torque balance Στ = 0 at equilibrium.
- Pulleys: fixed vs movable; block‑and‑tackle. IMA equals the number of supporting rope segments (ideal). Watch for non‑vertical segments.
- Gears: gear ratio = teeth_driven / teeth_driver = ω_driver / ω_driven = τ_driven / τ_driver (ideal). Idlers change rotation direction only.
- Wheel and axle: IMA ≈ radius_wheel / radius_axle (ideal). Friction in bearings reduces efficiency.
- Inclined plane: IMA ≈ length / height; with friction, effort increases by μN components.
- Screws: IMA ≈ 2πr / pitch (ideal). Include thread friction for realistic torque estimates.

## Efficiency and power
- Actual MA (AMA) = load / effort. Efficiency η = AMA / IMA = (W_out / W_in). Losses from friction, deformation, and misalignment.
- Power P = W / t = τω for rotation; average vs instantaneous distinctions.

## Multi‑stage systems
- Cascading IMA: multiply stage IMAs (ideal), then apply stage efficiencies to estimate AMA.
- Mixed systems: translate pulley output force into lever input, or gear output torque into winch lifting, etc.; keep directions and sign conventions consistent.

## Free‑body diagrams and torque
- Draw forces at correct locations; decompose into components along useful axes; choose pivot to simplify (often at unknown reaction to eliminate it).
- Common supports: pin (Rx,Ry), roller (Ry), smooth surface (normal only), rough surface (normal + friction up to μN).

## Worked micro‑examples
1) Compound pulley with non‑vertical leg
- A 4‑segment support ideally gives IMA=4. If one leg is at 30° to vertical, effective support on that leg = T cos 30°. Sum vertical components to compute effort for a given load and adjust AMA vs IMA.

2) Lever with angled force
- Effort F applied at angle θ to lever arm length L_e; torque = F L_e sin θ. An oblique pull reduces effective torque; recalc required effort for load τ_load at arm L_l.

3) Gear train with belt stage
- Driver gear 12T → driven 36T (3:1) → belt to pulley with diameters 80:40 (2:1 speed‑up). Net speed ratio = 3/2, torque ratio = 2/3 (ideal). With η_gears=0.9, η_belt=0.85, overall η ≈ 0.765.

4) Incline with friction
- Load W up incline angle α with μ_k. Required force F ≈ W (sin α + μ_k cos α). IMA ideal = L/H = 1/sin α; AMA smaller due to friction.

5) Screw jack torque
- To lift load W with screw pitch p and handle radius r (ideal): input work per turn 2πr·F_in = output rise p·W → F_in ≈ (p W)/(2π r η). Include efficiency.

## Measurement and uncertainty
- Propagate uncertainty for products/quotients by adding relative uncertainties; for sums/differences add absolute uncertainties. Report with appropriate sig figs.
- Calibrate spring scales and distances; note zero offsets and parallax.

## Pitfalls
- Counting supporting segments incorrectly in pulley systems with redirecting anchors.
- Ignoring lever arm orientation (using L instead of L sin θ for torque).
- Mixing gear tooth counts with diameter ratios inconsistently.
- Assuming 100% efficiency when data clearly show losses; not distinguishing AMA from IMA.
- Dropping units or mixing N and kgf.

## Practice prompts
- Draw FBDs and compute required effort for a mixed lever–pulley system with given μ and angles.
- Design a gear train to achieve 5:1 torque increase within size constraints; compute output speed and discuss efficiency impacts.
- Given measured input/output forces and distances, compute AMA, IMA, and η with uncertainty.

## References
- SciOly Wiki – Machines: https://scioly.org/wiki/index.php/Machines
