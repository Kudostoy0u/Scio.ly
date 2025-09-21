export type DocsEvent = {
  slug: string;
  name: string;
  division: Array<'B' | 'C'>;
  notesheetAllowed: boolean;
  overview: string;
  keyTopics: string[];
  studyRoadmap: string[];
  links: { label: string; url: string }[];
  eventType?: 'study' | 'lab' | 'build' | 'hybrid';
  materialsNote?: string;
  subsections?: { slug: string; title: string }[];
};


export type EventBadgeKind = 'build' | 'misc' | 'binder' | 'notesheet';
export type EventBadge = { kind: EventBadgeKind; label: 'Build Event' | 'Miscellaneous' | 'Binder' | 'Notesheet' };


export const MISC_EVENT_NAMES = new Set<string>([
  'Codebusters',
  'Engineering CAD',
  'Write It Do It',
]);


export const BINDER_EVENT_NAMES = new Set<string>([
  'Astronomy',
  'Dynamic Planet',
  'Rocks and Minerals',

  'Geologic Mapping',
  'Meteorology',
  'Optics',
  'Machines',
  'Wind Power',
  'Entomology',
  'Detector Building',
]);

const BADGE_PRIORITY: Array<EventBadgeKind> = ['build', 'misc', 'binder', 'notesheet'];



export const EVENTS_WITH_NOTESHEETS: string[] = [];



export const TRADITIONAL_NOTESHEET_EVENTS = {
  'B': [
    'Anatomy and Physiology',
    'Disease Detectives',
    'Entomology',
    'Heredity',
    'Water Quality',
    'Astronomy',
    'Dynamic Planet',
    'Remote Sensing',
    'Rocks and Minerals',
    'Solar System',
    'Chemistry Lab',
    'Circuit Lab',
    'Forensics',
    'Materials Science',
    'Crime Busters',
    'Potions and Poisons',
    'Metric Mastery',
    'Experimental Design',
  ],
  'C': [
    'Anatomy and Physiology',
    'Designer Genes',
    'Disease Detectives',
    'Entomology',
    'Water Quality',
    'Astronomy',
    'Dynamic Planet',
    'Remote Sensing',
    'Rocks and Minerals',
    'Chemistry Lab',
    'Circuit Lab',
    'Forensics',
    'Materials Science',
    'Bungee Drop',
    'Codebusters',
    'Engineering CAD',
    'Experimental Design',
  ]
};

export function getPrimaryBadgeForEvent(evt: DocsEvent): EventBadge | null {
  const checks: Partial<Record<EventBadgeKind, boolean>> = {
    build: evt.eventType === 'build',
    misc: MISC_EVENT_NAMES.has(evt.name),
    binder: BINDER_EVENT_NAMES.has(evt.name),
    notesheet: evt.notesheetAllowed || TRADITIONAL_NOTESHEET_EVENTS.B.includes(evt.name) || TRADITIONAL_NOTESHEET_EVENTS.C.includes(evt.name),
  };

  for (const kind of BADGE_PRIORITY) {
    if (checks[kind]) {
      switch (kind) {
        case 'build':
          return { kind, label: 'Build Event' };
        case 'misc':
          return { kind, label: 'Miscellaneous' };
        case 'binder':
          return { kind, label: 'Binder' };
        case 'notesheet':
          return { kind, label: 'Notesheet' };
      }
    }
  }
  return null;
}

const bLife = [
  'Anatomy and Physiology',
  'Disease Detectives',
  'Entomology',
  'Heredity',
  'Water Quality',
] as const;

const bEarth = ['Dynamic Planet', 'Meteorology', 'Remote Sensing', 'Rocks and Minerals', 'Solar System'] as const;
const bPhys = ['Circuit Lab', 'Crime Busters', 'Hovercraft', 'Machines', 'Potions and Poisons'] as const;
const bTech = ['Boomilever', 'Helicopter', 'Mission Possible', 'Scrambler'] as const;
const bInquiry = ['Codebusters', 'Experimental Design', 'Metric Mastery', 'Write It Do It'] as const;

const cLife = ['Anatomy and Physiology', 'Designer Genes', 'Disease Detectives', 'Entomology', 'Water Quality'] as const;
const cEarth = ['Astronomy', 'Dynamic Planet', 'Remote Sensing', 'Rocks and Minerals'] as const;
const cPhys = ['Chemistry Lab', 'Circuit Lab', 'Forensics', 'Hovercraft', 'Machines', 'Materials Science'] as const;
const cTech = ['Boomilever', 'Electric Vehicle', 'Helicopter', 'Robot Tour'] as const;
const cInquiry = ['Bungee Drop', 'Codebusters', 'Engineering CAD', 'Experimental Design'] as const;

