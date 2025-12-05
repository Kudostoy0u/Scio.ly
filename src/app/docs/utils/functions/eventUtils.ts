import {
	BINDER_EVENT_NAMES,
	MISC_EVENT_NAMES,
} from "@/app/docs/utils/constants/eventConstants";
import type { DocsEvent, EventBadge } from "@/app/docs/utils/types/eventTypes";

const BADGE_PRIORITY: Array<"build" | "misc" | "binder" | "notesheet"> = [
	"build",
	"misc",
	"binder",
	"notesheet",
];

export function getPrimaryBadgeForEvent(evt: DocsEvent): EventBadge | null {
	const badges: EventBadge[] = [];

	if (evt.eventType === "build") {
		badges.push({ kind: "build", label: "Build Event" });
	}

	if (MISC_EVENT_NAMES.has(evt.name)) {
		badges.push({ kind: "misc", label: "Miscellaneous" });
	}

	if (BINDER_EVENT_NAMES.has(evt.name)) {
		badges.push({ kind: "binder", label: "Binder" });
	}

	if (evt.notesheetAllowed) {
		badges.push({ kind: "notesheet", label: "Notesheet" });
	}

	if (badges.length === 0) {
		return null;
	}

	const sortedBadges = badges.sort(
		(a, b) => BADGE_PRIORITY.indexOf(a.kind) - BADGE_PRIORITY.indexOf(b.kind),
	);

	return sortedBadges[0] ?? null;
}

export function getEventBySlug(
	slug: string,
	slugToEvent: Record<string, DocsEvent>,
): DocsEvent | undefined {
	return slugToEvent[slug];
}
