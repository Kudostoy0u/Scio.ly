/**
 * Centralized event configuration utility
 * Single source of truth for event capabilities and settings
 */

export interface EventCapabilities {
	supportsPictureQuestions: boolean;
	supportsIdentificationOnly: boolean;
	supportsIdQuestions: boolean; // Alias for supportsPictureQuestions, using shared logic
	availableDivisions: string[];
	maxQuestions: number;
	defaultTimeLimit: number;
	isCodebusters?: boolean;
	isRocksAndMinerals?: boolean; // Special flag for Rocks and Minerals
}

/**
 * Check if an event supports picture/ID questions
 */
export function supportsPictureQuestions(eventName: string): boolean {
	const base = eventName.split(" - ")[0];
	const candidates = [
		"Rocks and Minerals",
		"Entomology",
		"Anatomy - Nervous",
		"Anatomy - Endocrine",
		"Anatomy - Sense Organs",
		"Anatomy & Physiology",
		"Dynamic Planet",
		"Dynamic Planet - Oceanography",
		"Water Quality",
		"Water Quality - Freshwater",
		"Remote Sensing",
		"Circuit Lab",
		"Astronomy",
		"Designer Genes",
		"Forensics",
		"Meteorology",
	];
	if (!eventName) {
		return false;
	}
	return (
		candidates.includes(eventName) || (base ? candidates.includes(base) : false)
	);
}

/**
 * Event name mapping for API requests
 * Single source of truth for event name transformations
 */
export function getMappedEventNameForApi(eventName: string): string {
	const mapping: Record<string, string> = {
		"Dynamic Planet": "Dynamic Planet - Oceanography",
		"Water Quality": "Water Quality - Freshwater",
		"Materials Science": "Materials Science - Nanomaterials",
	};
	return mapping[eventName] || eventName;
}

/**
 * Check if an event supports identification-only questions
 * Handles both base names and mapped names
 */
export function supportsIdentificationOnly(eventName: string): boolean {
	const base = eventName.split(" - ")[0] ?? eventName;
	const candidates = [
		"Rocks and Minerals",
		"Entomology",
		"Water Quality", // Base name - also check mapped
		"Water Quality - Freshwater", // Mapped name
		"Astronomy",
	];
	// Check both the exact name and the base name
	return candidates.includes(eventName) || candidates.includes(base);
}

/**
 * Check if an event supports ID questions (picture/identification questions)
 * This is the single source of truth for ID question support
 */
export function supportsIdEvent(eventName?: string): boolean {
	if (!eventName) {
		return false;
	}
	const base = eventName.split(" - ")[0] ?? eventName;
	const supportedEvents = new Set([
		"Rocks and Minerals",
		"Entomology",
		"Anatomy & Physiology",
		"Dynamic Planet",
		"Water Quality",
		"Remote Sensing",
		"Circuit Lab",
		"Astronomy",
		"Designer Genes",
		"Forensics",
		"Machines",
		"Meteorology",
		"Potions and Poisons",
		"Solar System",
	]);
	if (base === "Anatomy") {
		return supportedEvents.has("Anatomy & Physiology");
	}
	return supportedEvents.has(eventName) || supportedEvents.has(base);
}

/**
 * Check if an event is Codebusters (has special handling)
 */
export function isCodebustersEvent(eventName: string): boolean {
	return eventName === "Codebusters";
}

/**
 * Get event capabilities
 * Uses mapped event name for accurate capability detection
 */
export function getEventCapabilities(eventName: string): EventCapabilities {
	const isCodebusters = isCodebustersEvent(eventName);
	const isRocksAndMinerals =
		eventName === "Rocks and Minerals" ||
		eventName.split(" - ")[0] === "Rocks and Minerals";

	// For capability detection, check both the original and mapped name
	// This ensures "Water Quality" is detected as supporting ID questions
	const mappedName = getMappedEventNameForApi(eventName);

	return {
		supportsPictureQuestions:
			supportsPictureQuestions(eventName) ||
			supportsPictureQuestions(mappedName),
		supportsIdentificationOnly:
			supportsIdentificationOnly(eventName) ||
			supportsIdentificationOnly(mappedName),
		supportsIdQuestions:
			supportsIdEvent(eventName) || supportsIdEvent(mappedName), // Use shared logic
		availableDivisions: ["B", "C"], // Most events support both divisions
		maxQuestions: isCodebusters ? 10 : 50, // Codebusters typically has fewer questions
		defaultTimeLimit: isCodebusters ? 15 : 30, // Codebusters has shorter time limits
		isCodebusters,
		isRocksAndMinerals,
	};
}