const notesheetByName: Record<string, boolean> = {


};

import { eventSlug as makeSlug, wikiUrl } from '@/app/docs/utils/shared';

const details: Record<string, Partial<DocsEvent>> = {
  'Anatomy and Physiology': {
    eventType: 'study',
    overview: 'Comprehensive knowledge of human body systems; emphasis on structure–function and integration across systems.',
    keyTopics: [
      'Skeletal, Muscular, Integumentary, Cardiovascular, Respiratory, Digestive, Nervous, Endocrine, Immune',
      'Tissues, histology, homeostasis, common disorders',
      'Reading clinical scenarios and interpreting data/diagrams',
    ],
    studyRoadmap: [
      'Build a system-by-system outline with diagrams and mnemonics',
      'Annotate diagrams; memorize origins/insertions where applicable',
      'Practice with question banks; time 50-minute mock exams',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Anatomy_and_Physiology') },
      { label: 'See notesheet', url: 'https://docs.google.com/document/d/1726W_qOKBIxzszqFQ3xccaX7OMVibxRYF0BLt-cSoHo/edit?usp=sharing' },
    ],
    materialsNote: 'Typically 2 students; binders/notes allowed per current rules. Bring non-programmable calculator if permitted.',
    subsections: [
      { slug: 'skeletal', title: 'Skeletal' },
      { slug: 'muscular', title: 'Muscular' },
      { slug: 'integumentary', title: 'Integumentary' },
      { slug: 'cardiovascular', title: 'Cardiovascular' },
      { slug: 'lymphatic', title: 'Lymphatic/Immune' },
      { slug: 'excretory', title: 'Urinary/Excretory' },
      { slug: 'respiratory', title: 'Respiratory' },
      { slug: 'digestive', title: 'Digestive' },
      { slug: 'immune', title: 'Immune' },
      { slug: 'nervous', title: 'Nervous' },
      { slug: 'sense-organs', title: 'Special Senses' },
      { slug: 'endocrine', title: 'Endocrine' },
    ],
  },
  'Disease Detectives': {
    eventType: 'study',
    overview: 'Applied epidemiology: study designs, surveillance, outbreak investigation and interpretation of public health data.',
    keyTopics: [
      'Case definitions; epidemic curves; attack rates; R0',
      'Bias/confounding; sensitivity/specificity; predictive values',
      'Study designs: cohort, case-control, cross-sectional, randomized trials',
    ],
    studyRoadmap: [
      'Summarize outbreak investigation 10-step protocol',
      'Drill calculations (risk, odds ratio, rate ratios) with practice sets',
      'Interpret epi curves and 2x2 tables quickly under time limits',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Disease_Detectives') },
      { label: 'CDC Principles of Epidemiology', url: 'https://www.cdc.gov/csels/dsepd/ss1978/index.html' },
      { label: 'See notesheet', url: 'https://docs.google.com/document/d/1QhIeMbt8uSFQx89Y5789uombsuuCIy36__WBcW3Qnm4/edit?usp=sharing' },
    ],
    materialsNote: 'Usually notes/binder allowed. Non-graphing calculator commonly allowed; verify current rules.',
  },
  Entomology: {
    eventType: 'study',
    overview: 'Taxonomy and biology of insects; identification by order/family and knowledge of anatomy and life cycles.',
    keyTopics: [
      'External/internal anatomy; metamorphosis',
      'Order-level characteristics; common families',
      'Ecological roles, pest management, beneficial insects',
    ],
    studyRoadmap: [
      'Create ID sheets with diagnostic features and images',
      'Practice timed identification from photos/specimens',
      'Memorize vocabulary and morphology labels',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Entomology') },
    ],
    materialsNote: 'Field guides or binders typically permitted per rules; bring hand lens if useful and allowed.',
  },
  Heredity: {
    eventType: 'study',
    overview: 'Foundations of classical and molecular genetics for Division B.',
    keyTopics: [
      'Mendelian inheritance; Punnett squares; pedigrees',
      'Probability; incomplete dominance; sex-linked traits',
      'DNA structure; transcription/translation basics',
    ],
    studyRoadmap: [
      'Master monohybrid, dihybrid crosses and probability shortcuts',
      'Practice pedigree interpretation; identify inheritance patterns',
      'Review central dogma; basic mutations and their effects',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Heredity') },
    ],
    materialsNote: 'Typically notes/binder allowed; simple calculator often permitted.',
  },
  'Water Quality': {
    eventType: 'hybrid',
    overview: 'Limnology and aquatic ecology with data interpretation and potential hands-on components depending on level.',
    keyTopics: [
      'Water chemistry (pH, DO, nitrates, phosphates); indicator species',
      'Food webs; eutrophication; watershed management',
      'Macroinvertebrate ID; biotic indices (e.g., EPT)',
    ],
    studyRoadmap: [
      'Build a reference for indicator taxa and tolerance values',
      'Practice chemical parameter calculations and unit conversions',
      'Analyze sample datasets; explain trends and causes',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Water_Quality') },
      { label: 'See notesheet', url: 'https://docs.google.com/document/d/1yuR-Dt2-WyXPqjKb7HhQt72f56BpywZAViUH_vEzpms/edit?usp=sharing' },
    ],
    materialsNote: 'Notes/binder and non-programmable calculator typically allowed; specific equipment varies by tournament.',
  },
  Astronomy: {
    eventType: 'study',
    overview: 'High-level astrophysics and astronomy content with images and data interpretation.',
    keyTopics: [
      'Stellar evolution; HR diagram; spectra',
      'Galaxies; cosmology basics; variable stars',
      'Imaging and data analysis; mission instrumentation',
    ],
    studyRoadmap: [
      'Memorize key equations (distance modulus, Wien’s law)',
      'Practice interpreting spectra and photometry plots',
      'Study object lists and mission fact sheets',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Astronomy') },
    ],
    materialsNote: 'Typically a binder/notes permitted; non-programmable calculator commonly allowed.',
  },
  'Dynamic Planet': {
    eventType: 'study',
    overview: 'Earth systems science focusing on rotating subtopics (e.g., glaciation, oceans, tectonics).',
    keyTopics: [
      'Earth materials and processes; mapping/remote sensing basics',
      'Quantitative skills (rates, budgets, cross-sections)',
      'Topic-specific case studies per season focus',
    ],
    studyRoadmap: [
      'Summarize formulas and typical calculations for the yearly topic',
      'Practice map/section interpretation and imagery',
      'Compile case studies and glossaries',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Dynamic_Planet') },
    ],
    materialsNote: 'Usually notes/binder allowed; calculator policy varies. Verify current year’s subtopic details.',
    subsections: [
      { slug: 'glaciers', title: 'Glaciers' },
      { slug: 'tectonics', title: 'Tectonics' },
      { slug: 'earth-fresh-waters', title: 'Earth’s Fresh Waters' },
      { slug: 'oceanography', title: 'Oceanography' },
    ],
  },
  Meteorology: {
    eventType: 'study',
    overview: 'Atmospheric science for Division B with emphasis on weather patterns and data interpretation.',
    keyTopics: [
      'Clouds; fronts; air masses; severe weather safety',
      'Reading station models, surface/upper-air maps',
      'Climate vs weather; ENSO basics',
    ],
    studyRoadmap: [
      'Memorize cloud identification and associated weather',
      'Practice decoding station plots and synoptic charts',
      'Work through past tests on storm systems',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Meteorology') },
    ],
    materialsNote: 'Notes often allowed; simple calculator sometimes permitted.',
  },
  'Remote Sensing': {
    eventType: 'study',
    overview: 'Analysis of Earth-observing systems and interpretation of remotely sensed data.',
    keyTopics: [
      'Satellite sensors; bands; resolutions; indices (e.g., NDVI)',
      'Image interpretation; spectral signatures; false color',
      'Applications: land cover, hydrology, hazards',
    ],
    studyRoadmap: [
      'Memorize sensor characteristics and common band combinations',
      'Practice interpreting multispectral images and derived indices',
      'Review case studies and algorithm basics',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Remote_Sensing') },
    ],
    materialsNote: 'Binder/notes typically allowed; non-programmable calculator often allowed.',
  },
  'Rocks and Minerals': {
    eventType: 'study',
    overview: 'Identification and classification of rocks and minerals; properties, formation, and uses.',
    keyTopics: [
      'Mineral properties (hardness, luster, cleavage); streak',
      'Igneous, sedimentary, metamorphic processes',
      'Economic geology and environmental considerations',
    ],
    studyRoadmap: [
      'Create ID cards with photos and diagnostic tests',
      'Practice timed identifications; learn composition/uses',
      'Review rock cycle and textures',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Rocks_and_Minerals') },
    ],
    materialsNote: 'Field guides/binder typically allowed; hand lens useful if allowed.',
  },
  'Solar System': {
    eventType: 'study',
    overview: 'Planetary science for Division B: solar system bodies, dynamics, and missions.',
    keyTopics: [
      'Planets, moons, small bodies; geology and atmospheres',
      'Orbital mechanics basics; resonances; tides',
      'Space missions and instrumentation',
    ],
    studyRoadmap: [
      'Compile body-by-body reference tables',
      'Memorize key equations and definitions',
      'Review notable missions and their findings',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Solar_System') },
    ],
    materialsNote: 'Binder/notes commonly allowed; calculator policy varies.',
  },
  'Chemistry Lab': {
    eventType: 'lab',
    overview: 'Advanced chemistry with both theoretical and hands-on components.',
    keyTopics: [
      'Stoichiometry; equilibrium; kinetics; acid–base; thermodynamics',
      'Lab techniques and safety; titrations; spectroscopy concepts',
      'Data analysis and error propagation',
    ],
    studyRoadmap: [
      'Build equation sheet with constants and common derivations',
      'Practice lab problems and data interpretation',
      'Drill calculations with a non-programmable calculator',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Chemistry_Lab') },
    ],
    materialsNote: 'Typically goggles and safety compliance required; non-programmable calculator allowed.',
  },
  'Circuit Lab': {
    eventType: 'lab',
    overview: 'DC and AC circuit analysis with measurements and problem solving.',
    keyTopics: [
      'Ohm’s law; Kirchhoff’s laws; series/parallel; Thevenin',
      'Capacitors/inductors; RC, RL, RLC basics',
      'Meters usage; uncertainty and significant figures',
    ],
    studyRoadmap: [
      'Summarize formulas and typical problem types',
      'Practice building/measuring simple circuits',
      'Drill timed problem sets',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Circuit_Lab') },
    ],
    materialsNote: 'Non-programmable calculator and simple tools often allowed; verify multimeter policy.',
  },
  Forensics: {
    eventType: 'lab',
    overview: 'Qualitative analysis and forensic techniques: powders, fibers, chromatography, and more.',
    keyTopics: [
      'Powder/liquid/polymer ID; metal analysis basics',
      'Chromatography; fiber/hair analysis; fingerprints',
      'Crime scenario reasoning and report writing',
    ],
    studyRoadmap: [
      'Create quick-reference charts for materials and tests',
      'Practice lab stations under time with safety compliance',
      'Write concise conclusions explaining evidence',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Forensics') },
    ],
    materialsNote: 'Safety goggles required; notes policy varies by year.',
  },
  Hovercraft: {
    eventType: 'build',
    overview: 'Design, build, and test a small hovercraft meeting specifications; emphasis on performance and documentation.',
    keyTopics: [
      'Propulsion and lift systems; friction and stability',
      'Build tolerances; device impound; logs',
      'Scoring optimization and reliability',
    ],
    studyRoadmap: [
      'Prototype quickly; iterate with measured trials',
      'Maintain engineering log per rules; weigh and measure',
      'Practice competition procedures and timing',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Hovercraft') },
    ],
    materialsNote: 'Device and tools per build rules; eye protection as specified. Impound procedures apply.',
  },
  Machines: {
    eventType: 'study',
    overview: 'Simple machines, mechanics, and calculations of mechanical advantage and power.',
    keyTopics: [
      'Levers, pulleys, gears, screws, wheel/axle, inclined planes',
      'Mechanical advantage, torque, efficiency',
      'Statics and basic dynamics relevant to machines',
    ],
    studyRoadmap: [
      'Compile formula sheet with worked examples',
      'Practice problem sets and unit conversions',
      'Hands-on demos to cement intuition',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Machines') },
    ],
    materialsNote: 'Calculator usually allowed; notes permitted depending on rules.',
  },
  'Materials Science': {
    eventType: 'study',
    overview: 'Structure–property relationships of materials; polymers, metals, ceramics; failure and testing.',
    keyTopics: [
      'Bonding and microstructure; phase diagrams concepts',
      'Mechanical properties; stress–strain; toughness',
      'Processing and performance; composites',
    ],
    studyRoadmap: [
      'Summarize definitions and key graphs',
      'Work practice problems on strength and hardness',
      'Review case studies of failure analyses',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Materials_Science') },
    ],
    materialsNote: 'Notes typically allowed; calculator for computations as permitted.',
  },
  'Crime Busters': {
    eventType: 'lab',
    overview: 'Intro forensic chemistry for Division B focusing on qualitative analysis and simple forensic tests.',
    keyTopics: [
      'Powder/liquid/polymer ID; chromatography',
      'Fibers/hair; fingerprints; metals basics',
      'Data interpretation and short-answer reasoning',
    ],
    studyRoadmap: [
      'Make ID charts; memorize common reactions',
      'Practice timed lab stations',
      'Write clear evidence-based conclusions',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Crime_Busters') },
    ],
    materialsNote: 'Safety goggles required; notes policy varies by year.',
  },
  'Potions and Poisons': {
    eventType: 'study',
    overview: 'Chemistry of household substances, toxins, and safe lab practices for Division B.',
    keyTopics: [
      'Acids/bases; solutions; reactions; identification',
      'Toxicology basics; SDS interpretation',
      'Safety and disposal',
    ],
    studyRoadmap: [
      'Build concise reference sheets for common substances',
      'Practice balancing equations and recognizing reactions',
      'Review safety scenarios and SDS symbols',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Potions_and_Poisons') },
    ],
    materialsNote: 'Notes often allowed; follow safety and PPE requirements.',
  },
  Boomilever: {
    eventType: 'build',
    overview: 'Design and construct a cantilevered structure to support maximum load with minimal mass.',
    keyTopics: [
      'Statics; compression/tension; joint design',
      'Material selection; loading protocols',
      'Efficiency scoring and failure modes',
    ],
    studyRoadmap: [
      'Iterate designs; weigh and record efficiency',
      'Standardize build techniques and jigs',
      'Practice loading under competition conditions',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Boomilever') },
    ],
    materialsNote: 'Device must meet specs; eye protection required; follow impound and measurement procedures.',
  },
  Helicopter: {
    eventType: 'build',
    overview: 'Rubber-powered indoor helicopter flight duration event.',
    keyTopics: [
      'Rotor geometry; pitch; mass distribution',
      'Rubber motors; winding; torque curves',
      'Trim, launch techniques, and ceiling effects',
    ],
    studyRoadmap: [
      'Build multiple rotor sets; test and record flight logs',
      'Tune rubber and winding strategy',
      'Practice in venues with comparable heights',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Helicopters') },
    ],
    materialsNote: 'Eye protection as required; follow size/mass specs and impound rules.',
  },
  'Mission Possible': {
    eventType: 'build',
    overview: 'Rube Goldberg-style device completing a prescribed set of tasks within constraints.',
    keyTopics: [
      'Energy transfers; timing and sequencing',
      'Reliability engineering; scoring optimization',
      'Documentation and compliance',
    ],
    studyRoadmap: [
      'Map tasks to reliable mechanisms; minimize randomness',
      'Test repeatedly; measure cycle times and success rates',
      'Keep meticulous build logs and checklists',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Mission_Possible') },
    ],
    materialsNote: 'Device and allowed materials strictly specified; impound and safety rules apply.',
  },
  Scrambler: {
    eventType: 'build',
    overview: 'Vehicle devices that safely transport an egg to a target quickly and accurately.',
    keyTopics: [
      'Kinematics; braking systems; alignment',
      'Energy storage (gravity/elastic); repeatability',
      'Build tolerances and measurement',
    ],
    studyRoadmap: [
      'Prototype braking and aiming systems',
      'Tune for distance accuracy and consistency',
      'Practice competition procedure and timing',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Scrambler') },
    ],
    materialsNote: 'Eye protection; egg handling rules; impound procedures.',
  },
  'Electric Vehicle': {
    eventType: 'build',
    overview: 'Battery-powered vehicle designed to travel a specified distance accurately.',
    keyTopics: [
      'Motor control; gearing; wheel calibration',
      'Sensors/timers (as allowed); friction and alignment',
      'Distance measurement and repeatability',
    ],
    studyRoadmap: [
      'Develop calibration routines; log runs',
      'Implement consistent start/stop mechanisms',
      'Verify compliance with electrical/mechanical specs',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Electric_Vehicle') },
    ],
    materialsNote: 'Batteries/components limited per rules; eye protection and impound likely required.',
  },
  'Robot Tour': {
    eventType: 'build',
    overview: 'Autonomous robot navigates a course to a target under constraints.',
    keyTopics: [
      'Sensors; control strategies; odometry',
      'Obstacle avoidance; calibration; testing',
      'Scoring optimization and reliability',
    ],
    studyRoadmap: [
      'Prototype navigation; tune PID or open-loop compensation',
      'Test in realistic courses; record success rates',
      'Prepare for on-site adjustments and measurement tolerances',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Robot_Tour') },
    ],
    materialsNote: 'Component and power restrictions; safety and impound procedures apply.',
  },
  'Bungee Drop': {
    eventType: 'build',
    overview: 'Predict-and-perform event involving elastic cord length estimation to minimize drop error.',
    keyTopics: [
      'Hooke’s law approximations; energy; damping',
      'Curve fitting; calibration and scaling',
      'Uncertainty and error analysis',
    ],
    studyRoadmap: [
      'Collect calibration data across masses/lengths',
      'Fit models and build quick-reference tables',
      'Practice on rigs similar to competition apparatus',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Bungee_Drop') },
    ],
    materialsNote: 'Calculator allowed; device and cord rules apply.',
  },
  Codebusters: {
    eventType: 'study',
    overview: 'Cryptography: hand ciphers, cryptarithms, and fast decoding under time pressure.',
    keyTopics: [
      'Monoalphabetic substitution; Vigenère/Porta; Hill/Nihilist (Div C)',
      'Cryptarithms and logic; frequency analysis',
      'Team coordination for speed and accuracy',
    ],
    studyRoadmap: [
      'Build cipher cheat sheets and crib strategies',
      'Drill timed rounds; assign roles (freq, keys, math)',
      'Review error-checking routines and verification',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Codebusters') },
    ],
    materialsNote: 'Reference sheets allowed per rules; non-programmable calculator as permitted.',
    subsections: [
      { slug: 'affine', title: 'Affine' },
      { slug: 'atbash', title: 'Atbash' },
      { slug: 'baconian', title: 'Baconian' },
      { slug: 'caesar', title: 'Caesar' },
      { slug: 'checkerboard', title: 'Checkerboard' },
      { slug: 'columnar-transposition', title: 'Complete Columnar' },
      { slug: 'fractionated-morse', title: 'Fractionated Morse' },
      { slug: 'hill-2x2', title: 'Hill (2x2)' },
      { slug: 'hill-3x3', title: 'Hill (3x3)' },
      { slug: 'k1-aristocrat', title: 'K1 Aristocrat' },
      { slug: 'k1-patristocrat', title: 'K1 Patristocrat' },
      { slug: 'k2-aristocrat', title: 'K2 Aristocrat' },
      { slug: 'k2-patristocrat', title: 'K2 Patristocrat' },
      { slug: 'k3-aristocrat', title: 'K3 Aristocrat' },
      { slug: 'k3-patristocrat', title: 'K3 Patristocrat' },
      { slug: 'nihilist', title: 'Nihilist' },
      { slug: 'porta', title: 'Porta (Vigenère Variant)' },
              { slug: 'random-aristocrat', title: 'Random Aristocrat' },
              { slug: 'random-patristocrat', title: 'Random Patristocrat' },
      { slug: 'xenocrypt', title: 'Xenocrypt' },
    ],
  },
  'Engineering CAD': {
    eventType: 'lab',
    overview: 'Computer-Aided Design tasks to model parts/assemblies to specification.',
    keyTopics: [
      'Sketch constraints; extrude/revolve/sweep/loft',
      'Assemblies and mates; drawings and dimensions',
      'Standards, file management, and time management',
    ],
    studyRoadmap: [
      'Practice with provided CAD platform and shortcuts',
      'Recreate past models; focus on speed and accuracy',
      'Prepare templates for drawings and BOM if allowed',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Engineering_CAD') },
    ],
    materialsNote: 'Laptops/mice often required; software/platform per host guidance.',
  },
  'Experimental Design': {
    eventType: 'lab',
    overview: 'Design-and-conduct experiment from provided materials and write up a quality report.',
    keyTopics: [
      'Hypothesis; variables; controls; procedures',
      'Data collection; analysis; error and improvement',
      'Technical writing and organization',
    ],
    studyRoadmap: [
      'Drill practice prompts under strict timing',
      'Use a reproducible report structure and rubric',
      'Refine data/graphing and statistical language',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Experimental_Design') },
    ],
    materialsNote: 'No external notes typically; supplies provided; time management is critical.',
  },
  'Metric Mastery': {
    eventType: 'study',
    overview: 'Measurement estimation and metric unit conversions for Division B.',
    keyTopics: [
      'SI units; prefixes; dimensional analysis',
      'Estimation techniques; rounding and sig figs',
      'Instrument reading and precision',
    ],
    studyRoadmap: [
      'Memorize prefixes and common conversions',
      'Practice estimation challenges and instrument reads',
      'Drill mental math under time constraints',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Metric_Mastery') },
    ],
    materialsNote: 'Typically no notes; simple calculator policy varies.',
  },
  'Write It Do It': {
    eventType: 'lab',
    overview: 'Communication and precision: one partner writes instructions; the other reconstructs a structure.',
    keyTopics: [
      'Technical description; referencing; ordering',
      'Spatial reasoning; error minimization',
      'Team strategy and practice routines',
    ],
    studyRoadmap: [
      'Develop a consistent notation and vocabulary',
      'Practice clocked rounds with role rotation',
      'Refine error-proofing and time split strategies',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Write_It,_Do_It') },
    ],
    materialsNote: 'No notes; only paper/pencil provided; follow event-specific constraints.',
  },
  'Designer Genes': {
    eventType: 'study',
    overview: 'Advanced genetics and biotechnology for Division C.',
    keyTopics: [
      'Molecular genetics; gene regulation; genomics',
      'Biotech methods: PCR, cloning, electrophoresis',
      'Population genetics; inheritance patterns',
    ],
    studyRoadmap: [
      'Create a methods and concepts quick-reference',
      'Work probability and genetics problems',
      'Interpret gels, pedigrees, and sequence data',
    ],
    links: [
      { label: 'SciOly Wiki', url: wikiUrl('Designer_Genes') },
    ],
    materialsNote: 'Binder/notes typically allowed; calculator for computations as allowed.',
  },
};

