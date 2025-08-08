# Astronomy (2026)

Division: C  
Type: Study (Data/Images)  
Participants: 2–3  
Approx. Time: 50 minutes  
Allowed Materials: Binder/notes, Class I calculator (confirm)

## Overview
Competition astrophysics with emphasis on stellar structure and evolution, HR diagrams, spectra/photometry, distance ladder and standard candles, galaxy properties, and cosmology basics. Strong focus on interpreting plots (HR/CM diagrams, spectra, light curves) and performing fast calculations.

## Core Topics
- Stellar Astrophysics: spectral classes (OBAFGKM), luminosity classes (I–V), HR diagram, lifecycles (protostar → main sequence → giants → endpoints), binaries and mass.
- Photometry and Spectroscopy: magnitudes and colors, extinction/reddening, blackbodies, line identification, Doppler shift.
- Distances and Standard Candles: parallax, distance modulus, Cepheids, RR Lyrae, Type Ia supernovae (concept), main-sequence fitting.
- Galaxies and Cosmology: Hubble tuning fork, star-formation indicators, scaling relations (Tully–Fisher, Faber–Jackson), Hubble–Lemaître law and redshift.
- Instruments and Coordinates: telescopes, resolution, filters (UBVRI, SDSS), RA/Dec and galactic coordinates; survey missions.

## Learning Objectives
- Read and annotate HR and color–magnitude diagrams; infer stellar properties/ages.
- Identify spectral types from continuum shape and lines; estimate temperatures via Wien’s law or color.
- Compute distances (parallax, distance modulus) and flux/luminosity relations.
- Interpret light curves (variables, transits) and radial velocity curves.
- Classify galaxies and use simple relations to estimate masses/velocities.

## Essential Relationships and Equations
- Blackbody peak (Wien): λ_max ≈ 2.897×10^−3 m·K / T
- Stefan–Boltzmann: L = 4πR^2 σT^4; Flux at Earth: F = L / (4πd^2)
- Magnitudes: m2 − m1 = −2.5 log10(F2/F1); Absolute vs. apparent: m − M = 5 log10(d/10 pc)
- Parallax: d(pc) = 1 / p(arcsec)
- Doppler (non-relativistic): Δλ/λ ≈ v_rad / c; z ≈ v/c for small z
- Small-angle: physical size S ≈ θ(rad) × d; with θ(arcsec): S ≈ (θ/206265) × d
- Kepler (binary; solar units): M_total(M☉) ≈ a^3(AU) / P^2(yr)

## Stellar Astrophysics
- Spectral sequence: O–B–A–F–G–K–M (hot → cool). Typical T: O (>30,000 K), B (10–30k), A (7.5–10k), F (6–7.5k), G (5–6k), K (3.5–5k), M (<3.5k). Mnemonic of choice.
- Luminosity classes: I (supergiants), III (giants), V (main sequence). Combined types (e.g., G2V Sun) specify temperature and gravity.
- HR diagram: luminosity vs. temperature (or absolute magnitude vs. color). Main sequence slope reflects mass–luminosity relation (roughly L ∝ M^3–4 for MS). Giants/supergiants upper-right; white dwarfs lower-left.
- Evolution highlights: massive stars evolve quickly off MS to supergiants → core-collapse SNe → neutron stars/black holes; solar-like stars become red giants → planetary nebulae → white dwarfs.
- Clusters: open (young, metal-rich, in disk); globular (old, metal-poor, in halo). Age from turnoff point on CMD; distance via main-sequence fitting.
- Variable stars: Cepheids (Period–Luminosity; bright, extragalactic), RR Lyrae (standard candles in globular clusters), eclipsing binaries (yield radii, inclination, masses with RVs).

