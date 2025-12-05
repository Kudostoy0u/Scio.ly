"use client";

interface SchoolSelectorProps {
	schools: string[];
	selectedSchools: string[];
	schoolSearch: string;
	darkMode: boolean;
	isSchoolAvailable: (school: string) => boolean;
	onSchoolSearchChange: (value: string) => void;
	onSchoolToggle: (school: string) => void;
	onRemoveSchool: (school: string) => void;
	onClearAllSchools: () => void;
}

export default function SchoolSelector({
	schools,
	selectedSchools,
	schoolSearch,
	darkMode,
	isSchoolAvailable,
	onSchoolSearchChange,
	onSchoolToggle,
	onRemoveSchool,
	onClearAllSchools,
}: SchoolSelectorProps) {
	return (
		<div>
			<label
				htmlFor="school-search-input"
				className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"} mb-2`}
			>
				Select Schools
			</label>
			<div className="space-y-3">
				<input
					id="school-search-input"
					type="text"
					placeholder="Search schools..."
					value={schoolSearch}
					onChange={(e) => onSchoolSearchChange(e.target.value)}
					className={`w-full px-3 py-2 border rounded-md ${darkMode ? "border-gray-600 bg-gray-700 text-white placeholder-gray-400" : "border-gray-300 bg-white text-gray-900 placeholder-gray-500"} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
				/>
				<div
					className={`max-h-48 overflow-y-auto border rounded-md ${darkMode ? "border-gray-600 bg-gray-700" : "border-gray-300 bg-white"}`}
				>
					{schools.map((school) => {
						const isAvailable = isSchoolAvailable(school);
						return (
							<button
								key={school}
								type="button"
								disabled={!isAvailable}
								className={`w-full text-left px-3 py-2 cursor-pointer border-b last:border-b-0 transition-colors ${
									selectedSchools.includes(school)
										? darkMode
											? "bg-blue-900/20 text-blue-300"
											: "bg-blue-50 text-blue-700"
										: darkMode
											? "border-gray-600 hover:bg-gray-600 text-gray-300"
											: "border-gray-100 hover:bg-gray-50 text-gray-700"
								} ${isAvailable ? "" : "opacity-60"}`}
								onClick={() => isAvailable && onSchoolToggle(school)}
							>
								<div className="flex items-center justify-between">
									<span>{school}</span>
									{!isAvailable && (
										<div className="flex items-center gap-1 text-xs text-gray-500">
											<div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400" />
											<span>Loading...</span>
										</div>
									)}
								</div>
							</button>
						);
					})}
				</div>
				<div className="flex flex-wrap gap-2 items-center">
					{selectedSchools.map((school) => (
						<span
							key={school}
							className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
								darkMode
									? "bg-blue-900/30 text-blue-200"
									: "bg-blue-100 text-blue-800"
							}`}
						>
							{school}
							<button
								type="button"
								onClick={() => onRemoveSchool(school)}
								className={`ml-2 ${darkMode ? "text-blue-400 hover:text-blue-200" : "text-blue-600 hover:text-blue-800"}`}
							>
								×
							</button>
						</span>
					))}
					{selectedSchools.length > 0 && (
						<button
							type="button"
							onClick={onClearAllSchools}
							className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
								darkMode
									? "bg-red-600 hover:bg-red-700 text-white"
									: "bg-red-100 hover:bg-red-200 text-red-700"
							}`}
						>
							Clear All
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