function baseEvent(name: string, divisions: Array<'B' | 'C'>): DocsEvent {
  const isNotesheet = Boolean(notesheetByName[name]);
  const base: DocsEvent = {
    slug: makeSlug(name),
    name,
    division: divisions,
    notesheetAllowed: isNotesheet,
    overview: 'Curated overview: see key topics and links below for this 2026 event.',
    keyTopics: ['Syllabus forthcoming', 'See SciOly Wiki link below'],
    studyRoadmap: ['Read official rules', 'Build a summary sheet', 'Practice under time'],
    links: [{ label: 'SciOly Wiki', url: wikiUrl(name) }, { label: '2026 Event Table (SOINC)', url: 'https://www.soinc.org/events/2025-event-table' }],
  };
  return { ...base, ...details[name] };
}

const eventsB = [
  ...bLife.map(n => baseEvent(n, ['B'])),
  ...bEarth.map(n => baseEvent(n, ['B'])),
  ...bPhys.map(n => baseEvent(n, ['B'])),
  ...bTech.map(n => baseEvent(n, ['B'])),
  ...bInquiry.map(n => baseEvent(n, ['B'])),
];

const eventsC = [
  ...cLife.map(n => baseEvent(n, ['C'])),
  ...cEarth.map(n => baseEvent(n, ['C'])),
  ...cPhys.map(n => baseEvent(n, ['C'])),
  ...cTech.map(n => baseEvent(n, ['C'])),
  ...cInquiry.map(n => baseEvent(n, ['C'])),
];


const slugToEvent: Record<string, DocsEvent> = {};
for (const evt of [...eventsB, ...eventsC]) {
  const slug = evt.slug;
  if (!slugToEvent[slug]) {
    slugToEvent[slug] = evt;
  } else {
    const merged: DocsEvent = {
      ...slugToEvent[slug],
      division: Array.from(new Set([...slugToEvent[slug].division, ...evt.division])) as Array<'B' | 'C'>,
    };
    slugToEvent[slug] = merged;
  }
}

export const events2026: {
  B: DocsEvent[];
  C: DocsEvent[];
} = {
  B: eventsB,
  C: eventsC,
};

export function getEventBySlug(slug: string): DocsEvent | undefined {
  return slugToEvent[slug];
}

getEventBySlug.allSlugs = () => Object.keys(slugToEvent);


