export interface Question {
	question: string;
	options?: string[];
	answers: (number | string)[];
	difficulty: number;
}

export const parseQuestion = (
	questionData: string | unknown,
): Question | null => {
	if (typeof questionData === "string") {
		try {
			const parsed = JSON.parse(questionData);
			if (
				typeof parsed === "object" &&
				parsed !== null &&
				"question" in parsed
			) {
				const q = parsed as Partial<Question> & { question: unknown };
				return {
					question: String(q.question || ""),
					options: Array.isArray(q.options) ? q.options : [],
					answers: Array.isArray(q.answers) ? q.answers : [],
					difficulty: typeof q.difficulty === "number" ? q.difficulty : 0.5,
				};
			}
			return { question: String(parsed || ""), answers: [], difficulty: 0.5 };
		} catch {
			return {
				question: String(questionData || ""),
				answers: [],
				difficulty: 0.5,
			};
		}
	} else if (typeof questionData === "object" && questionData !== null) {
		const q = questionData as Partial<Question>;
		return {
			question: (q.question as string) || "Unknown question",
			options: (q.options as string[]) || [],
			answers: (q.answers as (number | string)[]) || [],
			difficulty:
				typeof q.difficulty === "number" ? (q.difficulty as number) : 0.5,
		};
	}
	return null;
};
