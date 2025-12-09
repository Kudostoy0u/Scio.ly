interface BaconianSyncButtonProps {
	cipherType: string;
	baconianSyncEnabled: boolean;
	setBaconianSyncEnabled: (enabled: boolean) => void;
	isTestSubmitted: boolean;
	darkMode: boolean;
}

export const BaconianSyncButton: React.FC<BaconianSyncButtonProps> = ({
	cipherType,
	baconianSyncEnabled,
	setBaconianSyncEnabled,
	isTestSubmitted,
	darkMode,
}) => {
	if (cipherType !== "Baconian") {
		return null;
	}

	const getButtonClassName = (): string => {
		const baseClasses =
			"px-2 py-1 rounded text-xs border transition-all duration-200";
		const stateClasses = baconianSyncEnabled
			? darkMode
				? "bg-blue-600 border-blue-500 text-white"
				: "bg-blue-500 border-blue-600 text-white"
			: darkMode
				? "bg-gray-600 border-gray-500 text-gray-300"
				: "bg-gray-200 border-gray-300 text-gray-600";
		const disabledClasses = isTestSubmitted
			? "opacity-50 cursor-not-allowed"
			: "hover:scale-105";
		return `${baseClasses} ${stateClasses} ${disabledClasses}`;
	};

	const getButtonTitle = (): string => {
		if (isTestSubmitted) {
			return "Sync disabled after submission";
		}
		return baconianSyncEnabled
			? "Disable input syncing"
			: "Enable input syncing";
	};

	return (
		<button
			type="button"
			onClick={() => setBaconianSyncEnabled(!baconianSyncEnabled)}
			disabled={isTestSubmitted}
			className={getButtonClassName()}
			title={getButtonTitle()}
		>
			{baconianSyncEnabled ? "Sync ON" : "Sync OFF"}
		</button>
	);
};
