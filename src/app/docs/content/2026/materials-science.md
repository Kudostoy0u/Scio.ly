## Overview
Structure–property relationships; polymers, metals, ceramics; testing and failure analysis. Focus on microstructure control, mechanical behavior, processing–structure–properties–performance chain, and applied problem solving.

## Core Topics (coverage target)
- Atomic bonding and crystal structures: metallic, ionic, covalent; FCC/BCC/HCP; defects (vacancies, interstitials, dislocations, grain boundaries)
- Mechanical behavior: stress–strain curves; elastic modulus, yield strength (0.2% offset), UTS, ductility (%EL), toughness (area under curve)
- Strengthening mechanisms: grain size (Hall–Petch concept), solid-solution, work hardening, precipitation hardening; annealing and recrystallization
- Fracture modes: ductile vs brittle; fracture toughness K_IC (qualitative unless formulas given); flaw sensitivity; Griffith concept (qualitatively)
- Fatigue and creep: S–N curves; endurance limit (some steels); creep regimes (primary/secondary/tertiary); temperature and stress effects
- Phase diagrams (binary basics): tie-lines and lever rule; eutectic/eutectoid; TTT/CCT concepts for steels (martensite, bainite, pearlite)
- Polymers: thermoplastics vs thermosets; crystallinity; Tg vs Tm; viscoelasticity basics
- Ceramics and glasses: ionic/covalent bonding; brittleness; flaw control; sintering
- Composites: fiber, particulate, laminates; rule-of-mixtures (qualitative or simple linear estimates)
- Testing and standards: hardness (Rockwell, Vickers), impact (Charpy/Izod), tensile test practice; sample geometry effects

## Key relationships (qualitative/intro math)
- Stress σ = F/A; Strain ε = ΔL/L0; E ≈ slope in elastic region; Toughness ≈ area under σ–ε curve
- Density and specific properties: specific strength = strength/ρ; specific modulus = E/ρ
- Hall–Petch trend (qualitative): smaller grains → higher yield strength, up to limits
- Rule-of-mixtures (simple): E_c ≈ V_f E_f + (1−V_f) E_m (upper bound for aligned fibers)

## Lab/measurement deep dive
- Hardness scales and conversions (qualitative awareness); microhardness for phase-level differences
- Fractography features: dimples (ductile), river patterns/cleavage (brittle), beach marks (fatigue)
- Sample geometry and strain rate effects on σ–ε curves (qualitative)

## Worked examples
1) Interpreting σ–ε: A metal sample shows E≈70 GPa, σ_y≈250 MPa (0.2% offset), UTS≈320 MPa, fracture at 20% elongation. Identify: moderate strength, good ductility, moderate toughness.
2) Lever rule: At a eutectic T+Δ in a binary alloy, compute phase fractions using tie-line endpoints (if composition/diagram provided). State assumptions clearly.
3) Steel heat treat (conceptual): Quench to form martensite (hard, brittle); temper to restore toughness with reduced hardness.
4) Composite estimate: With V_f=0.6, E_f=70 GPa (glass), E_m=3 GPa (polymer), estimate E_c≈0.6·70+0.4·3≈43.2 GPa (idealized upper bound).

## Failure analysis checklist
- Gather: service history, loads, environment, temperature cycles
- Examine: fracture surface (ductile dimples vs cleavage), microstructural anomalies, inclusions, corrosion features
- Hypothesize: overload vs fatigue (beach marks), brittle fracture (low-T, high rate), creep (high T), corrosion-assisted
- Verify: hardness, microhardness, microscopy, chemical/EDS if available (event scope dependent)

## Processing–structure–properties–performance chain
- Processing (e.g., cold work, heat treatment) → Structure (dislocation density, phases, grain size) → Properties (σ_y, E, K_IC, hardness) → Performance (fatigue life, wear)

## Pitfalls
- Confusing strength vs stiffness (σ_y/UTS vs E)  
- Assuming higher hardness always means tougher (often opposite)  
- Misreading phase diagrams (wrong tie-line or composition basis)

## Practice prompts
- Identify strengthening mechanisms for a target: double yield strength while keeping ductility reasonable—propose process route
- Use a provided binary phase diagram to compute phase fractions at a given T
- Explain fatigue failure features and mitigation strategies for a rotating shaft

## References
- SciOly Wiki: https://scioly.org/wiki/index.php/Materials_Science
