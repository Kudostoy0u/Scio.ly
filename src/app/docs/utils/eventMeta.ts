import type { DocsEvent } from "@/app/docs/utils/events2026";

export type EventMeta = {
	typeLabel: string;
	participants: string;
	approxTime: string;
	allowedResources: string;
};

const TYPE_LABEL_BY_EVENTTYPE: Record<
	NonNullable<DocsEvent["eventType"]>,
	string
> = {
	study: "Study",
	lab: "Lab",
	build: "Build",
	hybrid: "Hybrid",
};

const PER_EVENT_OVERRIDES: Record<string, Partial<EventMeta>> = {
	// slug → overrides
	codebusters: {
		typeLabel: "Inquiry",
		participants: "Up to 3",
		approxTime: "50 minutes",
		allowedResources:
			"Writing utensils; up to three Class I or Class II calculators. No external notes. Supervisor provides scratch paper and reference sheet.",
	},
	"experimental-design": {
		participants: "Up to 3",
		approxTime: "50 minutes",
		allowedResources:
			"Goggles required. May bring one timepiece, one linear measuring device, and one stand‑alone Class III calculator (not used as part of the experiment). No external notes. Supervisor provides materials and report packet.",
	},
	"write-it-do-it": {
		participants: "Up to 2",
		approxTime: "50 minutes",
		allowedResources:
			"No external resources. Paper and writing instruments typically provided.",
	},
	"engineering-cad": {
		participants: "Up to 2",
		approxTime: "50 minutes",
		allowedResources:
			"Computer/software per host guidance. No external notes unless permitted.",
	},
	"anatomy-and-physiology": {
		participants: "Up to 2",
		allowedResources:
			"Binders/notes allowed per rules; non‑programmable calculator as permitted.",
	},
	astronomy: {
		participants: "Up to 2",
		allowedResources:
			"Binder/notes typically permitted; non‑programmable calculator commonly allowed.",
	},
	boomilever: {
		participants: "Up to 2",
		allowedResources:
			"Device and tools as permitted; eye protection per rules; impound likely. No external notes unless specified.",
	},
	"bungee-drop": {
		participants: "Up to 2",
		approxTime: "10 minutes",
		allowedResources:
			"Impound required: one elastic cord, calibration data, and tools. Up to two Class II calculators. Eye protection: B. Supervisor provides drop heights/masses.",
	},
	"chemistry-lab": {
		participants: "Up to 2",
		allowedResources:
			"Each participant may bring one 8.5×11 two‑sided page; Class III calculator. Required safety gear (goggles, apron/lab coat); Chemistry Lab Equipment List items allowed. Supervisor provides reagents/references.",
	},
	"circuit-lab": {
		participants: "Up to 2",
		allowedResources:
			"Team may bring a binder of any size with notes; up to two Class III calculators. Basic multimeters allowed at supervisor’s discretion. Supervisor provides supplies and measurement devices.",
	},
	"crime-busters": {
		participants: "Up to 2",
		allowedResources:
			"Each participant may bring one 8.5×11 two‑sided page; Class III calculator. Required safety gear; Chemistry Lab Equipment List items allowed. Supervisor provides standard reagents.",
	},
	"designer-genes": {
		participants: "Up to 2",
		allowedResources:
			"Binders/notes typically permitted; non‑programmable calculator as allowed.",
	},
	"disease-detectives": {
		participants: "Up to 2",
		allowedResources:
			"Notes/binder typically allowed; non‑programmable calculator as permitted.",
	},
	"dynamic-planet": {
		participants: "Up to 2",
		allowedResources: "One binder of any size; two Class II calculators.",
	},
	meteorology: {
		participants: "Up to 2",
		allowedResources:
			"Notes often allowed; simple calculator sometimes permitted.",
	},
	"electric-vehicle": {
		participants: "Up to 2",
		allowedResources:
			"Device and tools per build rules; eye protection and impound likely required. No external notes unless specified.",
	},
	entomology: {
		participants: "Up to 2",
		allowedResources:
			"Field guides or binders typically permitted; hand lens if allowed.",
	},
	forensics: {
		participants: "Up to 2",
		allowedResources:
			"Each participant may bring one 8.5×11 two‑sided page; Class III calculator. Required safety gear; Chemistry Lab Equipment List items allowed. Supervisor provides standard reagents.",
	},
	helicopter: {
		participants: "Up to 2",
		allowedResources:
			"Device and tools per build rules; eye protection as specified; impound as applicable.",
	},
	heredity: {
		participants: "Up to 2",
		allowedResources:
			"Notes/binder typically allowed; simple calculator as permitted.",
	},
	hovercraft: {
		participants: "Up to 2",
		allowedResources:
			"Device and tools per build rules; eye protection; impound procedures apply.",
	},
	machines: {
		participants: "Up to 2",
		allowedResources:
			"Notes/binder typically permitted; calculator usually allowed.",
	},
	"materials-science": {
		participants: "Up to 2",
		allowedResources:
			"Notes/binder typically permitted; calculator allowed for computations.",
	},
	"metric-mastery": {
		participants: "Up to 2",
		allowedResources: "No external resources; simple calculator policy varies.",
	},
	"mission-possible": {
		participants: "Up to 2",
		allowedResources:
			"Device and tools within specified constraints; eye protection; impound and safety rules apply. No external notes unless specified.",
	},
	"potions-and-poisons": {
		participants: "Up to 2",
		allowedResources:
			"Notes often allowed; follow PPE requirements. Non‑programmable calculator as permitted.",
	},
	"remote-sensing": {
		participants: "Up to 2",
		allowedResources:
			"Binder/notes typically allowed; non‑programmable calculator often allowed.",
	},
	"robot-tour": {
		participants: "Up to 2",
		allowedResources:
			"Device and tools per build rules; safety and impound procedures apply. No external notes unless specified.",
	},
	"rocks-and-minerals": {
		participants: "Up to 2",
		allowedResources:
			"Field guides or binders typically permitted; hand lens if allowed.",
	},
	scrambler: {
		participants: "Up to 2",
		allowedResources:
			"Device and tools per build rules; eye protection; impound as applicable.",
	},
	"solar-system": {
		participants: "Up to 2",
		allowedResources:
			"Binder/notes commonly allowed; calculator policy varies.",
	},
	"water-quality": {
		participants: "Up to 2",
		allowedResources:
			"Notes/binder and non‑programmable calculator typically allowed; specific equipment varies by tournament.",
	},
};

