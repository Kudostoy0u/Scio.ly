/**
 * Modal for joining a private leaderboard with a code
 */

interface JoinModalProps {
	show: boolean;
	joinCode: string;
	onJoinCodeChange: (code: string) => void;
	onJoin: () => void;
	onClose: () => void;
	darkMode: boolean;
}

export function JoinModal({
	show,
	joinCode,
	onJoinCodeChange,
	onJoin,
	onClose,
	darkMode,
}: JoinModalProps) {
	if (!show) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 flex items-center justify-center z-50"
			style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
			onClick={onClose}
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					onClose();
				}
			}}
		>
			<div
				className={`rounded-lg p-6 max-w-md w-full ${darkMode ? "bg-gray-800" : "bg-white"}`}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.stopPropagation();
					}
				}}
			>
				<h3 className="text-xl font-semibold mb-4">Join Private Leaderboard</h3>
				<input
					type="text"
					placeholder="Enter join code"
					value={joinCode}
					onChange={(e) => onJoinCodeChange(e.target.value.toUpperCase())}
					className={`w-full px-3 py-2 border rounded-lg ${
						darkMode
							? "bg-gray-700 border-gray-600 text-white"
							: "border-gray-300 text-gray-900"
					}`}
					maxLength={6}
				/>
				<div className="flex gap-2 mt-4">
					<button
						type="button"
						onClick={onClose}
						className={`flex-1 px-4 py-2 rounded-lg ${
							darkMode
								? "bg-gray-700 hover:bg-gray-600"
								: "bg-gray-200 hover:bg-gray-300"
						}`}
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={onJoin}
						className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
					>
						Join
					</button>
				</div>
			</div>
		</div>
	);
}
