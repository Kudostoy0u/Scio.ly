import type { ComparisonResult } from "@/app/analytics/types/elo";
import { stripTrailingParenthetical } from "@/lib/utils/content/string";
import { toast } from "react-toastify";

interface OverallResultProps {
	result: ComparisonResult;
	school1: string;
	school2: string;
	darkMode: boolean;
	getWinPercentageColor: (percentage: number, darkMode: boolean) => string;
	getWinPercentageText: (percentage: number) => string;
}

const SCHOOL_NAME_REGEX = /\s*\([^)]*\)$/;

export function OverallResult({
	result,
	school1,
	school2,
	darkMode,
	getWinPercentageColor,
	getWinPercentageText,
}: OverallResultProps) {
	const handleShare = async () => {
		if (typeof window === "undefined") return;

		const params = new URLSearchParams({
			school1: encodeURIComponent(school1),
			school2: encodeURIComponent(school2),
		});
		const shareUrl = `${window.location.origin}${window.location.pathname}#compare?${params.toString()}`;

		try {
			await navigator.clipboard.writeText(shareUrl);
			toast.success("Copied comparison link to clipboard!");
		} catch (err) {
			// Fallback for browsers that don't support clipboard API
			const textArea = document.createElement("textarea");
			textArea.value = shareUrl;
			textArea.style.position = "fixed";
			textArea.style.opacity = "0";
			document.body.appendChild(textArea);
			textArea.select();
			try {
				document.execCommand("copy");
				toast.success("Copied comparison link to clipboard!");
			} catch {
				toast.error("Failed to copy link");
			}
			document.body.removeChild(textArea);
		}
	};

	return (
		<div
			className={`rounded-lg p-4 mb-6 ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}
		>
			<div className="flex items-center justify-between mb-3">
				<h3
					className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
				>
					Overall Result
				</h3>
				<button
					type="button"
					onClick={handleShare}
					className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors"
				>
					Share?
				</button>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<span
						className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
					>
						<strong>{stripTrailingParenthetical(school1)}</strong> Win
						Probability:
					</span>
					<div
						className={`text-lg font-semibold ${getWinPercentageColor(result.school1WinPercentage, darkMode)}`}
					>
						{result.school1WinPercentage.toFixed(1)}%
					</div>
				</div>
				<div>
					<span
						className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
					>
						Assessment:
					</span>
					<div
						className={`text-lg font-semibold ${getWinPercentageColor(result.school1WinPercentage, darkMode)}`}
					>
						{getWinPercentageText(result.school1WinPercentage)}
					</div>
				</div>
				<div>
					<span
						className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
					>
						<strong>{school1.replace(SCHOOL_NAME_REGEX, "")}</strong> Elo:
					</span>
					<div
						className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
					>
						{Math.round(result.school1Elo)}
					</div>
				</div>
				<div>
					<span
						className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
					>
						<strong>{school2.replace(SCHOOL_NAME_REGEX, "")}</strong> Elo:
					</span>
					<div
						className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
					>
						{Math.round(result.school2Elo)}
					</div>
				</div>
			</div>
		</div>
	);
}
