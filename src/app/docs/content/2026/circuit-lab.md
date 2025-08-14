## Overview
DC/AC fundamentals with analysis and measurements: Ohm’s law, KCL/KVL, series/parallel, transient basics.

## Core Topics
- Ohm’s law; power; energy  
- Series/parallel, voltage dividers, bridges  
- KCL/KVL; Thevenin/Norton (C)  
- Capacitors/inductors (RC/RL/RLC basics)  
- Measurement technique and uncertainty

## Skills
- Solve and build simple circuits  
- Read meters; estimate uncertainty and sig figs

## DC analysis toolkit
- Series/parallel reductions; voltage/current dividers; bridge circuits (Wheatstone) when balanced
- Node-voltage and mesh-current methods for multi-loop circuits
- Thevenin/Norton equivalents: find open-circuit V_th and short-circuit I_sc; R_th by deactivating sources

## Transients and AC (scope-dependent)
- RC: v_c(t) = V_final + (V_initial − V_final)e^{−t/RC}; time constant τ=RC
- RL: i_L(t) analogous with τ=L/R
- Reactance: X_C = 1/(2πfC), X_L = 2πfL; Z series = ΣZ; parallel via admittance

## AC power (intro if allowed)
- Instantaneous vs average power; for sinusoidal steady-state with phase φ: P_avg = V_rms I_rms cosφ; reactive Q = V_rms I_rms sinφ; |S| = V_rms I_rms, power factor = cosφ.
- Resonance in RLC (series): f_0 ≈ 1/(2π√(LC)); bandwidth and Q-factor concepts (qualitative unless formulas provided).

## Measurement and uncertainty
- Meter loading: finite input resistance affects readings—use high-impedance meters across high-resistance nodes
- Significant figures and propagation: keep one extra guard digit in calc; round at end
- Safety: de-energize before reconfiguring; check meter mode/range twice (avoid fuse blows)

## Worked examples
1) Divider: 12 V source with R1=2 kΩ, R2=4 kΩ → V_out across R2 = 12×(4/(2+4))=8 V
2) Thevenin: network seen by load has V_oc=5 V and I_sc=10 mA → R_th=V/I=500 Ω
3) RC step: 10 V step into R=1 kΩ, C=100 µF → τ=0.1 s; v_c(τ) ≈ 6.32 V (63.2%)
4) AC: R=100 Ω in series with C=10 µF at 60 Hz → X_C≈265 Ω; |Z|≈√(100²+265²)≈283 Ω; I≈V/|Z|

## Problem-solving checklist
- Draw schematic neatly; label knowns; choose method (divider/KCL/KVL)
- Compute with units; sanity-check extremes (open/short limits)
- State final answers with units and appropriate sig figs

## References
- SciOly Wiki: https://scioly.org/wiki/index.php/Circuit_Lab
