let __assign =
	(this && this.__assign) ||
	function () {
		__assign =
			Object.assign ||
			((t) => {
				for (let s, i = 1, n = arguments.length; i < n; i++) {
					s = arguments[i];
					for (const p in s)
						if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
				}
				return t;
			});
		return __assign.apply(this, arguments);
	};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTestAnswers = useTestAnswers;
const react_1 = require("react");
/**
 * Hook for managing user answers with localStorage persistence
 * Handles both practice mode and assignment mode
 */
function useTestAnswers({ routerData }) {
	const [userAnswers, setUserAnswers] = (0, react_1.useState)({});
	/**
	 * Handle answer changes for both single and multi-select questions
	 */
	const handleAnswerChange = (questionIndex, answer, multiselect = false) => {
		setUserAnswers((prev) => {
			const currentAnswers = prev[questionIndex] || [];
			let newAnswers;
			if (multiselect) {
				newAnswers = currentAnswers.includes(answer)
					? currentAnswers.filter((ans) => ans !== answer)
					: [...currentAnswers, answer];
			} else {
				newAnswers = [answer];
			}
			const updatedAnswers = __assign(__assign({}, prev), {
				[questionIndex]: newAnswers,
			});
			// Use assignment-specific localStorage keys if in assignment mode
			const isAssignmentMode = !!(
				routerData.assignmentId ||
				routerData.teamsAssign === "1" ||
				routerData.teamsAssign === 1
			);
			if (isAssignmentMode && routerData.assignmentId) {
				const assignmentKey = `assignment_${routerData.assignmentId}`;
				localStorage.setItem(
					`${assignmentKey}_answers`,
					JSON.stringify(updatedAnswers),
				);
			} else {
				localStorage.setItem("testUserAnswers", JSON.stringify(updatedAnswers));
			}
			return updatedAnswers;
		});
	};
	/**
	 * Reset all answers
	 */
	const resetAnswers = () => {
		setUserAnswers({});
		const isAssignmentMode = !!(
			routerData.assignmentId ||
			routerData.teamsAssign === "1" ||
			routerData.teamsAssign === 1
		);
		if (isAssignmentMode && routerData.assignmentId) {
			const assignmentKey = `assignment_${routerData.assignmentId}`;
			localStorage.removeItem(`${assignmentKey}_answers`);
		} else {
			localStorage.removeItem("testUserAnswers");
		}
	};
	return {
		userAnswers,
		setUserAnswers,
		handleAnswerChange,
		resetAnswers,
	};
}
