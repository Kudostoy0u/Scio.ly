"use client";

interface QuestionCardSkeletonProps {
	index: number;
	darkMode: boolean;
	eventName: string;
}

export default function QuestionCardSkeleton({
	index,
	darkMode,
}: QuestionCardSkeletonProps) {
	// Long text to make options take up full width, with varying lengths
	const optionTexts = [
		"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua consectetur.",
		"Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor reprehenderit.",
		"Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
		"Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem aperiam eaque ipsa quae.",
	];

	return (
		<div
			className={`relative border p-4 pb-8 rounded-lg shadow-sm transition-all duration-500 ease-in-out mb-6 ${
				darkMode
					? "bg-gray-700 border-gray-600 text-white"
					: "bg-gray-50 border-gray-300 text-black"
			}`}
		>
			<div className="flex justify-between items-start">
				<h3
					className={`font-semibold text-lg ${darkMode ? "text-white" : "text-gray-900"}`}
				>
					Question {index + 1}
				</h3>
				{/* Skeleton for QuestionActions - 3 smaller icons */}
				<div className="flex gap-1.5 mt-1">
					<div
						className={`w-6 h-6 rounded ${
							darkMode ? "bg-gray-600" : "bg-gray-300"
						} animate-pulse`}
					/>
					<div
						className={`w-6 h-6 rounded ${
							darkMode ? "bg-gray-600" : "bg-gray-300"
						} animate-pulse`}
					/>
					<div
						className={`w-6 h-6 rounded ${
							darkMode ? "bg-gray-600" : "bg-gray-300"
						} animate-pulse`}
					/>
				</div>
			</div>

			{/* Skeleton question text - single block with long text */}
			<div className="mb-4 mt-3 break-words whitespace-normal overflow-x-auto">
				<div
					className={`h-5 ${
						darkMode ? "text-gray-600 bg-gray-600" : "text-gray-300 bg-gray-300"
					} rounded animate-pulse`}
					style={{ width: "100%" }}
				>
					&nbsp;
				</div>
			</div>

			{/* Skeleton options - realistic option bars with long text */}
			<div className="space-y-2">
				{optionTexts.map((optionText) => (
					<div
						key={`skeleton-option-${index}-${optionText.slice(0, 20)}`}
						className={`block p-2 rounded-md ${
							darkMode ? "bg-gray-700" : "bg-gray-200"
						}`}
					>
						<div className="flex items-center">
							<div
								className={`w-4 h-4 rounded mr-2 flex-shrink-0 ${
									darkMode ? "bg-gray-600" : "bg-gray-400"
								} animate-pulse`}
							/>
							<div
								className={`h-6 flex-1 ${
									darkMode
										? "bg-gray-600 text-gray-600"
										: "bg-gray-300 text-gray-300"
								} rounded animate-pulse overflow-hidden`}
							>
								{optionText}
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Difficulty Bar Skeleton */}
			<div className="absolute bottom-1 right-2 w-20 h-2 rounded-full bg-gray-300">
				<div
					className={`h-full rounded-full ${
						darkMode ? "bg-gray-600" : "bg-gray-400"
					} animate-pulse`}
					style={{ width: "60%" }}
				/>
			</div>
		</div>
	);
}
