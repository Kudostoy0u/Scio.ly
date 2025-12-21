"use client";
import { getAvailableCiphers } from "../utils/cipherConfig";

interface CipherDropdownProps {
	cipherTypes: string[];
	division: string;
	darkMode: boolean;
	onCipherTypesChange: (cipherTypes: string[]) => void;
}

export function CipherDropdown({
	cipherTypes,
	division,
	darkMode,
	onCipherTypesChange,
}: CipherDropdownProps) {
	const availableCiphers = getAvailableCiphers(division);

	// Determine the current select value
	// If "all" is selected, use "all", otherwise use the first cipher in the array
	const currentValue = cipherTypes?.includes("all")
		? "all"
		: cipherTypes && cipherTypes.length > 0
			? cipherTypes[0]
			: "all";

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const value = e.target.value;
		if (value === "all") {
			onCipherTypesChange(["all"]);
		} else {
			onCipherTypesChange([value]);
		}
	};

	return (
		<div>
			<label
				htmlFor="cipher-types-select"
				className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}
			>
				Cipher Types *
			</label>
			<select
				id="cipher-types-select"
				value={currentValue}
				onChange={handleChange}
				className={`mt-1 block w-full rounded-md border px-3 py-2 ${
					darkMode
						? "border-gray-600 bg-gray-700 text-white"
						: "border-gray-300 bg-white text-gray-900"
				}`}
			>
				<option value="all">All Available Ciphers</option>
				{availableCiphers.map((cipher) => (
					<option key={cipher} value={cipher}>
						{cipher}
					</option>
				))}
			</select>
		</div>
	);
}
