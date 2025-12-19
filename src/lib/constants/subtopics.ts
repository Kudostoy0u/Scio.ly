// Single source of truth for subtopics - imported from JSON file
import subtopicsData from "../../../public/subtopics.json";

// Event name mapping for special cases (same as backend)
const eventNameMapping: Record<string, string> = {
	"Dynamic Planet": "Dynamic Planet - Oceanography",
	"Water Quality": "Water Quality - Freshwater",
	"Materials Science": "Materials Science - Nanomaterials",
};

// Handle Anatomy & Physiology distribution
const anatomyEvents = [
	"Anatomy - Endocrine",
	"Anatomy - Nervous",
	"Anatomy - Sense Organs",
];

// Get the mapped event name for subtopic fetching
function getMappedEventName(eventName: string): string {
	if (eventNameMapping[eventName]) {
		return eventNameMapping[eventName];
	}
	return eventName;
}

// Type for subtopics data
type SubtopicsData = Record<string, string[]>;

// Get subtopics for a specific event
export function getEventSubtopics(eventName: string): string[] {
	// Get the mapped event name for subtopic fetching
	const mappedEventName = getMappedEventName(eventName);

	// For Anatomy & Physiology, combine subtopics from all three events
	if (eventName === "Anatomy & Physiology") {
		const allSubtopics: string[] = [];

		for (const anatomyEvent of anatomyEvents) {
			const subtopics = (subtopicsData as SubtopicsData)[anatomyEvent];
			if (Array.isArray(subtopics)) {
				allSubtopics.push(
					...subtopics.filter((subtopic) => subtopic && subtopic !== "unknown"),
				);
			}
		}

		// Remove duplicates and return
		return [...new Set(allSubtopics)];
	}

	// For other events, use the mapped event name
	const subtopics = (subtopicsData as SubtopicsData)[mappedEventName];
	if (Array.isArray(subtopics)) {
		return subtopics.filter((subtopic) => subtopic && subtopic !== "unknown");
	}

	return [];
}

// Get all available events that have subtopics
export function getEventsWithSubtopics(): string[] {
	return Object.keys(subtopicsData as SubtopicsData);
}

// Get all subtopics data (for advanced use cases)
export function getAllSubtopics(): SubtopicsData {
	return subtopicsData as SubtopicsData;
}
