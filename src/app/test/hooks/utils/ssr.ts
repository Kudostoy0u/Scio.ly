// Removed unused imports: Question, normalizeQuestionMedia, SyncLocalStorage

export function resolveRouterParams(
  initialRouterData: Record<string, unknown>,
  storedParamsStr: string | null
) {
  const parsed = storedParamsStr ? JSON.parse(storedParamsStr) : {};
  return initialRouterData && Object.keys(initialRouterData).length > 0
    ? initialRouterData
    : parsed;
}

// Removed unused export: applySsrInitialData
