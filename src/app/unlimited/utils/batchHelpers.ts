import type { Question } from "@/app/utils/geminiService";

export const shuffleQuestions = (questions: Question[]): Question[] => {
	const seed = Date.now();
	const rng = (() => {
		let s = seed % 2147483647;
		return () => {
			s = (s * 48271) % 2147483647;
			return s / 2147483647;
		};
	})();
	const arr = [...questions];
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		const temp = arr[i];
		const temp2 = arr[j];
		if (temp !== undefined && temp2 !== undefined) {
			arr[i] = temp2;
			arr[j] = temp;
		}
	}
	return arr;
};

export const deduplicateQuestions = (questions: Question[]): Question[] => {
	const seen = new Set<string>();
	return questions.filter((q) => {
		const qRecord = q as { id?: unknown; question?: unknown };
		const id = qRecord.id ? String(qRecord.id) : "";
		const text =
			typeof qRecord.question === "string"
				? qRecord.question.trim().toLowerCase()
				: "";
		const key = id || text;
		if (!key) {
			return true;
		}
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
};
