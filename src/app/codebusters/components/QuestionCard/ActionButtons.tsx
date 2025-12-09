interface ActionButtonsProps {
	cipherType: string;
	darkMode: boolean;
	isTestSubmitted: boolean;
	onHintClick: () => void;
	onInfoClick: () => void;
	onReportClick?: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
	cipherType,
	darkMode,
	isTestSubmitted,
	onHintClick,
	onInfoClick,
	onReportClick,
}) => {
	return (
		<div className="flex items-center gap-2">
			<span
				className={`px-2 py-1 rounded text-sm ${
					darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"
				}`}
			>
				{cipherType.charAt(0).toUpperCase() + cipherType.slice(1)}
			</span>

			<button
				type="button"
				onClick={onHintClick}
				disabled={isTestSubmitted}
				className={`w-5 h-5 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center transition-all duration-200 ${
					isTestSubmitted ? "opacity-50 cursor-not-allowed" : "hover:scale-110"
				} ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "text-gray-600"}`}
				title={
					isTestSubmitted ? "Hints are disabled after submission" : "Get a hint"
				}
			>
				<svg
					width="10"
					height="10"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-label="Hint"
				>
					<title>Hint</title>
					<circle cx="12" cy="12" r="10" />
					<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
					<circle cx="12" cy="17" r="1" />
				</svg>
			</button>

			<button
				type="button"
				onClick={onInfoClick}
				className={`w-5 h-5 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center transition-all duration-200 hover:scale-110 ${
					darkMode ? "bg-gray-600 border-gray-500 text-white" : "text-gray-600"
				}`}
				title="Cipher information"
			>
				<svg
					width="10"
					height="10"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-label="Cipher information"
				>
					<title>Cipher information</title>
					<circle cx="12" cy="12" r="10" />
					<path d="M12 16v-4" />
					<path d="M12 8h.01" />
				</svg>
			</button>

			{isTestSubmitted && onReportClick && (
				<button
					type="button"
					onClick={onReportClick}
					className={`w-5 h-5 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center transition-all duration-200 hover:scale-110 ${
						darkMode
							? "bg-gray-600 border-gray-500 text-white"
							: "text-gray-600"
					}`}
					title="Report quote issue"
				>
					<svg
						width="10"
						height="10"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-label="Report"
					>
						<title>Report</title>
						<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
						<line x1="4" y1="22" x2="4" y2="15" />
					</svg>
				</button>
			)}
		</div>
	);
};
