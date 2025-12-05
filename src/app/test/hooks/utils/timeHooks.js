Object.defineProperty(exports, "__esModule", { value: true });
exports.usePauseOnUnmount = usePauseOnUnmount;
exports.useResumeOnMount = useResumeOnMount;
exports.useSetupVisibility = useSetupVisibility;
exports.useCountdown = useCountdown;
const timeManagement_1 = require("@/app/utils/timeManagement");
const react_1 = require("react");
function usePauseOnUnmount() {
	(0, react_1.useEffect)(() => {
		return () => {
			try {
				(0, timeManagement_1.pauseTestSession)();
			} catch (_a) {
				// Ignore pause errors
			}
		};
	}, []);
}
function useResumeOnMount() {
	(0, react_1.useEffect)(() => {
		try {
			(0, timeManagement_1.resumeFromPause)();
		} catch (_a) {
			// Ignore resume errors
		}
	}, []);
}
function useSetupVisibility() {
	(0, react_1.useEffect)(() => {
		try {
			(0, timeManagement_1.setupVisibilityHandling)();
		} catch (_a) {
			// Ignore setup errors
		}
	}, []);
}
function useCountdown(timeLeft, isSubmitted, setTimeLeft, onTimeout) {
	(0, react_1.useEffect)(() => {
		if (timeLeft === null || isSubmitted) {
			return;
		}
		if (timeLeft === 0) {
			onTimeout();
			return;
		}
		const timer = setInterval(() => {
			const session = (0, timeManagement_1.getCurrentTestSession)();
			if (!session) {
				return;
			}
			if (
				session.timeState.isTimeSynchronized &&
				session.timeState.syncTimestamp &&
				session.timeState.originalTimeAtSync
			) {
				const now = Date.now();
				const elapsedMs = now - session.timeState.syncTimestamp;
				const elapsedSeconds = Math.floor(elapsedMs / 1000);
				const newTimeLeft = Math.max(
					0,
					session.timeState.originalTimeAtSync - elapsedSeconds,
				);
				setTimeLeft(newTimeLeft);
				(0, timeManagement_1.updateTimeLeft)(newTimeLeft);
			} else if (!session.timeState.isPaused) {
				const newTimeLeft = Math.max(0, (session.timeState.timeLeft || 0) - 1);
				setTimeLeft(newTimeLeft);
				(0, timeManagement_1.updateTimeLeft)(newTimeLeft);
			}
		}, 1000);
		return () => clearInterval(timer);
	}, [timeLeft, isSubmitted, setTimeLeft, onTimeout]);
}
