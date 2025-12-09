import {
	BINDER_EVENT_NAMES,
	MISC_EVENT_NAMES,
} from "@/app/docs/utils/constants/eventConstants";
import type { DocsEvent } from "@/app/docs/utils/types/eventTypes";
import { describe, expect, it } from "vitest";
import { getEventBySlug, getPrimaryBadgeForEvent } from "../eventUtils";

describe("eventUtils", () => {
	const baseEvent: DocsEvent = {
		slug: "test-event",
		name: "Test Event",
		division: ["B"],
		notesheetAllowed: false,
		overview: "Test overview",
		keyTopics: [],
		studyRoadmap: [],
		links: [],
	};

	describe("getPrimaryBadgeForEvent", () => {
		it("returns null when no badges are applicable", () => {
			const result = getPrimaryBadgeForEvent(baseEvent);
			expect(result).toBeNull();
		});

		it("returns build badge for build events", () => {
			const buildEvent = {
				...baseEvent,
				eventType: "build" as const,
			} as DocsEvent;
			const result = getPrimaryBadgeForEvent(buildEvent);
			expect(result).toEqual({ kind: "build", label: "Build Event" });
		});

		it("returns notesheet badge for events with notesheet allowed", () => {
			const notesheetEvent = {
				...baseEvent,
				notesheetAllowed: true,
			} as DocsEvent;
			const result = getPrimaryBadgeForEvent(notesheetEvent);
			expect(result).toEqual({ kind: "notesheet", label: "Notesheet" });
		});

		it("returns binder badge for binder events", () => {
			const binderEventName = Array.from(BINDER_EVENT_NAMES)[0];
			const binderEvent = { ...baseEvent, name: binderEventName } as DocsEvent;
			const result = getPrimaryBadgeForEvent(binderEvent);
			expect(result).toEqual({ kind: "binder", label: "Binder" });
		});

		it("returns misc badge for misc events", () => {
			const miscEventName = Array.from(MISC_EVENT_NAMES)[0];
			const miscEvent = { ...baseEvent, name: miscEventName } as DocsEvent;
			const result = getPrimaryBadgeForEvent(miscEvent);
			expect(result).toEqual({ kind: "misc", label: "Miscellaneous" });
		});

		it("prioritizes build badge over other badges", () => {
			const buildEventWithNotesheet = {
				...baseEvent,
				eventType: "build" as const,
				notesheetAllowed: true,
			} as DocsEvent;
			const result = getPrimaryBadgeForEvent(buildEventWithNotesheet);
			expect(result?.kind).toBe("build");
		});

		it("prioritizes misc badge over binder and notesheet", () => {
			const miscEventName = Array.from(MISC_EVENT_NAMES)[0];
			const miscEventWithOthers = {
				...baseEvent,
				name: miscEventName,
				notesheetAllowed: true,
			} as DocsEvent;
			const result = getPrimaryBadgeForEvent(miscEventWithOthers);
			expect(result?.kind).toBe("misc");
		});

		it("prioritizes binder badge over notesheet", () => {
			const binderEventName = Array.from(BINDER_EVENT_NAMES)[0];
			const binderEventWithNotesheet = {
				...baseEvent,
				name: binderEventName,
				notesheetAllowed: true,
			} as DocsEvent;
			const result = getPrimaryBadgeForEvent(binderEventWithNotesheet);
			expect(result?.kind).toBe("binder");
		});
	});

	describe("getEventBySlug", () => {
		const slugToEvent: Record<string, DocsEvent> = {
			"test-event": baseEvent,
			"another-event": {
				...baseEvent,
				slug: "another-event",
				name: "Another Event",
			} as DocsEvent,
		};

		it("returns event for valid slug", () => {
			const result = getEventBySlug("test-event", slugToEvent);
			expect(result).toEqual(baseEvent);
		});

		it("returns undefined for invalid slug", () => {
			const result = getEventBySlug("non-existent", slugToEvent);
			expect(result).toBeUndefined();
		});

		it("handles empty slug", () => {
			const result = getEventBySlug("", slugToEvent);
			expect(result).toBeUndefined();
		});
	});
});
