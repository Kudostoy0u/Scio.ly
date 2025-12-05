"use client";

export const Pagination = ({
	currentPage,
	totalPages,
	onPageChange,
	darkMode,
}: {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	darkMode: boolean;
}) => {
	const buttonClass = darkMode
		? "px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 hover:bg-gray-600 hover:text-white"
		: "px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900";
	const activeButtonClass =
		"px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600";
	const disabledButtonClass = darkMode
		? "px-3 py-2 text-sm font-medium text-gray-500 bg-gray-800 border border-gray-700 cursor-not-allowed"
		: "px-3 py-2 text-sm font-medium text-gray-300 bg-gray-100 border border-gray-200 cursor-not-allowed";
	return (
		<div className="flex items-center justify-between mt-6">
			<div className="flex items-center space-x-2">
				<button
					type="button"
					onClick={() => onPageChange(currentPage - 1)}
					disabled={currentPage === 1}
					className={currentPage === 1 ? disabledButtonClass : buttonClass}
				>
					Previous
				</button>
				{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
					let pageNum: number;
					if (totalPages <= 5) {
						pageNum = i + 1;
					} else if (currentPage <= 3) {
						pageNum = i + 1;
					} else if (currentPage >= totalPages - 2) {
						pageNum = totalPages - 4 + i;
					} else {
						pageNum = currentPage - 2 + i;
					}
					return (
						<button
							type="button"
							key={pageNum}
							onClick={() => onPageChange(pageNum)}
							className={
								currentPage === pageNum ? activeButtonClass : buttonClass
							}
						>
							{pageNum}
						</button>
					);
				})}
				<button
					type="button"
					onClick={() => onPageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
					className={
						currentPage === totalPages ? disabledButtonClass : buttonClass
					}
				>
					Next
				</button>
			</div>
			<div
				className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}
			>
				Page {currentPage} of {totalPages}
			</div>
		</div>
	);
};
