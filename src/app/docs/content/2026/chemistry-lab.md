## Overview
Advanced chemistry: stoichiometry, equilibrium, kinetics, thermodynamics, acid–base, and lab techniques. Emphasis on fast, unit-checked calculations; safe technique; and clear, concise reasoning.

## Core Topics (coverage target)
- Stoichiometry: limiting/excess reagents; percent yield; solution prep (molarity, dilution M1V1=M2V2)
- Equilibrium: K_c/K_p; ICE/ICEE tables; reaction quotient Q; Le Châtelier (qualitative)
- Kinetics: initial rates; rate laws and orders; linearized integrated forms; temperature dependence (Arrhenius qualitatively)
- Thermodynamics: calorimetry (q=mcΔT); Hess’s law; sign conventions; ΔG=ΔH−TΔS; spontaneity vs kinetics
- Acid–base: strong/weak; Ka/Kb; pH, pOH; buffers (Henderson–Hasselbalch); titration curves and equivalence points
- Lab techniques: titration endpoints (visual/indicator); filtration; weighing; glassware reading; error/uncertainty

Extended topics (AP Chem depth)
- Electrochemistry: galvanic vs electrolytic cells; standard potentials E°; Nernst equation (qualitative/plug if constants provided); cell diagrams; Faraday’s law for electrolysis
- Solubility equilibria: Ksp; common ion effect; selective precipitation order; fractional precipitation reasoning
- Thermochemistry: standard enthalpies of formation; bond energies (qualitative); calorimetry with solution and calorimeter heat capacities combined
- Gas laws and kinetic theory: ideal gas law; Dalton’s law; partial pressures; deviations (Van der Waals conceptually)
- Molecular structure and IMFs: VSEPR shapes; polarity; hydrogen bonding, dipole, dispersion; periodic trends and their property implications
- Acid–base titrations: polyprotic systems; buffer capacity; granular selection of indicators

## Skills
- Set up dimensional analysis; track significant figures and units
- Build ICE tables quickly; select correct approximations (x<<C) and verify
- Sketch titration curves; identify buffer regions and equivalence; choose indicators
- Record data in structured tables; estimate uncertainties; propagate when required

## Equations and references
- n = m/M; C = n/V; M1V1=M2V2; % yield = actual/theoretical × 100%
- K = [products]^coeff/[reactants]^coeff; Q vs K to predict direction
- pH = −log[H+]; pOH = −log[OH−]; pH + pOH = 14 (at 25°C); Henderson–Hasselbalch: pH = pKa + log([A−]/[HA])
- q = mcΔT; calorimeter constant addition when provided
 - Nernst (if constants provided): E = E° − (0.0592/n) log(Q) at 25°C; ΔG° = −nFE°

## In‑depth guide

### Stoichiometry and solution chemistry
Stoichiometry links the particulate picture (molecules, ions) to measurable lab quantities (mass, volume). Always begin by writing a balanced equation and identifying the limiting reagent by converting all reactants to moles and comparing required mole ratios to available amounts. Percent yield contextualizes experimental losses by comparing actual to theoretical yield. In solution chemistry, concentration is typically expressed as molarity (moles per liter). Dilutions conserve moles, so M1V1 = M2V2 holds provided volumes are additive and temperature effects are negligible. For mixtures of solutions with reacting species, compute moles of each reactant present after mixing (accounting for new total volume) and proceed with limiting-reactant logic; for nonreacting solutes, perform simple dilution before subsequent equilibria.

Common pitfalls include forgetting that strong electrolytes dissociate completely (e.g., 0.10 M CaCl2 provides 0.10 M Ca2+ and 0.20 M Cl−) and neglecting spectator ions when writing net ionic equations. When gases evolve (CO2 from carbonates with acids) or precipitates form, translate observations into moles via ideal gas relations (if given P, V, T) or stoichiometric mass from filtered solids.

### Chemical equilibrium and problem strategy
Equilibria quantify how far reactions proceed under given conditions. The thermodynamic reaction quotient Q uses instantaneous activities (approximated by concentrations for dilute solutions and partial pressures for ideal gases) with exponents equal to stoichiometric coefficients. If Q < K, the reaction shifts forward until Q = K; if Q > K, it shifts backward. ICE/ICEE tables organize unknown changes (x) from a defined initial state to equilibrium; when K is very small or very large, justified approximations (e.g., x ≪ C0) accelerate solutions—verify by comparing obtained x to C0. For gas-phase systems, relate Kp and Kc via Kp = Kc (RT)^Δn. Le Châtelier’s principle provides qualitative predictions: adding a reactant drives product formation; increasing pressure favors the side with fewer gas moles; increasing temperature favors the endothermic direction (treat heat as a reagent).

