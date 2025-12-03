"use client";
import type {
	AssignmentDetails,
	QuestionGenerationSettings,
} from "../../assignmentTypes";
import { CharacterLimits } from "./CharacterLimits";
import { CipherDropdown } from "./CipherDropdown";
import { DivisionSelect } from "./DivisionSelect";
import { FormInputs } from "./FormInputs";

interface Step2SettingsProps {
	details: AssignmentDetails;
	settings: QuestionGenerationSettings;
	darkMode: boolean;
	cipherDropdownOpen: boolean;
	onDetailsChange: (newDetails: Partial<AssignmentDetails>) => void;
	onSettingsChange: (newSettings: Partial<QuestionGenerationSettings>) => void;
	onDivisionChange: (division: "B" | "C" | "any") => void;
	onCipherDropdownToggle: () => void;
	onCipherDropdownClose: () => void;
	onBack: () => void;
	onCreateAssignment: () => void;
	loading: boolean;
}

export function Step2Settings({
	details,
	settings,
	darkMode,
	cipherDropdownOpen,
	onDetailsChange,
	onSettingsChange,
	onDivisionChange,
	onCipherDropdownToggle,
	onCipherDropdownClose,
	onBack,
	onCreateAssignment,
	loading,
}: Step2SettingsProps) {
	return (
		<div className="space-y-6">
			<h2
				className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
			>
				Codebusters Configuration
			</h2>

			<div className="space-y-4">
				<FormInputs
					details={details}
					settings={settings}
					darkMode={darkMode}
					onDetailsChange={onDetailsChange}
					onSettingsChange={onSettingsChange}
				/>
				<DivisionSelect
					division={settings.division || "any"}
					darkMode={darkMode}
					onDivisionChange={onDivisionChange}
				/>
				<CipherDropdown
					cipherTypes={settings.cipherTypes || []}
					division={settings.division || "any"}
					darkMode={darkMode}
					isOpen={cipherDropdownOpen}
					onToggle={onCipherDropdownToggle}
					onClose={onCipherDropdownClose}
					onCipherTypesChange={(cipherTypes) =>
						onSettingsChange({ cipherTypes })
					}
				/>
				<CharacterLimits
					charLengthMin={settings.charLengthMin}
					charLengthMax={settings.charLengthMax}
					darkMode={darkMode}
					onSettingsChange={onSettingsChange}
				/>
			</div>

			<div className="flex justify-between">
				<button
					type="button"
					onClick={onBack}
					className={`px-4 py-2 border rounded-lg ${
						darkMode
							? "border-gray-600 text-gray-300 hover:bg-gray-800"
							: "border-gray-300 text-gray-700 hover:bg-gray-50"
					}`}
				>
					Back
				</button>
				<button
					type="button"
					onClick={onCreateAssignment}
					disabled={loading}
					className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
				>
					{loading ? "Creating..." : "Create Assignment"}
				</button>
			</div>
		</div>
	);
}
