# Remote Sensing (2026)

Divisions: B, C  
Type: Study (Data/Imagery)  
Participants: 2–3  
Approx. Time: 50 minutes  
Allowed Materials: Binder/notes and Class I calculator (confirm)

## Overview
Interpretation of Earth-observing imagery and sensor data: bands, indices, signatures, and applications.

## Core Topics
- Sensors/platforms; spatial/spectral/radiometric/temporal resolution  
- Band combinations; spectral signatures (veg, water, soil, urban)  
- Indices: NDVI, NDWI, NDSI (as allowed)  
- Case applications: land cover, hydrology, hazards

## Skills
- Choose band combos; explain signatures  
- Compute/interpret indices and false color images

## Spectral signatures (qualitative)
- Vegetation: strong NIR reflectance, red absorption (chlorophyll), red-edge transition; stressed vegetation shifts red-edge
- Water: low reflectance overall; absorption increases in NIR/SWIR → appears dark; turbidity raises reflectance in visible
- Soil/urban: gradually increasing reflectance from visible to NIR; urban varies by materials (concrete/asphalt/roofing)
- Snow/ice: high visible reflectance, variable NIR; dirty snow lowers albedo

## Common indices (if allowed)
- NDVI = (NIR − Red)/(NIR + Red): vegetation vigor; confounded by soil/background
- NDWI (McFeeters) = (Green − NIR)/(Green + NIR): water detection
- NDSI = (Green − SWIR)/(Green + SWIR): snow discrimination
- SAVI = ((NIR − Red)/(NIR + Red + L))·(1+L), L≈0.5 for moderate vegetation

## Sensors and bands (examples)
- Landsat 8/9 OLI: coastal, blue, green, red, NIR, SWIR1, SWIR2, cirrus; 30 m (15 m pan)
- Sentinel-2 MSI: 10–20 m VNIR; 60 m atmospheric bands; fine red-edge sampling
- MODIS/VIIRS: broad multiband, daily revisit; coarse resolution—good for indices/time series
- SAR (Sentinel-1): C-band active microwave; penetrates clouds; sensitive to roughness and moisture

Thermal sensors (if in scope)
- Landsat TIRS: thermal bands for land surface temperature estimates (emissivity corrections needed)
- Split-window techniques (conceptual) for atmospheric correction

## In-depth guide

Remote sensing turns reflected, emitted, or backscattered electromagnetic energy into mappable information about the Earth’s surface and atmosphere. Every sensor samples specific wavelength bands, so the same landscape can look entirely different depending on whether you observe in blue light, near‑infrared, short‑wave infrared, or microwave. Vegetation, for example, absorbs red light (for photosynthesis) and reflects near‑infrared strongly—hence high NDVI in healthy canopies—while liquid water is dark in NIR/SWIR due to absorption. Urban materials vary: concrete is relatively bright and spectrally flat in VNIR, asphalt darker; metal roofs and solar panels can show distinctive reflectance and specular behavior. Snow and ice are bright in visible bands but can be discriminated from clouds using SWIR (snow often darker in SWIR), which is the basis of NDSI.

Indices like NDVI, NDWI, and NDSI are ratios that cancel illumination and topographic shading to some extent, improving robustness across scenes. However, indices saturate (NDVI over dense forests) and can be confounded by soil background or atmospheric effects; red‑edge bands (Sentinel‑2) help capture canopy stress before greenness visibly declines. When comparing images across time, normalize for season (phenology), sun angle, and sensor differences; mixed‑sensor comparisons require bandpass awareness and, ideally, cross‑calibration.

Active sensors such as SAR transmit microwave pulses and measure the returned signal, enabling cloud‑penetrating imaging and sensitivity to surface roughness and moisture. Calm water appears dark (specular reflection away from the sensor), while rough flooded vegetation can brighten due to double‑bounce backscatter. Interferometric pairs reveal ground deformation; coherence changes highlight disturbance (e.g., floods, landslides). Thermal sensors observe emitted long‑wave energy and support land‑surface temperature retrieval when emissivity and atmospheric effects are addressed; split‑window methods use two thermal bands to correct for atmospheric absorption.

A practical workflow begins with a question (e.g., mapping burn severity). Choose sensors and dates that bracket the event, compute an index sensitive to the target (e.g., NBR from NIR and SWIR if allowed), mask clouds/shadows, then threshold or classify with reference points. Always validate with ground truth or high‑resolution imagery and quantify uncertainty. For hydrology and hazards, combine optical indices (NDWI) with SAR amplitude/coherence to reduce false positives under clouds. When communicating results, present true‑color alongside false‑color composites and include legends with numeric ranges to prevent misinterpretation from stretched color tables.

## Applications and caveats
- Land cover/change: multi-date composites; watch phenology and illumination
- Water quality: turbidity and chlorophyll proxies (qualitative unless formulas provided)
- Hazards: burn severity with NBR (if allowed), floods with NDWI and SAR coherence
- Urban heat island: land surface temperature (thermal bands) with emissivity corrections (C)

## Map/data reading checklist
- Confirm acquisition dates/times and solar geometry; normalize comparisons
- Read legends and dynamic ranges; avoid false conclusions from stretched color tables
- Cross-check multiple bands/indices; do not rely on a single index

## Worked tasks
1) Choose bands to discriminate water vs vegetation: use NIR (water dark, veg bright) + red or green
2) Post-fire mapping: compare pre/post NIR and SWIR; high SWIR and low NIR → burned
3) Flood detection under clouds: SAR amplitude/coherence changes where water increased

## References
- SciOly Wiki: https://scioly.org/wiki/index.php/Remote_Sensing
