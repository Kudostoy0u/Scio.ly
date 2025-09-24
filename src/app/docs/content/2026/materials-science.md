## Overview
Materials Science links structure to properties and performance. Study by understanding how bonding and microstructure set elastic and plastic behavior, how processing routes change microstructure, and how to read stress–strain data, phase diagrams, and fracture surfaces into succinct engineering conclusions. The mental model to keep is the processing→structure→properties→performance chain.

## Structure and mechanical behavior
Bonding and crystal structure shape stiffness and deformation: metallic bonds and close‑packed structures allow dislocation motion and ductility, while covalent/ionic networks favor stiffness and brittleness. Stress–strain curves tell a compact story—Young’s modulus sets elastic stiffness, the 0.2% offset yield strength marks plastic onset, ultimate tensile strength captures peak load, and area under the curve approximates toughness. Strength rises as dislocations are impeded (work hardening, solid‑solution strengthening, precipitation), as grains get smaller (Hall–Petch trend up to limits), and as microstructures transform (tempering martensite trades hardness for toughness). Ceramics and glasses are flaw‑limited; polymers show viscoelasticity and transitions at Tg and Tm; composites leverage phase synergy.

## Phase diagrams and transformations
Binary phase diagrams map equilibrium phase fields. You read them by drawing tie‑lines at temperature and using lever‑rule geometry to estimate phase fractions, then remembering that real microstructures often reflect non‑equilibrium kinetics. In steels, time–temperature–transformation and continuous‑cooling diagrams guide martensite, bainite, and pearlite formation. The key for competition is to state assumptions (“at equilibrium, ignoring segregation”) and to explain qualitative consequences of cooling rate or composition shifts.

## Measurement and failure
Hardness tests correlate roughly with strength; microhardness reveals phase‑level differences. Fractography distinguishes ductile dimples from brittle river patterns and identifies fatigue beach marks from cyclic loading. Failures are hypotheses you test against evidence: overload, fatigue, brittle fracture at low temperature or high rate, creep at high temperature, or corrosion‑assisted mechanisms.

## Key relationships (qualitative/intro math)
- Stress σ = F/A; Strain ε = ΔL/L0; elastic modulus E ≈ slope in elastic region; toughness ≈ area under σ–ε curve
- Specific properties: specific strength = strength/ρ; specific modulus = E/ρ
- Hall–Petch trend: smaller grains → higher yield strength (up to limits)
- Simple composite upper bound: E_c ≈ V_f E_f + (1−V_f) E_m for aligned fibers

## Failure analysis checklist
- Gather service history, loads, temperatures, and environment
- Examine fracture surfaces and microstructure for ductile vs brittle features, inclusions, and corrosion
- Hypothesize likely mechanism (overload, fatigue, brittle, creep, corrosion‑assisted)
- Verify with hardness, microscopy, and, if in scope, chemistry (EDS) and sectioning

## Worked micro‑examples
- Interpreting σ–ε: E≈70 GPa, σ_y≈250 MPa, UTS≈320 MPa with 20% elongation indicates moderate strength, good ductility, and moderate toughness.
- Lever rule: at T slightly above eutectic, estimate phase fractions from tie‑line endpoints given composition.
- Steel heat treat: quench for martensite (hard, brittle), then temper to restore toughness at the expense of hardness.
- Composite estimate: V_f=0.6 with E_f=70 GPa and E_m=3 GPa gives E_c≈43 GPa as an idealized upper bound.

## Pitfalls
Common errors include confusing strength with stiffness, over‑interpreting hardness as toughness, and misreading phase diagrams by using wrong bases. Stating assumptions and checking against qualitative trends prevents many mistakes.

## Practice prompts
- Propose a process route to double yield strength without destroying ductility and justify mechanisms.
- Use a binary phase diagram to compute phase fractions at a given temperature and composition.
- Explain fatigue features and propose design or process changes to extend life of a rotating shaft.

## References
- SciOly Wiki – Materials Science: https://scioly.org/wiki/index.php/Materials_Science

## Fracture and fatigue
Fracture reflects how cracks initiate and grow under stress. In ductile alloys, microvoid coalescence leaves dimpled fracture surfaces and significant plastic deformation; in brittle ceramics and glasses, cleavage planes and mirror–mist–hackle patterns record rapid crack growth with little plasticity. Fatigue arises under cyclic loads well below the static strength: small surface flaws or stress concentrators nucleate cracks that advance incrementally each cycle, leaving beach marks and striations whose spacing scales with crack growth rate. Life extension strategies reduce local stress (smooth transitions, polish, compressive surface treatments), remove initiation sites, and choose microstructures that blunt cracks (fine grains, second‑phase dispersion) rather than ones that promote long slip bands.

## Creep and time‑dependent deformation
At elevated temperature relative to melting (typically T > 0.4–0.5 Tm in Kelvin for metals), time controls deformation. Primary creep slows as work hardening competes with recovery; secondary (steady‑state) balances mechanisms; tertiary accelerates with necking or damage. Mechanisms include dislocation climb‑controlled creep in metals, grain‑boundary sliding in fine‑grained materials, and diffusional creep (Nabarro–Herring through grains; Coble along boundaries) at low stresses and small grains. Engineering mitigations raise temperature capability (solid‑solution and precipitation strengthening stable at service T), increase grain size for boundary‑controlled mechanisms, add stable dispersoids to pin dislocations and boundaries, and control stress via geometry. Always state assumptions about temperature, stress, and grain size when identifying the dominant regime.

## Corrosion and environment‑assisted damage
Electrochemical corrosion couples anodic metal dissolution and cathodic reactions in an electrolyte. Uniform corrosion thins evenly; galvanic corrosion attacks the less noble metal when dissimilar metals are coupled; pitting and crevice corrosion localize attack where passive films break down; intergranular corrosion follows sensitized boundaries; stress corrosion cracking marries tensile stress with a specific environment to drive brittle‑appearing cracks. Protection combines materials selection (passivating alloys), design (avoid crevices, isolate dissimilar metals), environment control, and coatings/cathodic protection. When analyzing failures, link morphology to mechanism and check for coupled effects such as corrosion‑fatigue.
