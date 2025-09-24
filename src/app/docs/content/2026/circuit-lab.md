## Overview
Circuit Lab blends pencil‑and‑paper analysis with practical measurement. Approach problems by translating schematics into a small set of relationships, solving with the most efficient method (node‑voltage or mesh‑current), and then sanity‑checking magnitudes and units. In labs, guard against meter loading and range errors, document uncertainty, and de‑energize before rewiring.

## Core analysis ideas
For DC networks, Ohm’s law (V=IR) and Kirchhoff’s laws govern everything: currents into a node sum to zero (KCL), and voltage rises and drops around a loop sum to zero (KVL). Equivalent reductions of series/parallel blocks and source transformations accelerate solutions, but when networks resist reduction, switch to node‑voltage or mesh‑current systematically. Thevenin/Norton equivalents are powerful for any single‑port view: open‑circuit the port to get V_th, short‑circuit to get I_sc, and then de‑activate sources (ideal voltage sources → short, current sources → open) to find R_th. Attach the load and compute currents and voltages in one step.

## Transients and AC in one page
First‑order transients follow exponentials set by a time constant. In RC, a step drives the capacitor voltage toward its final value with v_c(t)=V_f+(V_i−V_f)e^{−t/RC}; in RL, the inductor current does the same with τ=L/R. Remember physical constraints: capacitors cannot jump in voltage, inductors cannot jump in current. In sinusoidal steady state, replace elements by impedances (R, 1/jωC, jωL) and treat the circuit with the same algebra, solving phasors for magnitude and phase. RC low‑pass and high‑pass behaviors fall out immediately by taking the ω→0 and ω→∞ limits.

## Measurement, loading, and uncertainty
Meters are not ideal. A voltmeter in parallel draws a small current set by its input resistance—harmless across low‑impedance sources but a large error across megohm nodes. An ammeter in series introduces burden voltage. Adopt habits: place voltmeters across low‑impedance points when possible, buffer high‑impedance nodes if you can, record instrument resolution/tolerance, and round at the end with appropriate significant figures. Safety is procedural: verify ranges and modes twice, de‑energize before moving leads, and treat charged capacitors like small batteries.

## Worked micro‑examples
- Thevenin reduction: if V_oc=6.0 V and I_sc=30 mA at a port, then R_th=6/0.03=200 Ω; the port is equivalent to a 6 V source in series with 200 Ω.
- RC timing: R=10 kΩ and C=10 μF gives τ=0.1 s; after 0.2 s the exponential term is e^{−2}≈0.135, so the capacitor is within ~14% of its final voltage.
- Meter loading: measuring a 1 MΩ node with a 1 MΩ meter creates a 0.5 MΩ equivalent and halves the indicated voltage; a 10 MΩ meter limits the error to ~9%.

## Pitfalls
- Deactivating sources incorrectly when finding R_th, or mixing series and parallel during equivalent reductions.
- Misplacing meters (ammeter in parallel shorts a source; voltmeter in series opens the path).
- Dropping units or reporting spurious precision that instruments cannot support.

## Practice prompts
- Solve a three‑node circuit by node‑voltage; verify KCL at each node after computing currents.
- Design an RC network that yields a 0.5 s delay and discuss how ±5% component tolerances change the result.
- Measure a 2 MΩ resistor with and without a buffer; compute the loading error in each case.

## References
- SciOly Wiki – Circuit Lab: https://scioly.org/wiki/index.php/Circuit_Lab
