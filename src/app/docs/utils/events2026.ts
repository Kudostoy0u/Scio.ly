// Re-export types
export type { DocsEvent, EventBadgeKind, EventBadge } from "./types/eventTypes";

// Re-export constants
export {
	MISC_EVENT_NAMES,
	BINDER_EVENT_NAMES,
	EVENTS_WITH_NOTESHEETS,
	TRADITIONAL_NOTESHEET_EVENTS,
} from "./constants/eventConstants";

// Re-export utility functions
export { getPrimaryBadgeForEvent } from "./functions/eventUtils";

// Import event data
import {
	bEarth,
	bInquiry,
	bLife,
	bPhys,
	bTech,
	cEarth,
	cInquiry,
	cLife,
	cPhys,
	cTech,
} from "./events.data";

// Import types
import type { DocsEvent } from "./types/eventTypes";

// Event configuration data
const notesheetByName: Record<string, boolean> = {
	"Anatomy and Physiology": true,
	Astronomy: true,
	"Chemistry Lab": true,
	"Crime Busters": true,
	"Designer Genes": true,
	"Dynamic Planet": true,
	Entomology: true,
	"Experimental Design": true,
	Forensics: true,
	"Geologic Mapping": true,
	"Metric Mastery": true,
	Meteorology: true,
	Optics: true,
	"Potions and Poisons": true,
	"Rocks and Minerals": true,
	"Wind Power": true,
};

const details: Record<string, Partial<DocsEvent>> = {
	"Anatomy and Physiology": {
		eventType: "study",
		overview:
			"Students will answer questions on the anatomy and physiology of the human body systems.",
		keyTopics: [
			"Nervous System",
			"Endocrine System",
			"Cardiovascular System",
			"Respiratory System",
		],
		studyRoadmap: [
			"Review basic anatomy",
			"Study system interactions",
			"Practice identification",
			"Review common disorders",
		],
	},
	Astronomy: {
		eventType: "study",
		overview:
			"Students will demonstrate an understanding of stellar evolution and galactic astronomy.",
		keyTopics: [
			"Stellar Evolution",
			"Galactic Structure",
			"Cosmology",
			"Observational Astronomy",
		],
		studyRoadmap: [
			"Review stellar life cycles",
			"Study galaxy types",
			"Practice calculations",
			"Review current research",
		],
	},
	Codebusters: {
		eventType: "study",
		overview:
			"Students will cryptanalyze and decode encrypted messages using various cipher techniques.",
		keyTopics: [
			"Substitution Ciphers",
			"Transposition Ciphers",
			"Polybius Square",
			"Vigenère Cipher",
		],
		studyRoadmap: [
			"Learn cipher types",
			"Practice frequency analysis",
			"Study historical ciphers",
			"Practice timed solving",
		],
	},
	"Dynamic Planet": {
		eventType: "study",
		overview:
			"Students will demonstrate an understanding of Earth's dynamic systems and processes.",
		keyTopics: [
			"Plate Tectonics",
			"Volcanism",
			"Earthquakes",
			"Mountain Building",
		],
		studyRoadmap: [
			"Review plate boundaries",
			"Study rock types",
			"Practice map reading",
			"Review geological time",
		],
	},
	Entomology: {
		eventType: "study",
		overview:
			"Students will demonstrate knowledge of insects and their ecological relationships.",
		keyTopics: [
			"Insect Anatomy",
			"Classification",
			"Life Cycles",
			"Ecological Roles",
		],
		studyRoadmap: [
			"Learn insect orders",
			"Study anatomy",
			"Practice identification",
			"Review ecology",
		],
	},
	"Experimental Design": {
		eventType: "lab",
		overview:
			"Students will design and conduct experiments to test hypotheses.",
		keyTopics: [
			"Hypothesis Formation",
			"Variable Control",
			"Data Collection",
			"Statistical Analysis",
		],
		studyRoadmap: [
			"Review scientific method",
			"Practice experimental design",
			"Study statistics",
			"Practice data analysis",
		],
	},
	Forensics: {
		eventType: "lab",
		overview:
			"Students will analyze evidence to solve crimes using scientific methods.",
		keyTopics: [
			"Evidence Analysis",
			"Fingerprinting",
			"DNA Analysis",
			"Toxicology",
		],
		studyRoadmap: [
			"Study evidence types",
			"Practice analysis techniques",
			"Review case studies",
			"Practice identification",
		],
	},
	Machines: {
		eventType: "build",
		overview:
			"Students will build and test simple machines to perform specific tasks.",
		keyTopics: [
			"Simple Machines",
			"Mechanical Advantage",
			"Efficiency",
			"Design Principles",
		],
		studyRoadmap: [
			"Study machine types",
			"Practice calculations",
			"Build prototypes",
			"Test and optimize",
		],
	},
	Meteorology: {
		eventType: "study",
		overview:
			"Students will demonstrate knowledge of weather patterns and atmospheric processes.",
		keyTopics: [
			"Atmospheric Circulation",
			"Weather Systems",
			"Climate Patterns",
			"Severe Weather",
		],
		studyRoadmap: [
			"Study atmospheric layers",
			"Review weather maps",
			"Practice forecasting",
			"Study climate change",
		],
	},
	Optics: {
		eventType: "lab",
		overview:
			"Students will demonstrate knowledge of light and optical systems.",
		keyTopics: ["Light Properties", "Reflection", "Refraction", "Lens Systems"],
		studyRoadmap: [
			"Study light behavior",
			"Practice ray tracing",
			"Build optical systems",
			"Test and measure",
		],
	},
	"Rocks and Minerals": {
		eventType: "study",
		overview: "Students will identify and classify rocks and minerals.",
		keyTopics: [
			"Mineral Properties",
			"Rock Classification",
			"Formation Processes",
			"Economic Importance",
		],
		studyRoadmap: [
			"Learn mineral properties",
			"Practice identification",
			"Study rock cycles",
			"Review economic geology",
		],
	},
	"Wind Power": {
		eventType: "build",
		overview: "Students will build and test wind-powered devices.",
		keyTopics: [
			"Wind Energy",
			"Turbine Design",
			"Efficiency",
			"Environmental Impact",
		],
		studyRoadmap: [
			"Study wind patterns",
			"Design turbines",
			"Build prototypes",
			"Test performance",
		],
	},
	Boomilever: {
		eventType: "build",
		overview:
			"Students will design and build a wooden structure to hold weight.",
	},
	"Bungee Drop": {
		eventType: "build",
		overview: "Students will design an elastic cord to drop a mass.",
	},
	"Electric Vehicle": {
		eventType: "build",
		overview:
			"Students will design and build a vehicle that travels a specific distance.",
	},
	Helicopter: {
		eventType: "build",
		overview:
			"Students will construct a rubber-powered helicopter for maximum flight time.",
	},
	Hovercraft: {
		eventType: "build",
		overview: "Students will build a hovercraft to travel a specific track.",
	},
	"Mission Possible": {
		eventType: "build",
		overview:
			"Students will build a Rube Goldberg-like device to complete a task.",
	},
	"Robot Tour": {
		eventType: "build",
		overview: "Students will build a robot to navigate a track.",
	},
	Scrambler: {
		eventType: "build",
		overview:
			"Students will build a vehicle to transport an egg without breaking it.",
	},
};

