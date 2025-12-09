import type { QuoteData } from "@/app/codebusters/types";
import { resolveQuestionPoints } from "@/app/codebusters/utils/gradingUtils";

interface QuestionHeaderProps {
	index: number;
	item: QuoteData;
	questionPoints: { [key: number]: number };
	darkMode: boolean;
}

export const QuestionHeader: React.FC<QuestionHeaderProps> = ({
	index,
	item,
	questionPoints,
	darkMode,
}) => {
	const pts = resolveQuestionPoints(item, index, questionPoints);

	return (
		<h3
			data-question-header={true}
			className={`font-semibold text-lg ${darkMode ? "text-white" : "text-gray-900"}`}
		>
			Question {index + 1}
			<br className="md:hidden" />
			<span className="hidden md:inline"> </span>[{pts} pts]
		</h3>
	);
};