## Photometry and Spectroscopy
- Magnitude systems: apparent m, absolute M at 10 pc; color indices (B−V, g−r) trace temperature and reddening.
- Extinction and reddening: E(B−V) = (B−V)_obs − (B−V)_intrinsic; A_V ≈ R_V E(B−V) with R_V ≈ 3.1 (Milky Way average).
- Filters: Johnson–Cousins (U B V R I), Sloan/SDSS (u g r i z); near-IR (J H K). Be aware of bandpasses when interpreting SEDs.
- Spectral lines: Balmer (Hα 6563 Å, Hβ 4861 Å) strong in A-type; ionized/neutral metals trace temperatures and compositions; emission lines indicate hot gas/star formation (H II regions), [O III] strong in planetary nebulae.
- Doppler shift: identify systemic velocity and broadening; double lines in spectroscopic binaries indicate two components.

## Distances and Standard Candles
- Parallax (Gaia): reliable to kpc for bright stars; beyond that, use ladder methods.
- Distance modulus: m − M = 5 log10(d/10 pc); rearranged d(pc) = 10^{(m−M+5)/5}.
- Main-sequence fitting: shift cluster CMD to match a calibrated sequence; vertical offset gives distance modulus (account for extinction).
- Cepheid PL relation: longer period → brighter absolute magnitude; RR Lyrae have near-constant M_V (~+0.6–0.8 with metallicity dependence).
- Type Ia SNe (conceptual): standardized candles for cosmological distances (light-curve shape corrections not required here).

## Galaxies and Cosmology
- Morphology: ellipticals (E0–E7), lenticulars (S0), spirals (Sa–Sd; barred SB), irregulars. Blue colors/spiral arms indicate star formation; ellipticals are red and quiescent.
- Scaling relations: Tully–Fisher (spiral’s luminosity vs. rotation speed), Faber–Jackson (elliptical’s luminosity vs. velocity dispersion)—useful for rough distance estimates.
- Star-formation indicators: Hα emission, UV continuum, FIR dust emission; 21-cm maps trace HI gas; CO lines trace molecular gas.
- Hubble–Lemaître law: v = H0 d (z ≈ v/c at small z). Example H0 ≈ 70 km/s/Mpc. At higher z, use cosmological relations conceptually.
- Large-scale structure: clusters, filaments, voids (qualitative recognition).

## Instruments and Coordinates
- Coordinates: Right Ascension (RA, hours) and Declination (Dec, degrees); galactic coordinates (l, b) aligned with Milky Way plane.
- Telescopes: angular resolution θ ≈ 1.22 λ/D (radians). Larger D → better resolution and more light-gathering power.
- Detectors/filters: CCDs, narrowband/broadband filters; false-color compositing across bands (optical/IR/X-ray) highlights different physics.
- Key missions/surveys: HST, JWST, Chandra, XMM-Newton, GALEX, WISE, SDSS, Pan-STARRS, Gaia, LSST/Vera Rubin (survey depth/cadence), ALMA (mm), VLA (radio).

## Calculations (worked examples)
- Distance modulus: a star with m = 9.0 and M = 4.0 → m − M = 5 → d = 10^{(5+5)/5} = 100 pc.
- Wien: T = 6000 K → λ_max ≈ 2.897×10^−3 / 6000 ≈ 4.83×10^−7 m (≈483 nm, blue-green).
- Stefan–Boltzmann scaling: if T doubles and R fixed, L increases by 2^4 = 16×. If R doubles and T fixed, L increases by 4×.
- Parallax: p = 5 mas (0.005 arcsec) → d = 1/0.005 = 200 pc.
- Doppler: Hα observed at 6568 Å vs rest 6563 Å → Δλ/λ ≈ 5/6563 ≈ 7.6×10^−4 → v ≈ 0.00076 c ≈ 228 km/s (receding).
- Binary mass (solar units): eclipsing binary with a = 1 AU, P = 1 yr → M_total ≈ 1 M☉. If RV shows equal masses, each ≈ 0.5 M☉.
- Angular size: galaxy diameter 30 kpc at 10 Mpc → θ ≈ S/d = 0.003 rad ≈ 0.003×206265 ≈ 619 arcsec (≈10.3′).

