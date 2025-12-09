interface DifficultyBarProps {
	difficulty: number;
}

export const DifficultyBar: React.FC<DifficultyBarProps> = ({ difficulty }) => {
	const difficultyColor =
		difficulty >= 0.66
			? "bg-red-500"
			: difficulty >= 0.33
				? "bg-yellow-500"
				: "bg-green-500";

	return (
		<div className="absolute right-2 w-20 h-2 rounded-full bg-gray-300">
			<div
				className={`h-full rounded-full ${difficultyColor}`}
				style={{ width: `${difficulty * 100}%` }}
			/>
		</div>
	);
};
