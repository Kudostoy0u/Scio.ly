Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreStoredState = restoreStoredState;
const storage_1 = require("@/lib/utils/storage");
function restoreStoredState() {
	const userAnswers = storage_1.StorageService.getWithDefault(
		storage_1.StorageKeys.TEST_USER_ANSWERS,
		{},
	);
	const gradingResults = storage_1.StorageService.getWithDefault(
		storage_1.StorageKeys.TEST_GRADING_RESULTS,
		{},
	);
	return { userAnswers, gradingResults };
}
