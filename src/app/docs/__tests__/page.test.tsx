import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DocsHome, { metadata } from "../page";

// Mock the components
vi.mock("../components/EventCatalogue", () => ({
  EventCatalogue: () => <div data-testid="event-catalogue">Event Catalogue</div>,
}));

vi.mock("../components/DocsHomeClient", () => ({
  DocsHomeClient: () => <div data-testid="docs-home-client">Docs Home Client</div>,
}));

describe("DocsHome", () => {
  it("renders DocsHomeClient and EventCatalogue", () => {
    render(<DocsHome />);
    
    expect(screen.getByTestId("docs-home-client")).toBeInTheDocument();
    expect(screen.getByTestId("event-catalogue")).toBeInTheDocument();
  });

  it("has correct metadata", () => {
    expect(metadata.title).toContain("Scio.ly Docs");
    expect(metadata.description).toBeDefined();
  });
});

