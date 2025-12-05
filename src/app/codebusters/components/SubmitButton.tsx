import type React from "react";

interface SubmitButtonProps {
	isTestSubmitted: boolean;
	darkMode: boolean;
	onSubmit: () => void;
	onReset: () => void;
	onGoBack: () => void;
	isAssignment?: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
	isTestSubmitted,
	darkMode,
	onSubmit,
	onReset,
	onGoBack,
	isAssignment = false,
}) => {
	return (
		<div className="mt-6 flex items-center gap-3">
			<button
				type="button"
				onClick={onGoBack}
				className={`w-1/5 px-4 py-2 font-semibold rounded-lg border-2 transition-colors flex items-center justify-center text-center ${
					darkMode
						? "bg-transparent text-yellow-300 border-yellow-400 hover:text-yellow-200 hover:border-yellow-300"
						: "bg-transparent text-yellow-600 border-yellow-500 hover:text-yellow-500 hover:border-yellow-400"
				}`}
			>
				Back
			</button>

			{isTestSubmitted ? (
				isAssignment ? (
					<div className="w-4/5 px-4 py-2 text-center text-gray-500">
						Assignment Submitted
					</div>
				) : (
					<button
						type="button"
						onClick={onReset}
						className={`w-4/5 px-4 py-2 font-semibold rounded-lg border-2 flex items-center justify-center text-center ${
							darkMode
								? "bg-transparent text-blue-300 border-blue-300 hover:text-blue-200 hover:border-blue-200"
								: "bg-transparent text-blue-700 border-blue-700 hover:text-blue-600 hover:border-blue-600"
						}`}
					>
						Reset Test
					</button>
				)
			) : (
				<button
					type="button"
					onClick={onSubmit}
					disabled={isTestSubmitted}
					className={`w-4/5 px-4 py-2 font-semibold rounded-lg border-2 flex items-center justify-center text-center ${
						darkMode
							? "bg-transparent text-blue-300 border-blue-300 hover:text-blue-200 hover:border-blue-200"
							: "bg-transparent text-blue-700 border-blue-700 hover:text-blue-600 hover:border-blue-600"
					}`}
				>
					Submit Answers
				</button>
			)}
		</div>
	);
};
