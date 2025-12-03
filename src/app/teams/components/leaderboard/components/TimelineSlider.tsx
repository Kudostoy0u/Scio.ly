"use client";
import { Calendar } from "lucide-react";
import type { TournamentDate } from "../../leaderboard/utils";
import { formatDate } from "../../leaderboard/utils";

interface TimelineSliderProps {
	tournamentDates: TournamentDate[];
	selectedDate: string;
	darkMode: boolean;
	onDateChange: (date: string) => void;
}

export function TimelineSlider({
	tournamentDates,
	selectedDate,
	darkMode,
	onDateChange,
}: TimelineSliderProps) {
	if (tournamentDates.length === 0) {
		return null;
	}

	const selectedTournament = tournamentDates.find(
		(t) => t.date === selectedDate,
	);
	const currentTournamentIndex = tournamentDates.findIndex(
		(t) => t.date === selectedDate,
	);
	const index = currentTournamentIndex >= 0 ? currentTournamentIndex : 0;

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<Calendar
					className={`h-4 w-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
				/>
				<label
					htmlFor="season-timeline-range"
					className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
				>
					Season Timeline:{" "}
					{selectedTournament ? formatDate(selectedDate) : "Select date"}
				</label>
			</div>
			<div className="relative">
				<input
					id="season-timeline-range"
					type="range"
					min="0"
					max={tournamentDates.length - 1}
					value={index}
					onChange={(e) => {
						const newIndex = Number.parseInt(e.target.value);
						onDateChange(tournamentDates[newIndex]?.date || "");
					}}
					className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
						darkMode ? "bg-gray-700 slider-dark" : "bg-gray-200 slider-light"
					}`}
					style={{
						background: `linear-gradient(to right, ${darkMode ? "#3B82F6" : "#2563EB"} 0%, ${
							darkMode ? "#3B82F6" : "#2563EB"
						} ${(index / (tournamentDates.length - 1)) * 100}%, ${
							darkMode ? "#374151" : "#E5E7EB"
						} ${(index / (tournamentDates.length - 1)) * 100}%, ${
							darkMode ? "#374151" : "#E5E7EB"
						} 100%)`,
					}}
				/>
				<div className="flex justify-between text-xs mt-1">
					<span className={darkMode ? "text-gray-400" : "text-gray-500"}>
						{tournamentDates[0] ? formatDate(tournamentDates[0].date) : ""}
					</span>
					<span className={darkMode ? "text-gray-400" : "text-gray-500"}>
						{tournamentDates.length > 0 &&
						tournamentDates[tournamentDates.length - 1]
							? formatDate(
									tournamentDates[tournamentDates.length - 1]?.date || "",
								)
							: ""}
					</span>
				</div>
			</div>
			{selectedTournament && (
				<div
					className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
				>
					📍{" "}
					{selectedTournament.allTournaments.length > 2 ? (
						<span>
							{selectedTournament.allTournaments[0]},{" "}
							{selectedTournament.allTournaments[1]}{" "}
							<span className="group relative inline-block">
								<span className="text-blue-500 hover:text-blue-600 cursor-pointer transition-colors">
									and {selectedTournament.allTournaments.length - 2} more
								</span>
								<div
									className={`absolute left-0 top-full mt-1 w-64 ${darkMode ? "bg-gray-800" : "bg-white"} border ${darkMode ? "border-gray-700" : "border-gray-200"} rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10`}
								>
									<div className="p-3">
										<div
											className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"} mb-2`}
										>
											All tournaments on this date:
										</div>
										{selectedTournament.allTournaments.map(
											(tournament: string, idx: number) => (
												<div
													key={`tournament-${idx}-${tournament}`}
													className={`text-sm py-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
												>
													{tournament}
												</div>
											),
										)}
									</div>
								</div>
							</span>
						</span>
					) : (
						selectedTournament.tournament
					)}
				</div>
			)}
		</div>
	);
}