// Helper function to create base event
function baseEvent(name: string, division: Array<"B" | "C">): DocsEvent {
	const isNotesheet = Boolean(notesheetByName[name]);
	const wikiUrl = (eventName: string) =>
		`https://scioly.org/wiki/index.php/${eventName.replace(/\s+/g, "_")}`;

	const base: DocsEvent = {
		slug: name.toLowerCase().replace(/\s+/g, "-"),
		name,
		division,
		notesheetAllowed: isNotesheet,
		overview: "Event overview and description.",
		keyTopics: ["Topic 1", "Topic 2", "Topic 3"],
		studyRoadmap: ["Step 1", "Step 2", "Step 3"],
		links: [
			{ label: "SciOly Wiki", url: wikiUrl(name) },
			{
				label: "2026 Event Table (SOINC)",
				url: "https://www.soinc.org/events/2025-event-table",
			},
		],
	};
	return { ...base, ...details[name] };
}

// Build event arrays
const eventsB = [
	...bLife.map((n) => baseEvent(n, ["B"])),
	...bEarth.map((n) => baseEvent(n, ["B"])),
	...bPhys.map((n) => baseEvent(n, ["B"])),
	...bTech.map((n) => baseEvent(n, ["B"])),
	...bInquiry.map((n) => baseEvent(n, ["B"])),
];

const eventsC = [
	...cLife.map((n) => baseEvent(n, ["C"])),
	...cEarth.map((n) => baseEvent(n, ["C"])),
	...cPhys.map((n) => baseEvent(n, ["C"])),
	...cTech.map((n) => baseEvent(n, ["C"])),
	...cInquiry.map((n) => baseEvent(n, ["C"])),
];

// Create slug to event mapping
const slugToEvent: Record<string, DocsEvent> = {};
for (const evt of [...eventsB, ...eventsC]) {
	const slug = evt.slug;
	if (slugToEvent[slug]) {
		const merged: DocsEvent = {
			...slugToEvent[slug],
			division: Array.from(
				new Set([...slugToEvent[slug].division, ...evt.division]),
			) as Array<"B" | "C">,
		};
		slugToEvent[slug] = merged;
	} else {
		slugToEvent[slug] = evt;
	}
}

// Export main events object
export const events2026: {
	B: DocsEvent[];
	C: DocsEvent[];
} = {
	B: eventsB,
	C: eventsC,
};

// Export event lookup function
export function getEventBySlug(slug: string): DocsEvent | undefined {
	return slugToEvent[slug];
}

// Add helper method to function
getEventBySlug.allSlugs = () => Object.keys(slugToEvent);
