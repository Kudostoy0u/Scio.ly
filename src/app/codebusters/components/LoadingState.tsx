import { LoadingState as SharedLoadingState } from "@/app/components/LoadingState";
import type React from "react";

interface LoadingStateProps {
  isLoading: boolean;
  error: string | null;
  darkMode: boolean;
  onRetry: () => void;
  onGoToPractice: () => void;
}

export const LoadingState: React.FC<LoadingStateProps> = (props) => {
  return (
    <SharedLoadingState
      {...props}
      loadingMessage="Loading Codebusters questions..."
      loadingSubtext="Please wait while we prepare your cipher challenges"
    />
  );
};
