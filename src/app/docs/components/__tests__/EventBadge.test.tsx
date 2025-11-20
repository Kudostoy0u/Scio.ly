import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventBadge } from "../EventBadge";
import type { DocsEvent } from "@/app/docs/utils/events2026";

// Mock the theme context
vi.mock("@/app/contexts/ThemeContext", () => ({
  useTheme: () => ({ darkMode: false }),
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({ children, href, prefetch, ...props }: any) => (
    <a href={href} data-prefetch={prefetch} {...props}>
      {children}
    </a>
  ),
}));

// Mock getPrimaryBadgeForEvent
vi.mock("@/app/docs/utils/events2026", async () => {
  const actual = await vi.importActual("@/app/docs/utils/events2026");
  return {
    ...actual,
    getPrimaryBadgeForEvent: (evt: DocsEvent) => {
      if (evt.notesheetAllowed) {
        return { kind: "notesheet" as const, label: "Notesheet" };
      }
      if (evt.eventType === "build") {
        return { kind: "build" as const, label: "Build Event" };
      }
      return null;
    },
  };
});

describe("EventBadge", () => {
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

  it("returns null when no badge is available", () => {
    const { container } = render(<EventBadge evt={baseEvent} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders notesheet badge with link", () => {
    const eventWithNotesheet = { ...baseEvent, notesheetAllowed: true };
    render(<EventBadge evt={eventWithNotesheet} />);
    
    const link = screen.getByRole("link");
    expect(link).toHaveTextContent("Notesheet");
    expect(link).toHaveAttribute("href", "/docs/test-event#notesheet");
    expect(link.getAttribute("data-prefetch")).toBe("false");
  });

  it("renders build badge without link", () => {
    const buildEvent = { ...baseEvent, eventType: "build" as const };
    render(<EventBadge evt={buildEvent} />);
    
    const badge = screen.getByText("Build Event");
    expect(badge).toBeInTheDocument();
    expect(badge.tagName).toBe("SPAN");
  });

  it("disables prefetch on notesheet link", () => {
    const eventWithNotesheet = { ...baseEvent, notesheetAllowed: true };
    render(<EventBadge evt={eventWithNotesheet} />);
    
    const link = screen.getByRole("link");
    // Verify prefetch is disabled (Next.js Link behavior)
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("data-prefetch")).toBe("false");
  });
});

