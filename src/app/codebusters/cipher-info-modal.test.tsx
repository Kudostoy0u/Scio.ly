import { describe, expect, it } from "vitest";
import { parseH2Sections } from "./CipherInfoModal";

describe("parseH2Sections", () => {
	it("splits markdown into sections by H2", () => {
		const md =
			"# Preface\n\nSome intro\n\n## Step One\nDo this\n\n## Step Two\nDo that";
		const sections = parseH2Sections(md);
		expect(sections.length).toBe(2);
		expect(sections[0]?.title).toBe("Step One");
		expect(sections[0]?.id).toBe("step-one");
		expect(sections[0]?.markdown).toContain("Do this");
	});

	it("returns single section when no H2 exists", () => {
		const md = "Just content without headings";
		const sections = parseH2Sections(md);
		expect(sections.length).toBe(1);
		expect(sections[0]?.id).toBe("content");
	});
});
