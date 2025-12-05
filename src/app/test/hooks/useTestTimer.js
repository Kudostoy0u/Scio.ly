Object.defineProperty(exports, "__esModule", { value: true });
exports.useTestTimer = useTestTimer;
const timeManagement_1 = require("@/app/utils/timeManagement");
const react_1 = require("react");
const react_toastify_1 = require("react-toastify");
const timeHooks_1 = require("./utils/timeHooks");
/**
 * Hook for managing test timer and countdown
 */
function useTestTimer({ isSubmitted, onTimeUp }) {
	const [timeLeft, setTimeLeft] = (0, react_1.useState)(null);
	// Sync timer from session when available
	(0, react_1.useEffect)(() => {
		try {
			const session =
				(0, timeManagement_1.resumeTestSession)() ||
				(0, timeManagement_1.getCurrentTestSession)();
			if (session) {
				setTimeLeft(session.timeState.timeLeft);
			}
		} catch (_a) {
			// Ignore errors
		}
	}, []);
	// Time warnings
	(0, react_1.useEffect)(() => {
		if (timeLeft === 30) {
			react_toastify_1.toast.warning("Warning: Thirty seconds left");
		}
		if (timeLeft === 60) {
			react_toastify_1.toast.warning("Warning: One minute left");
		}
	}, [timeLeft]);
	// Use countdown hook
	(0, timeHooks_1.useCountdown)(timeLeft, isSubmitted, setTimeLeft, onTimeUp);
	// Use pause/resume hooks
	(0, timeHooks_1.usePauseOnUnmount)();
	(0, timeHooks_1.useResumeOnMount)();
	(0, timeHooks_1.useSetupVisibility)();
	return {
		timeLeft,
		setTimeLeft,
	};
}
