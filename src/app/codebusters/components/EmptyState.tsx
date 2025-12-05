import { EmptyState as SharedEmptyState } from "@/app/components/LoadingState";
import type React from "react";

interface EmptyStateProps {
	darkMode: boolean;
	hasAttemptedLoad: boolean;
	isLoading: boolean;
	error: string | null;
	quotes: unknown[];
}

export const EmptyState: React.FC<EmptyStateProps> = ({
	darkMode,
	hasAttemptedLoad,
	isLoading,
	error,
	quotes,
}) => {
	const shouldShow =
		hasAttemptedLoad && !isLoading && !error && quotes.length === 0;

	return <SharedEmptyState darkMode={darkMode} shouldShow={shouldShow} />;
};