Coupled equilibria (acid–base plus solubility; complexation; buffer systems) require identifying the dominant process at the relevant pH/ionic strength. For competitive equilibria, compare formation constants/log K to gauge predominant species, then solve the controlling equilibrium first and refine if necessary.

### Kinetics and rate laws
Kinetics describes how fast reactions approach equilibrium. Initial-rate experiments infer the differential rate law rate = k[A]^m[B]^n by comparing how rate changes with systematic concentration changes. Integrated rate laws enable straight-line plots to test orders (first order: ln[A] vs t; second order: 1/[A] vs t). Half-life expressions provide quick order checks (first order t1/2 independent of [A]0). Temperature accelerates reactions by increasing the Arrhenius factor, k = A e^{−Ea/RT}; plotting ln k vs 1/T yields a slope of −Ea/R. In lab contexts, linearization and careful axis labeling gain points even when raw data are noisy; discuss sources of scatter (mixing, temperature drift, timing precision) and their likely impact on k.

### Thermodynamics (ΔH, ΔS, ΔG) and calorimetry
State functions control spontaneity: ΔH reflects heat flow at constant pressure, ΔS measures dispersal of energy/matter, and ΔG = ΔH − TΔS predicts spontaneity (ΔG < 0 at constant T, P). Hess’s law supports enthalpy arithmetic using tabulated ΔHf°. In calorimetry, the measured temperature change reflects the balance of heat lost and gained: q_total = q_solution + q_calorimeter + q_reaction = 0. Use q = mcΔT for each component, including a calorimeter constant when provided, and report molar enthalpy by dividing by moles of limiting reactant. Discuss assumptions (adiabaticity, negligible heat losses, constant heat capacity) and how deviations bias ΔH.

### Acid–base chemistry and buffer design
Strong acids/bases dissociate completely; weak acids/bases establish Ka/Kb equilibria. For a monoprotic weak acid HA, [H+] ≈ √(Ka C) holds when Ka ≪ C; verify by checking x/C < 5%. Buffers resist pH change within ~±1 pH unit of pKa, governed by Henderson–Hasselbalch: pH = pKa + log([A−]/[HA]). Effective buffers require sufficient capacity, roughly proportional to the absolute concentrations of conjugate pairs; articulate capacity limits when adding strong acid/base in titration problems. Polyprotic systems have stepwise dissociations with well-separated pKa values; identify the dominant form at a given pH to simplify calculations. When titrating weak acids with strong base, the equivalence point pH exceeds 7 due to conjugate base hydrolysis; at half-equivalence, pH ≈ pKa (a powerful experimental method to estimate pKa).

### Titrations, indicators, and curve interpretation
Acid–base titration curves encode underlying equilibria. Before equivalence, buffer behavior dominates; at equivalence, stoichiometry fixes the composition; after equivalence, excess titrant controls pH. Choose indicators whose transition range lies on the steep portion near equivalence (phenolphthalein for weak acid–strong base; methyl orange for strong acid–weak base as permitted). Back titrations quantify species that react slowly or form precipitates by reacting to completion with excess reagent, then titrating the remaining excess. Standardization against primary standards (e.g., KHP) ensures accurate normality when titrants age or absorb CO2.

### Electrochemistry (cells, potentials, and Nernst)
Galvanic cells convert chemical potential to electrical work; electrolytic cells drive nonspontaneous reactions. Represent cells as Anode|Anode solution||Cathode solution|Cathode; electrons flow anode → cathode, and cations migrate through the salt bridge to balance charge. Standard potentials E° reference the standard hydrogen electrode and combine via E°cell = E°cath − E°an. Under nonstandard conditions, the Nernst equation quantifies how concentration (activities) shifts potentials: E = E° − (0.0592/n) log Q at 25 °C. Concentration cells (identical half-reactions with different concentrations) have E° = 0 but nonzero E by the Nernst term. For electrolysis, Faraday’s law links charge passed to moles plated: n = Q/(n_e F). Always state sign conventions and identify oxidized/reduced species.

### Solubility equilibria, selective precipitation, and pH dependence
The solubility product Ksp describes the product of ion activities at equilibrium for sparingly soluble salts. In the presence of a common ion, solubility decreases; compute s from Ksp with the common ion concentration included. Selective precipitation separates ions by adding a precipitating ion slowly so that the lowest Ksp (or lowest threshold concentration) precipitates first; show work comparing ion concentrations required to exceed Ksp. Amphoteric hydroxides dissolve in strong base by forming complex ions (e.g., Al(OH)4−), and many salts exhibit pH-dependent solubility via protonation/deprotonation; link these effects to Le Châtelier’s principle.

