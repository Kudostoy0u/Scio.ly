interface DivisionSelectorProps {
	division: "b" | "c";
	darkMode: boolean;
	onDivisionChange: (division: "b" | "c") => void;
}

export function DivisionSelector({
	division,
	darkMode,
	onDivisionChange,
}: DivisionSelectorProps) {
	return (
		<div
			className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg p-1 shadow-sm border ${darkMode ? "border-gray-700" : "border-gray-200"}`}
		>
			<button
				type="button"
				className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
					division === "b"
						? "bg-blue-600 text-white shadow-sm"
						: darkMode
							? "text-gray-300 hover:text-white"
							: "text-gray-700 hover:text-gray-900"
				}`}
				onClick={() => onDivisionChange("b")}
			>
				Division B
			</button>
			<button
				type="button"
				className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
					division === "c"
						? "bg-blue-600 text-white shadow-sm"
						: darkMode
							? "text-gray-300 hover:text-white"
							: "text-gray-700 hover:text-gray-900"
				}`}
				onClick={() => onDivisionChange("c")}
			>
				Division C
			</button>
		</div>
	);
}
