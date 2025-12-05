Object.defineProperty(exports, "__esModule", { value: true });
exports.fuzzyGrade = fuzzyGrade;
exports.gradeMissing = gradeMissing;
exports.gradeFrqBatch = gradeFrqBatch;
function fuzzyGrade(student, corrects) {
	const normalize = (s) =>
		s
			.toLowerCase()
			.normalize("NFKD")
			.replace(/[^a-z0-9\s]/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	const levenshtein = (a, b) => {
		const m = a.length;
		const n = b.length;
		if (m === 0) {
			return n;
		}
		if (n === 0) {
			return m;
		}
		const prev = Array.from({ length: n + 1 }, (_, j) => j);
		for (let i = 1; i <= m; i++) {
			let lastDiag = i - 1;
			prev[0] = i;
			for (let j = 1; j <= n; j++) {
				const temp = prev[j];
				if (temp === undefined) {
					continue;
				}
				const cost = a[i - 1] === b[j - 1] ? 0 : 1;
				const prevJ = prev[j];
				const prevJMinus1 = prev[j - 1];
				if (prevJ !== undefined && prevJMinus1 !== undefined) {
					prev[j] = Math.min(prevJ + 1, prevJMinus1 + 1, lastDiag + cost);
				}
				lastDiag = temp;
			}
		}
		const result = prev[n];
		if (result === undefined) {
			return 0;
		}
		return result;
	};
	const s = normalize(student);
	if (!s) {
		return 0;
	}
	let best = 0;
	for (const ans of corrects) {
		const a = normalize(String(ans));
		if (!a) {
			continue;
		}
		if (s === a) {
			return 1;
		}
		if (a.includes(s) || s.includes(a)) {
			best = Math.max(best, 0.85);
		}
		const dist = levenshtein(s, a);
		const maxLen = Math.max(s.length, a.length);
		if (maxLen > 0) {
			const sim = 1 - dist / maxLen;
			best = Math.max(best, sim);
		}
	}
	if (best >= 0.9) {
		return 1;
	}
	if (best >= 0.75) {
		return 0.75;
	}
	if (best >= 0.6) {
		return 0.5;
	}
	if (best >= 0.45) {
		return 0.25;
	}
	return 0;
}
function gradeMissing(data, userAnswers, calculateMcqScore, missing) {
	const newResults = {};
	for (const i of missing) {
		const q = data[i];
		const ans = userAnswers[i] || [];
		if (
			(q === null || q === void 0 ? void 0 : q.options) &&
			q.options.length > 0
		) {
			const frac = calculateMcqScore(q, ans);
			newResults[i] = frac;
		} else {
			const val = ans[0];
			if (
				val &&
				Array.isArray(q === null || q === void 0 ? void 0 : q.answers) &&
				q.answers.length > 0
			) {
				newResults[i] = fuzzyGrade(String(val), q.answers);
			} else {
				newResults[i] = 0;
			}
		}
	}
	return newResults;
}
async function gradeFrqBatch(frqsToGrade, online) {
	const { gradeFreeResponses } = await Promise.resolve().then(() =>
		require("@/app/utils/questionUtils"),
	);
	if (!online) {
		return frqsToGrade.map((item) =>
			fuzzyGrade(item.studentAnswer, item.correctAnswers),
		);
	}
	try {
		const scores = await gradeFreeResponses(
			frqsToGrade.map((item) => ({
				question: item.question,
				correctAnswers: item.correctAnswers,
				studentAnswer: item.studentAnswer,
			})),
		);
		return scores;
	} catch (_a) {
		return frqsToGrade.map((item) =>
			fuzzyGrade(item.studentAnswer, item.correctAnswers),
		);
	}
}
