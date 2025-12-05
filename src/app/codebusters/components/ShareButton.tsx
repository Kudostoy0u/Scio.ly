import { Printer, RefreshCcw } from "lucide-react";
import type React from "react";
import { FaShareAlt } from "react-icons/fa";

interface ShareButtonProps {
	onShare: () => void;
	onReset?: () => void;
	onPrint?: () => void;
	isOffline?: boolean;
	darkMode?: boolean;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
	onShare,
	onReset,
	onPrint,
	isOffline = false,
	darkMode = false,
}) => {
	return (
		<div className="flex justify-between items-center mb-4">
			<div className="flex items-center gap-4">
				{onReset && (
					<button
						type="button"
						onClick={onReset}
						title="Reset Test"
						className={`flex items-center transition-all duration-200 ${
							darkMode
								? "text-gray-400 hover:text-gray-300"
								: "text-gray-500 hover:text-gray-700"
						}`}
					>
						<RefreshCcw className="w-4 h-4 mr-2" />
						<span className="text-sm">Reset</span>
					</button>
				)}

				{onPrint && (
					<button
						type="button"
						onClick={onPrint}
						title="Print Questions"
						className={`flex items-center transition-all duration-200 ${
							darkMode
								? "text-gray-400 hover:text-gray-300"
								: "text-gray-500 hover:text-gray-700"
						}`}
					>
						<Printer className="w-4 h-4 mr-2" />
						<span className="text-sm">Print</span>
					</button>
				)}
			</div>

			<button
				type="button"
				onClick={onShare}
				disabled={isOffline}
				title={isOffline ? "Share feature not available offline" : "Share Test"}
			>
				<div
					className={`flex items-center transition-all duration-200 ${
						isOffline
							? "text-gray-400 cursor-not-allowed"
							: "text-blue-400 hover:text-blue-500"
					}`}
				>
					<FaShareAlt className="transition-all duration-500 mr-2" />
					<span className="text-sm">Take together</span>
				</div>
			</button>
		</div>
	);
};