### Gases, real behavior, and mixtures
Ideal gases follow PV = nRT with partial pressures adding per Dalton’s law. Collecting gases over water requires vapor-pressure corrections. Real gases deviate at high P/low T due to intermolecular forces and finite molecular volume, captured qualitatively by van der Waals corrections. Kinetic molecular theory explains trends (e.g., lighter gases effuse faster per Graham’s law). When problems combine gas equilibria and stoichiometry, keep units consistent and convert between concentrations and partial pressures as needed.

### Molecular structure and intermolecular forces
VSEPR predicts molecular geometry from electron domains; polarity follows from geometry and bond dipoles (e.g., CO2 nonpolar despite polar bonds). Intermolecular forces—dispersion, dipole–dipole, hydrogen bonding—govern boiling points, viscosities, and solubilities. Periodic trends (atomic radius, ionization energy, electron affinity) rationalize reactivity patterns and lattice energies. In qualitative explanations, connect IMF strength to observed bulk properties succinctly.

### Analytical techniques often seen in labs (as allowed)
Beer's law relates absorbance to concentration, A = ε b c, enabling spectrophotometric determinations via calibration curves; discuss linear range and sources of deviation (stray light, chemical equilibria). Simple conductometric or pH-metric titrations track endpoints instrumentally. For gravimetric analysis, drying to constant mass and handling hygroscopic salts are critical to accuracy.

### Error analysis and reporting
Differentiate random (precision) from systematic (accuracy) errors. Propagate uncertainty when combining measurements (addition/subtraction adds absolute uncertainties; multiplication/division adds relative). Report results with appropriate significant figures and units, and interpret residuals when fitting straight lines (e.g., integrated rate or Beer's law). In conclusions, tie numerical answers back to chemical reasoning and state limitations explicitly.

## Titration specifics (acid–base)
- Strong–strong: equivalence at pH ~7; steep jump—many indicators work
- Weak acid–strong base: initial buffer region; equivalence pH > 7; choose phenolphthalein; pKa at half-equivalence (pH ≈ pKa)
- Weak base–strong acid: mirror logic; methyl orange or similar indicator depending on curve
- Back titration and standardization concepts; primary standards (e.g., KHP)

## Worked examples
1) Limiting reagent: 10.0 g CaCO3 with 0.300 mol HCl (2 HCl per CaCO3). Compute product moles CO2 and excess.
2) Weak acid pH: 0.10 M HA, Ka=1.8×10−5 → [H+]≈√(Ka·C)=1.34×10−3 → pH≈2.87 (verify x<<C)
3) Buffer after addition: 50.0 mL 0.20 M acetic acid + 30.0 mL 0.20 M acetate → use moles to compute ratio, then HH equation.
4) ICE with K: A⇌2B, K=4.0, start A0=1.0 M; solve x; check for quadratic vs approximation validity.
5) Strong–strong titration: 25.00 mL 0.100 M HCl titrated with 0.100 M NaOH → equivalence at 25.00 mL; pH ~7.00; at 20.00 mL, excess acid: n_H+= (2.5−2.0) mmol → [H+]=0.5 mmol / 45 mL ≈ 0.0111 M → pH≈1.95
6) Ksp/common ion: Ksp(PbCl2)=1.6×10−5; in 0.10 M NaCl, s for PbCl2 satisfies Ksp = s(0.10+2s)^2 ≈ s(0.10)^2 → s≈1.6×10−3 M
7) Electrochem: Cell Zn|Zn2+ (1 M)||Cu2+ (1 M)|Cu: E°=E°red(Cu2+/Cu)−E°red(Zn2+/Zn)≈0.34−(−0.76)=1.10 V; ΔG°=−nFE°≈−2·96485·1.10≈−212 kJ/mol

## Lab technique checklist
- Rinse buret with solution; eliminate bubbles; read meniscus at eye level; record to 0.01 mL when appropriate
- Standardize solutions if needed; run blanks; record temperature for density corrections when required
- Calorimetry: insulate; correct for heat capacity of calorimeter if given; extrapolate to mixing time for best ΔT

## Pitfalls
- Dropping significant digits mid-calculation; forgetting activity assumptions; using wrong indicator range
- Mixing intensive/extensive properties (ΔH vs q); wrong sign conventions

## Practice prompts
- Construct an ICE table for a weak base and compute pH; choose an appropriate indicator for its titration with strong acid
- Calorimetry mixture problem with non-negligible calorimeter constant; compute ΔH per mole

## References
- SciOly Wiki: https://scioly.org/wiki/index.php/Chemistry_Lab
