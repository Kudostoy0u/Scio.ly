## Overview
Solar System is best approached as comparative planetology: think in terms of processes that recur across bodies—impacts, volcanism, tectonics or its absence, atmosphere–surface interactions, and orbital dynamics—and then explain why each world is similar or different. Study efficiently by tying images and spectra to these processes and by using simple orbital reasoning to bracket scales.

## Comparative planetology
Terrestrial planets share iron‑rich cores and silicate mantles, but they differ in heat budgets and surface renewal: Earth’s plate tectonics continually erases old crust, Venus likely operates a stagnant‑lid regime with catastrophic resurfacing episodes, and Mars preserves a long impact and volcanic record with partially active interior. Gas giants are dominated by hydrogen and helium with deep metallic hydrogen layers (especially Jupiter and Saturn), while Uranus and Neptune are “ice giants,” whose interiors include high‑pressure phases of H₂O, NH₃, and CH₄. Surface geology reflects each body’s energy sources: impact craters record age (fewer craters imply younger surfaces), basaltic plains trace effusive volcanism, massive shields rise where viscosity is low, and dunes or riverbeds appear where winds or liquids can mobilize grains (e.g., Mars and Titan). Atmospheres modulate temperature through greenhouse effects, with Venus as the canonical CO₂‑runaway endmember and Titan as a cold methane analog to Earth’s hydrologic cycle.

## Orbital dynamics and tides
At first order, Kepler’s laws set orbital periods and speeds, which lets you estimate scales quickly. Tidal forces then shape rotations and interiors: synchronous rotation is common among moons, Mercury sits in a 3:2 spin–orbit resonance, and resonant satellite chains (Io–Europa–Ganymede) maintain eccentricities that power tidal heating. The Roche limit explains why rings persist where self‑gravity cannot bind rubble into moons, and why ring particles and shepherd moons interact to sculpt narrow features.

## Magnetism, interiors, and habitability
Planetary magnetic fields arise from convecting, electrically conducting fluids spun by rotation; they carve magnetospheres that deflect solar wind and funnel particles into auroral zones. Dynamo strength and longevity track with internal heat and composition, so small bodies typically lose fields as they cool. Habitability reflects energy balance (insolation and greenhouse gases), long‑term geochemical feedbacks (e.g., carbon–silicate cycle), and liquid water reservoirs. The most compelling subsurface ocean cases—Europa and Enceladus—combine induced magnetic signatures, weakly cratered ice, and plumes that hint at exchange between oceans and the surface.

## Remote sensing and ground truth
Most identifications come from spectra, images, topography, and gravity rather than samples. Multispectral and hyperspectral imagery distinguish minerals and ices by diagnostic absorption bands; radar reveals roughness and topography through backscatter and altimetry; gravimetry constrains interior density distributions; and in‑situ analyses from landers/rovers add composition at specific sites. Link instruments to what they actually measure—e.g., MOLA for Mars topography, Magellan radar for Venus, Cassini RADAR for Titan—and practice reading images with proper attention to scale, illumination, and geometry before inferring processes.

### Spectral interpretation in practice
Treat spectra as fingerprints tied to molecular vibrations and electronic transitions. On airless bodies, continuum‑removed reflectance spectra let you read mafic mineralogy: olivine shows a broad 1 μm absorption centered longer than low‑Ca pyroxenes, while high‑Ca pyroxenes split power between ~1 and ~2 μm bands; increasing Fe shifts bands to longer wavelengths and deepens them. Hydrated phases (phyllosilicates) exhibit OH overtones/combination bands near 1.4 and 1.9 μm with a diagnostic ~2.2–2.3 μm feature; carbonates add a ~3.4–3.9 μm suite. On icy satellites, crystalline H₂O dominates with bands near 1.5 and 2.0 μm and a strong Fresnel peak at 3.1 μm; ammonia‑bearing ices and organics perturb band shapes. In atmospheres, gas absorption lines map composition and temperature via radiative transfer; methane windows on Titan and near‑IR windows on Venus enable glimpses to lower altitudes.

A practical workflow is to: normalize and remove the continuum; measure band centers, depths, and widths; compare against laboratory libraries; and cross‑check with context (albedo, geomorphology, and thermal inertia). Always reconcile spectral inferences with topography and geologic setting to avoid mislabeling coatings or space‑weathered surfaces as primary lithology.

## Worked micro‑examples
- Keplerian scaling: if one moon’s period is four times another’s around the same planet, its semi‑major axis is roughly the cube‑root of 4² ≈ 2.52 times larger (P² ∝ a³).
- Tidal heating: Io’s volcanism follows from forced eccentricity in resonance; Europa’s youthful ice and induced magnetic response argue for a salty ocean.
- Spectral bands: water ice exhibits strong absorptions near ~1.5 and 2.0 μm; hydrated silicates show OH features near 2.2–2.3 μm—use band positions to separate ice from phyllosilicates.

## Pitfalls
- Confusing greenhouse warming with ozone chemistry or albedo effects; treat radiative balance separately from UV shielding.
- Reading images without scale or sun angle, which flips apparent slopes and exaggerates textures.

## Practice prompts
- Compare greenhouse drivers on Venus and Earth and explain the orders‑of‑magnitude surface temperature difference using energy balance logic.
- From two cratered terrains with different crater densities, rank relative ages and discuss resurfacing limits and crater saturation.
- Summarize the lines of evidence for subsurface oceans on Europa and Enceladus and explain the detection methods (induction, geology, plume composition).

## References
- SciOly Wiki – Solar System: https://scioly.org/wiki/index.php/Solar_System
- NASA mission pages (Viking, Cassini, Juno, MRO) for instrument/data summaries

## Case studies (read images like a scientist)
Cassini at Saturn showed how multi‑instrument campaigns knit together processes: radar mapped Titan’s seas and fluvial networks while near‑IR tracked methane clouds and surface windows, and gravity passes constrained interior structure. MRO at Mars combined HiRISE imaging, CRISM spectroscopy, and SHARAD radar to link stratigraphy, hydrated minerals, and shallow subsurface layering, turning color variations into aqueous histories. Juno at Jupiter inverted gravity harmonics and microwave radiometry to reveal a deep, fuzzy core and zonal wind depths, reminding you that “surface” patterns can extend surprisingly far into gas giants. Treat these as templates: name the instruments, state what they measured, and write one sentence that ties measurement to process.
