import { EventCatalogue } from "@/app/docs/components/EventCatalogue";
import { DocsHomeClient } from "./components/DocsHomeClient";

export const metadata = {
	title: "Scio.ly Docs – 2026 Events",
	description:
		"Comprehensive Science Olympiad 2026 event hub with study guides and sample notesheets.",
};

export default function DocsHome() {
	return (
		<div className="space-y-10">
			<DocsHomeClient />
			<EventCatalogue />
		</div>
	);
}