## Data and Image Skills
- HR/CMD: locate main sequence, turnoff, red giant branch; infer age/distance.
- Spectra: identify continuum shape and lines to classify type, temperature, and velocity shift.
- Light curves: determine periods (Cepheids/RR Lyrae), identify eclipses/transits, estimate depths/radii ratios for transits (ΔF ≈ (Rp/R⋆)^2).
- Galaxy images: distinguish spirals vs. ellipticals, bars, inclination, dust lanes, star-forming regions.
- Multiwavelength: match features across optical/IR/UV/X-ray to infer physical processes (e.g., X-ray hot gas in clusters, IR dust emission in starbursts).

## Deep dives
### HR diagram reasoning
- Isochrone concepts: turnoff position indicates cluster age; metallicity shifts sequences—bluewards for low Z.
- Degeneracy: reddening vs intrinsic color changes—use spectroscopic lines or multi-band data to separate.

### Spectra classification tricks
- A-type: strong Balmer; F/G: metal lines grow; K/M: molecular bands (TiO) appear; emission indicates hot gas/active regions.

### Distance ladder caveats
- Extinction corrections alter distance modulus; use color excess where available. Parallax uncertainties blow up beyond a few kpc—prefer standard candles.

### Variable stars (Cepheids/RR Lyrae)
- Period–Luminosity (qualitative usage): longer period → brighter. Distinguish Type I vs II Cepheids (metallicity/PL differences). RR Lyrae nearly standard candles in old populations.

### Exoplanet transits (intro)
- Depth ΔF ≈ (Rp/R⋆)^2; duration and period give hints of orbital size (Kepler) and inclination (if allowed). Combine with RV amplitude conceptually for mass/radius.

### Galaxy scaling relations
- Use TF (spirals) and FJ (ellipticals) qualitatively to rank luminosities; do not overfit without calibration constants provided in the problem.

## Observation planning (qualitative)
- Resolution vs aperture tradeoffs; seeing limited vs diffraction limited regimes; filter selection for target science (e.g., Hα for H II regions).

## Expert notes (Division C reach)
- Metallicity effects on PL relations (qualitative) and CMD morphology (blue horizontal branch in metal-poor clusters).
- AGN vs starburst diagnostics (qualitative): line ratios (BPT concept), IR vs X-ray signatures; avoid quantitative unless provided.
- Gravitational lensing (qualitative): arcs and multiple images; time delays indicate mass models.

## Practice Prompts
1) A cluster CMD is offset by +4.2 mag relative to a calibrated MS. Estimate the distance (ignore extinction), then discuss how reddening would alter your estimate.
2) An A-type star shows strong Balmer lines and B−V = 0.0. Estimate its temperature and explain whether interstellar reddening is significant.
3) A spiral galaxy has a 21-cm HI rotation half-width of 200 km/s. Use Tully–Fisher qualitatively to infer relative luminosity compared to a 100 km/s spiral.
4) A light curve shows periodic 1% dips every 3 days with flat bottoms and RV semi-amplitude of 100 m/s. Explain a consistent star–planet configuration.
5) An emission-line galaxy has Hα at z = 0.02. Estimate its distance with H0 = 70 km/s/Mpc (small-z approximation).

## Glossary
- Absolute magnitude (M): brightness at 10 pc. Apparent magnitude (m): observed brightness.
- Color excess E(B−V): measure of reddening by dust; A_V ≈ 3.1 E(B−V) in MW average.
- HR diagram: luminosity vs. temperature; CMD: magnitude vs. color.
- Redshift (z): fractional wavelength increase due to recessional velocity/expansion.
- Standard candle: object with known luminosity for distance estimation.

## References
- SciOly Wiki: https://scioly.org/wiki/index.php/Astronomy
 - NASA/IPAC Extragalactic Database (NED) — redshifts and galaxy data
 - SIMBAD — object identifiers and basic properties
 - Gaia mission — stellar parallaxes and proper motions
 - NOIRLab/SDSS SkyServer — spectra and images with tools
