import { validateEventName } from "@/lib/utils/assessments/eventConfig";

const EVENT_NAME_MAPPING: Record<string, string> = {
	"Dynamic Planet": "Dynamic Planet - Oceanography",
	"Water Quality": "Water Quality - Freshwater",
	"Materials Science": "Materials Science - Nanomaterials",
};

const ANATOMY_EVENTS = [
	"Anatomy - Endocrine",
	"Anatomy - Nervous",
	"Anatomy - Sense Organs",
];

export function resolveEventName(eventName: string): {
	eventName: string;
	targetEvents: string[];
} {
	let resolvedEventName = validateEventName(eventName);
	let targetEvents: string[] = [resolvedEventName];

	// Apply event name mapping
	if (resolvedEventName) {
		const mappedEventName = EVENT_NAME_MAPPING[resolvedEventName];
		if (mappedEventName) {
			resolvedEventName = mappedEventName;
			targetEvents = [resolvedEventName];
		}
	}

	// Handle Anatomy & Physiology distribution
	if (resolvedEventName === "Anatomy & Physiology") {
		targetEvents = ANATOMY_EVENTS;
	}

	return { eventName: resolvedEventName, targetEvents };
}
