import { useTheme } from "@/app/contexts/themeContext";

interface TeamActionSectionProps {
	onCreateTeam: () => void;
	onJoinTeam: () => void;
	isCompact?: boolean;
}

export function TeamActionSection({
	onCreateTeam,
	onJoinTeam,
	isCompact = false,
}: TeamActionSectionProps) {
	const { darkMode } = useTheme();

	if (isCompact) {
		return (
			<div className="flex space-x-3">
				<button
					onClick={onCreateTeam}
					type="button"
					className={`px-4 py-2 border rounded-lg transition-colors font-medium ${
						darkMode
							? "border-blue-400 text-blue-400 hover:bg-blue-900"
							: "border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
					}`}
				>
					Create team
				</button>
				<button
					onClick={onJoinTeam}
					type="button"
					className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
				>
					Join team
				</button>
			</div>
		);
	}

	return (
		<div className="flex justify-center space-x-4">
			<button
				onClick={onCreateTeam}
				type="button"
				className={`px-6 py-3 border rounded-lg transition-colors font-medium shadow-sm ${
					darkMode
						? "border-blue-400 text-blue-400 hover:bg-blue-900"
						: "border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
				}`}
			>
				Create team
			</button>
			<button
				onClick={onJoinTeam}
				type="button"
				className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-sm"
			>
				Join team
			</button>
		</div>
	);
}
