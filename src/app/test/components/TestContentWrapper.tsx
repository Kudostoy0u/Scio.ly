import type { RouterParams } from "@/app/utils/questionUtils";
import type { ReactNode } from "react";

interface TestContentWrapperProps {
	isLoading: boolean;
	isResetting: boolean;
	fetchError: string | null;
	routerData: RouterParams;
	darkMode: boolean;
	children: ReactNode;
}

export function TestContentWrapper({
	isLoading,
	isResetting,
	fetchError,
	routerData,
	darkMode,
	children,
}: TestContentWrapperProps) {
	if (isLoading && !isResetting) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600" />
			</div>
		);
	}

	if (fetchError) {
		return <div className="text-red-600 text-center">{fetchError}</div>;
	}

	if (
		routerData.eventName === "Codebusters" &&
		routerData.types === "multiple-choice"
	) {
		return (
			<div className="flex flex-col items-center justify-center h-64">
				<p
					className={`text-xl font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}
				>
					No MCQs available for this event
				</p>
				<p
					className={`text-base ${darkMode ? "text-gray-300" : "text-gray-600"}`}
				>
					Please select &quot;MCQ + FRQ&quot; in the dashboard to practice this
					event
				</p>
			</div>
		);
	}

	return <>{children}</>;
}
