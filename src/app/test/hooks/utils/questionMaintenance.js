Object.defineProperty(exports, "__esModule", { value: true });
exports.removeQuestionAtIndex = removeQuestionAtIndex;
// Helper function to shift indices after removing an item
function shiftIndicesAfterRemoval(original, indexToRemove) {
	const result = {};
	for (const key of Object.keys(original)) {
		const idx = Number.parseInt(key);
		const value = original[idx];
		if (value !== undefined) {
			if (idx < indexToRemove) {
				result[idx] = value;
			} else if (idx > indexToRemove) {
				result[idx - 1] = value;
			}
		}
	}
	return result;
}
function removeQuestionAtIndex(
	data,
	indexToRemove,
	userAnswers,
	gradingResults,
	explanations,
	loadingExplanation,
) {
	const newData = data.filter((_, idx) => idx !== indexToRemove);
	const newAnswers = shiftIndicesAfterRemoval(userAnswers, indexToRemove);
	const newResults = shiftIndicesAfterRemoval(gradingResults, indexToRemove);
	const newExplanations = shiftIndicesAfterRemoval(explanations, indexToRemove);
	const newLoading = shiftIndicesAfterRemoval(
		loadingExplanation,
		indexToRemove,
	);
	return { newData, newAnswers, newResults, newExplanations, newLoading };
}
