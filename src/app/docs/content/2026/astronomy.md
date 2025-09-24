## Overview
Astronomy problems reward the ability to turn plots and spectra into physical stories. Study by learning how stellar structure maps onto the HR diagram, how magnitudes and colors encode temperature and distance, and how simple scaling laws bound answers. Then practice reading galaxy images and spectra, moving fluently between qualitative classification and quick, order‑of‑magnitude calculations.

## Stellar astrophysics in context
The HR diagram is the organizing map: main‑sequence position reflects mass and temperature, giants and supergiants occupy the luminous cool branch, and white dwarfs sit hot and faint. Spectral type runs OBAFGKM from hot to cool, and luminosity class (I–V) captures surface gravity; together they specify physical state (e.g., G2V for the Sun). Cluster CMDs add time, because the turnoff marks age while the vertical offset to a calibrated sequence gives distance after accounting for reddening. Variable stars extend the ladder—Cepheids follow a period–luminosity relation and RR Lyrae serve as near‑standard candles in old populations—while eclipsing binaries and radial velocities let you weigh stars from geometry alone.

## Photometry and spectroscopy as tools
Magnitudes are logarithmic brightness measures, so differences translate to flux ratios, and color indices (like B−V or g−r) trace temperature and reddening. Extinction both dims and reddens light, which you diagnose from color excess and correct with an assumed R_V. Spectra fill in detail: strong Balmer lines flag A‑type stars, metal lines strengthen toward cooler F/G types, molecular bands bloom in K/M spectra, and emission lines advertise hot gas. Doppler shifts add kinematics and, at small z, translate directly to recessional velocity.

## Distances, galaxies, and the expanding universe
Distance begins with parallax and then steps outward through main‑sequence fitting and standard candles. Galaxy morphology encodes formation and star‑formation history—spirals are blue with structured disks and arms, ellipticals are red and smooth—and simple relations such as Tully–Fisher and Faber–Jackson relate luminosity to rotation or dispersion for rough comparisons. On large scales, Hubble–Lemaître’s linear law z≈v/c≈H₀d provides a first‑order yardstick at low redshift; beyond that, use the relation only qualitatively unless a problem provides cosmological parameters.

## Essential relationships (keep handy)
- Wien peak: λ_max ≈ 2.897×10^−3 m·K / T
- Stefan–Boltzmann: L = 4πR^2 σT^4 and F = L / (4πd^2)
- Magnitudes: m2 − m1 = −2.5 log10(F2/F1); distance modulus m − M = 5 log10(d/10 pc)
- Parallax: d(pc) = 1 / p(arcsec)
- Doppler (non‑relativistic): Δλ/λ ≈ v/c

## Worked micro‑examples
- Distance modulus: m − M = 5 implies d = 10^{(5+5)/5} = 100 pc.
- Wien: a 6000 K blackbody peaks near 4.8×10^−7 m (blue‑green).
- Parallax: p = 5 mas gives d = 200 pc.
- Doppler: Hα at 6568 Å vs 6563 Å yields v ≈ 228 km/s (receding).

## Image and data reading
Treat each plot as a structured argument. On HR/CMDs, locate the main sequence, turnoff, and giant branches before inferring age or distance. In spectra, identify the continuum and lines, then classify type, temperature, and velocity shift. Light curves reveal periodicity and depth, which you map to variables or transit geometries, and multiwavelength images combine to describe physical processes such as hot gas in clusters (X‑ray) or dust‑enshrouded starbursts (IR). Throughout, check units and scales; a labeled axis prevents many mistakes.

## Practice prompts
- A cluster CMD lies 4.2 mag below a calibrated main sequence; estimate distance (ignore extinction) and describe how reddening alters the estimate.
- An A‑type spectrum with strong Balmer lines and B−V≈0 implies a temperature near 10,000 K; explain how dust would change observed color and inferred temperature.
- A spiral with HI rotation half‑width 200 km/s is brighter than one with 100 km/s by the qualitative Tully–Fisher trend; articulate the reasoning without calibration constants.

## References
- SciOly Wiki – Astronomy: https://scioly.org/wiki/index.php/Astronomy
- NOIRLab/SDSS SkyServer and Gaia portals for spectra and parallaxes
