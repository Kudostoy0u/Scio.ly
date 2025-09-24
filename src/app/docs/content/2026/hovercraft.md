## Overview
Hovercraft performance depends on stable lift generation, efficient thrust, and controllable tracking. The craft rides on a pressurized air cushion contained by a skirt; design choices balance leakage, stability, and energy use.

## Lift physics
- Cushion pressure: supports weight W over effective cushion area A → p_c ≈ W/A. Higher pressure allows smaller area but increases skirt loads and leakage sensitivity.
- Leakage and plenum: lift fans supply volumetric flow Q; leakage through skirt gaps/holes requires Q to maintain p_c. Too little Q → sag and ground contact; too much → wasted power.
- Skirt compliance: flexible skirts accommodate surface irregularities; segmented/single‑bag designs trade stability and drag.

## Skirt design
- Hole sizing/placement: distribute small holes for uniform pressure; edge leakage provides restoring forces against tilt.
- Materials: low‑friction, durable fabrics; seam strength and airtightness are critical.
- Geometry: keep skirt height modest to reduce rocking; add internal baffles for stability when allowed.

## Thrust and steering
- Propulsor: match prop pitch/diameter to motor curve; shrouds/nozzles can raise static thrust; avoid stall at operating point.
- Ducting: minimize turns and separation; smooth inlets/outlets reduce losses.
- Control: rudders/vanes deflect flow; differential thrust or vectoring improves yaw authority; CG forward of thrust line reduces pitch coupling.

## Mass and balance
- Center of gravity: too high → roll instabilities; too far aft → pitch‑up under thrust. Keep mass low and centralized.
- Structural stiffness: rigid deck prevents oscillations; isolate motor vibrations.

## Calibration and logs
- Lift margin test: record cushion pressure vs added mass until skirt contact; ensure reserve margin for variability.
- Thrust tests: measure acceleration and top speed over known distances; build a repeatable run protocol.
- Environment: floor texture, seams, and drafts alter drag and leakage; document conditions.

## Worked micro‑examples
1) Cushion pressure estimate
- Craft mass 0.45 kg → W ≈ 4.41 N. Effective area 0.030 m² → p_c ≈ 4.41/0.03 ≈ 147 Pa. Ensure lift fan can maintain this with leakage.

2) Leakage intuition
- Doubling skirt gap height increases leakage roughly with area and velocity through the opening; small gap increases stability but demands more Q. Tune hole area to balance.

3) CG shift
- Moving battery 30 mm forward reduces pitch oscillation under throttle; verify by measuring nose height changes at fixed thrust.

## Pitfalls
- Over‑inflated skirt causing lift “pogo” and directional loss.
- Sharp duct bends and rough edges reducing thrust dramatically.
- Ignoring skirt seam leaks; small pinholes compound and drop cushion pressure.

## Practice prompts
- Design a hole pattern for a rectangular skirt and justify spacing for uniform pressure.
- Propose a duct and rudder layout minimizing losses while maximizing yaw authority.
- Create a lift margin test plan and acceptance criteria based on mass and pressure.

## References
- SciOly Wiki – Hovercraft: https://scioly.org/wiki/index.php/Hovercraft
