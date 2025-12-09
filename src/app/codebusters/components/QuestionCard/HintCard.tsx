import type { QuoteData } from "@/app/codebusters/types";

interface HintCardProps {
	isActive: boolean;
	isTestSubmitted: boolean;
	cipherType: string;
	getHintContent: (quote: QuoteData) => string;
	item: QuoteData;
	darkMode: boolean;
}

export const HintCard: React.FC<HintCardProps> = ({
	isActive,
	isTestSubmitted,
	cipherType,
	getHintContent,
	item,
	darkMode,
}) => {
	if (!isActive || isTestSubmitted || cipherType === "Cryptarithm") {
		return null;
	}

	return (
		<div
			className={`mb-4 p-3 rounded-lg border-l-4 ${
				darkMode
					? "bg-blue-900/30 border-blue-400 text-blue-200"
					: "bg-blue-50 border-blue-500 text-blue-700"
			}`}
		>
			<div className="flex items-center gap-2 mb-2">
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-label="Hint"
				>
					<title>Hint</title>
					<path d="M9 12l2 2 4-4" />
					<path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
					<path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
					<path d="M13 12h3" />
					<path d="M8 12H5" />
				</svg>
				<span className="font-semibold text-sm">Hint</span>
			</div>
			<p className="text-sm font-mono">{getHintContent(item)}</p>
		</div>
	);
};
