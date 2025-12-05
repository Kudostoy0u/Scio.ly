/**
 * Modal for setting display name
 */

import { User } from "lucide-react";

interface DisplayNameModalProps {
	show: boolean;
	displayName: string;
	onDisplayNameChange: (name: string) => void;
	onSubmit: () => void;
	onClose: () => void;
	darkMode: boolean;
}

export function DisplayNameModal({
	show,
	displayName,
	onDisplayNameChange,
	onSubmit,
	onClose,
	darkMode,
}: DisplayNameModalProps) {
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
				<h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
					<User className="w-5 h-5" />
					Set Your Display Name
				</h3>
				<p
					className={`mb-4 text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
				>
					Please set a display name to join leaderboards. This name will be
					visible to other users.
				</p>
				<input
					type="text"
					placeholder="Enter display name"
					value={displayName}
					onChange={(e) => onDisplayNameChange(e.target.value)}
					className={`w-full px-3 py-2 border rounded-lg mb-4 ${
						darkMode
							? "bg-gray-700 border-gray-600 text-white"
							: "border-gray-300 text-gray-900"
					}`}
					maxLength={50}
				/>
				<div className="flex gap-2">
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
						onClick={onSubmit}
						disabled={!displayName.trim()}
						className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
					>
						Set Name
					</button>
				</div>
			</div>
		</div>
	);
}
