Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRouterParams = resolveRouterParams;
// Removed unused imports: Question, normalizeQuestionMedia, SyncLocalStorage
function resolveRouterParams(initialRouterData, storedParamsStr) {
	const parsed = storedParamsStr ? JSON.parse(storedParamsStr) : {};
	return initialRouterData && Object.keys(initialRouterData).length > 0
		? initialRouterData
		: parsed;
}
// Removed unused export: applySsrInitialData
