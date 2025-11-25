interface BackgroundLoadingIndicatorProps {
  backgroundLoading: boolean;
  loadingProgress: { loaded: number; total: number };
  loadedStates: string[];
}

export function BackgroundLoadingIndicator({
  backgroundLoading,
  loadingProgress,
  loadedStates,
}: BackgroundLoadingIndicatorProps) {
  if (!backgroundLoading) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
      <span>
        Loading additional teams in background...
        {loadingProgress.total > 0 && (
          <span className="ml-2">({loadedStates.length} states loaded)</span>
        )}
      </span>
    </div>
  );
}
