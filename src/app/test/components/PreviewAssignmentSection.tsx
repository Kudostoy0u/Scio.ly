import type { Question } from "@/app/utils/geminiService";
import type { RouterParams } from "@/app/utils/questionUtils";

interface PreviewAssignmentSectionProps {
  data: Question[];
  userAnswers: Record<number, (string | null)[]>;
  gradingResults: Record<number, number>;
  isAssignmentMode: boolean;
  routerData: RouterParams;
}

export function PreviewAssignmentSection({
  data,
  userAnswers,
  gradingResults,
  isAssignmentMode,
  routerData,
}: PreviewAssignmentSectionProps) {
  if (!isAssignmentMode) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
        📝 Assignment Preview
      </h3>
      <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
        <p>
          • <strong>{data.length}</strong> questions loaded
        </p>
        <p>
          • <strong>{Object.keys(userAnswers).length}</strong> questions answered
        </p>
        <p>
          • <strong>{Object.values(gradingResults).filter((score) => score > 0).length}</strong>{" "}
          questions graded
        </p>
        {routerData.eventName && (
          <p>
            • Event: <strong>{routerData.eventName}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
