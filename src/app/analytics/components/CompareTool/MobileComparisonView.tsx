import type { ComparisonResult } from "@/app/analytics/types/elo";
import { stripTrailingParenthetical } from "@/lib/utils/content/string";

interface MobileComparisonViewProps {
	results: ComparisonResult[];
	school1: string;
	darkMode: boolean;
	getWinPercentageColor: (percentage: number, darkMode: boolean) => string;
	getWinPercentageText: (percentage: number, schoolName?: string) => string;
}

export function MobileComparisonView({
	results,
	school1,
	darkMode,
	getWinPercentageColor,
	getWinPercentageText,
}: MobileComparisonViewProps) {
	return (
		<div className="md:hidden">
			<div className="space-y-3">
				{results.map((result) => (
					<div
						key={result.event}
						className={`p-4 rounded-lg border ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}
					>
						<div className="flex justify-between items-center">
							<div className="flex-1 mr-4">
								<div
									className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
								>
									{result.event}
								</div>
							</div>
							<div className="text-right flex-shrink-0 min-w-0">
								<div
									className={`text-lg font-semibold ${getWinPercentageColor(result.school1WinPercentage, darkMode)}`}
								>
									{result.school1WinPercentage.toFixed(1)}%
								</div>
								<div
									className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} max-w-32`}
								>
									{getWinPercentageText(
										result.school1WinPercentage,
										stripTrailingParenthetical(school1),
									)}
								</div>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
