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
exports.useTestEdit = useTestEdit;
const react_1 = require("react");
/**
 * Hook for managing edit and report functionality
 */
function useTestEdit() {
	const [submittedReports, setSubmittedReports] = (0, react_1.useState)({});
	const [submittedEdits, setSubmittedEdits] = (0, react_1.useState)({});
	const [isEditModalOpen, setIsEditModalOpen] = (0, react_1.useState)(false);
	const [editingQuestion, setEditingQuestion] = (0, react_1.useState)(null);
	const handleReportSubmitted = (index) => {
		setSubmittedReports((prev) =>
			__assign(__assign({}, prev), { [index]: true }),
		);
	};
	const handleEditSubmitted = (index) => {
		setSubmittedEdits((prev) =>
			__assign(__assign({}, prev), { [index]: true }),
		);
	};
	const handleEditOpen = (question) => {
		setEditingQuestion(question);
		setIsEditModalOpen(true);
	};
	const handleBackToMain = () => {
		setIsEditModalOpen(false);
		setEditingQuestion(null);
	};
	return {
		submittedReports,
		submittedEdits,
		isEditModalOpen,
		editingQuestion,
		handleReportSubmitted,
		handleEditSubmitted,
		handleEditOpen,
		handleBackToMain,
		setIsEditModalOpen,
		setSubmittedReports,
		setSubmittedEdits,
	};
}
