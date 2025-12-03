"use client";

interface DivisionSelectProps {
	division: string;
	darkMode: boolean;
	onDivisionChange: (division: "B" | "C" | "any") => void;
}

export function DivisionSelect({
	division,
	darkMode,
	onDivisionChange,
}: DivisionSelectProps) {
	return (
		<div>
			<label
				htmlFor="division-select"
				className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
			>
				Division
			</label>
			<select
				id="division-select"
				value={division}
				onChange={(e) => onDivisionChange(e.target.value as "B" | "C" | "any")}
				className={`mt-1 block w-full rounded-md border px-3 py-2 ${
					darkMode
						? "border-gray-600 bg-gray-700 text-white"
						: "border-gray-300 bg-white text-gray-900"
				}`}
			>
				<option value="any">Any Division</option>
				<option value="B">Division B</option>
				<option value="C">Division C</option>
			</select>
		</div>
	);
}
