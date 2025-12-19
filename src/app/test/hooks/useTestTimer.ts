import type { RouterParams } from "@/app/utils/questionUtils";
import {
	getCurrentTestSession,
	resumeTestSession,
} from "@/app/utils/timeManagement";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
	useCountdown,
	usePauseOnUnmount,
	useResumeOnMount,
	useSetupVisibility,
} from "./utils/timeHooks";

/**
 * Hook for managing test timer and countdown
 */
export function useTestTimer({
	isSubmitted,
	onTimeUp,
}: {
	routerData: RouterParams;
	isSubmitted: boolean;
	onTimeUp: () => void;
}) {
	const [timeLeft, setTimeLeft] = useState<number | null>(null);

	// Sync timer from session when available
	useEffect(() => {
		try {
			const session = resumeTestSession() || getCurrentTestSession();
			if (session) {
				setTimeLeft(session.timeState.timeLeft);
			}
		} catch {
			// Ignore errors
		}
	}, []);

	// Time warnings removed - now handled by useWarningToastEffect in effects.ts

	// Use countdown hook
	useCountdown(timeLeft, isSubmitted, setTimeLeft, onTimeUp);

	// Use pause/resume hooks
	usePauseOnUnmount();
	useResumeOnMount();
	useSetupVisibility();

	return {
		timeLeft,
		setTimeLeft,
	};
}
