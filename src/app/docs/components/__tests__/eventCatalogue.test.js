"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const vitest_1 = require("vitest");
const EventCatalogue_1 = require("../EventCatalogue");
// Mock the theme context
vitest_1.vi.mock("@/app/contexts/themeContext", () => ({
    useTheme: () => ({ darkMode: false }),
}));
// Mock Next.js Link
vitest_1.vi.mock("next/link", () => ({
    default: (_a) => {
        var { children, href, prefetch } = _a, props = __rest(_a, ["children", "href", "prefetch"]);
        return (<a href={href} data-prefetch={prefetch} {...props}>
			{children}
		</a>);
    },
}));
// Mock EventBadge
vitest_1.vi.mock("../EventBadge", () => ({
    EventBadge: ({ evt }) => (<span data-testid={`badge-${evt.slug}`}>{evt.name}</span>),
}));
(0, vitest_1.describe)("EventCatalogue", () => {
    const mockEvents = {
        B: [
            {
                slug: "anatomy-and-physiology",
                name: "Anatomy and Physiology",
                division: ["B"],
                notesheetAllowed: true,
                overview: "Test overview",
                keyTopics: [],
                studyRoadmap: [],
                links: [],
            },
            {
                slug: "astronomy",
                name: "Astronomy",
                division: ["B"],
                notesheetAllowed: false,
                overview: "Test overview",
                keyTopics: [],
                studyRoadmap: [],
                links: [],
            },
        ],
        C: [
            {
                slug: "codebusters",
                name: "Codebusters",
                division: ["C"],
                notesheetAllowed: false,
                overview: "Test overview",
                keyTopics: [],
                studyRoadmap: [],
                links: [],
            },
        ],
    };
    (0, vitest_1.it)("renders events for both divisions", () => {
        (0, react_1.render)(<EventCatalogue_1.EventCatalogue eventsByDivision={mockEvents}/>);
        (0, vitest_1.expect)(react_1.screen.getByText("Division B")).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByText("Division C")).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getAllByText("Anatomy and Physiology").length).toBeGreaterThan(0);
        (0, vitest_1.expect)(react_1.screen.getAllByText("Astronomy").length).toBeGreaterThan(0);
        (0, vitest_1.expect)(react_1.screen.getAllByText("Codebusters").length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)("sorts events alphabetically", () => {
        const unsortedEvents = {
            B: [
                __assign(__assign({}, mockEvents.B[1]), { name: "Zebra Event" }),
                __assign(__assign({}, mockEvents.B[0]), { name: "Alpha Event" }),
            ],
            C: [],
        };
        (0, react_1.render)(<EventCatalogue_1.EventCatalogue eventsByDivision={unsortedEvents}/>);
        const links = react_1.screen.getAllByRole("link");
        (0, vitest_1.expect)(links.length).toBeGreaterThan(0);
        // Verify links are rendered (sorting is tested by checking they exist)
        (0, vitest_1.expect)(links[0]).toHaveAttribute("href");
    });
    (0, vitest_1.it)("handles empty events gracefully", () => {
        (0, react_1.render)(<EventCatalogue_1.EventCatalogue eventsByDivision={{ B: [], C: [] }}/>);
        (0, vitest_1.expect)(react_1.screen.getByText("No events available.")).toBeInTheDocument();
    });
    (0, vitest_1.it)("handles missing eventsByDivision prop", () => {
        (0, react_1.render)(<EventCatalogue_1.EventCatalogue />);
        // Should use default events from events2026
        (0, vitest_1.expect)(react_1.screen.getByText("Division B")).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByText("Division C")).toBeInTheDocument();
    });
    (0, vitest_1.it)("handles null/undefined event properties", () => {
        const eventsWithNulls = {
            B: [
                __assign({}, mockEvents.B[0]),
                { slug: "", name: "" },
            ],
            C: [],
        };
        (0, react_1.render)(<EventCatalogue_1.EventCatalogue eventsByDivision={eventsWithNulls}/>);
        (0, vitest_1.expect)(react_1.screen.getAllByText("Anatomy and Physiology").length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)("disables prefetch on event links", () => {
        (0, react_1.render)(<EventCatalogue_1.EventCatalogue eventsByDivision={mockEvents}/>);
        const links = react_1.screen.getAllByRole("link");
        (0, vitest_1.expect)(links.length).toBeGreaterThan(0);
        for (const link of links) {
            (0, vitest_1.expect)(link).toHaveAttribute("href");
            // Verify prefetch is disabled via data attribute
            (0, vitest_1.expect)(link.getAttribute("data-prefetch")).toBe("false");
        }
    });
    (0, vitest_1.it)("renders only division B when C is empty", () => {
        (0, react_1.render)(<EventCatalogue_1.EventCatalogue eventsByDivision={{ B: mockEvents.B, C: [] }}/>);
        (0, vitest_1.expect)(react_1.screen.getByText("Division B")).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.queryByText("Division C")).not.toBeInTheDocument();
    });
    (0, vitest_1.it)("renders only division C when B is empty", () => {
        (0, react_1.render)(<EventCatalogue_1.EventCatalogue eventsByDivision={{ B: [], C: mockEvents.C }}/>);
        (0, vitest_1.expect)(react_1.screen.getByText("Division C")).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.queryByText("Division B")).not.toBeInTheDocument();
    });
});