const DEFAULTS: EventMeta = {
	typeLabel: "Study",
	participants: "Up to 2",
	approxTime: "50 minutes",
	allowedResources:
		"See current‑year rules; policies vary by event and season.",
};

export function getEventMeta(evt: DocsEvent): EventMeta {
	const overrides = PER_EVENT_OVERRIDES[evt.slug] ?? {};

	const computedType = evt.eventType
		? (TYPE_LABEL_BY_EVENTTYPE[evt.eventType] ?? DEFAULTS.typeLabel)
		: DEFAULTS.typeLabel;

	const computedParticipants = "Up to 2";

	const computedApproxTime = "50 minutes";

	let computedAllowed = DEFAULTS.allowedResources;
	if (evt.eventType === "build") {
		computedAllowed =
			"Device and tools as permitted; eye protection per rules; impound likely. No external notes unless specified.";
	} else if (evt.notesheetAllowed) {
		computedAllowed =
			"Binders/notes allowed per rules; non‑programmable calculator as permitted.";
	} else if (evt.eventType === "lab") {
		computedAllowed =
			"Safety equipment required; non‑programmable calculator may be allowed.";
	}

	return {
		typeLabel: overrides.typeLabel ?? computedType,
		participants: overrides.participants ?? computedParticipants,
		approxTime: overrides.approxTime ?? computedApproxTime,
		allowedResources: overrides.allowedResources ?? computedAllowed,
	};
}
