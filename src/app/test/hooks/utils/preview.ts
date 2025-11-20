import type { Question } from "@/app/utils/geminiService";
import type { GradingResults } from "@/app/utils/questionUtils";

export function buildPreviewAutofill(data: Question[]): {
  filled: Record<number, (string | null)[] | null>;
  grades: GradingResults;
} {
  const filled: Record<number, (string | null)[] | null> = {};
  const grades: GradingResults = {};
  data.forEach((q, i) => {
    if (Array.isArray(q.options) && q.options.length > 0) {
      const answerList = Array.isArray(q.answers) ? q.answers : [q.answers];
      const picks: string[] = [];
      for (const ans of answerList) {
        if (typeof ans === "string") {
          if (ans) {
            picks.push(ans);
          }
        } else if (typeof ans === "number" && q.options && ans >= 0 && ans < q.options.length) {
          const val = q.options[ans] as string;
          if (val) {
            picks.push(val);
          }
        }
      }
      if (picks.length === 0) {
        const first =
          typeof answerList[0] === "number" && q.options
            ? (q.options[answerList[0] as number] as string)
            : String(answerList[0] ?? "");
        filled[i] = [first];
      } else {
        filled[i] = picks;
      }
      grades[i] = 3;
    } else {
      const corrects = Array.isArray(q.answers) ? q.answers : [q.answers];
      const first = corrects.length > 0 ? String(corrects[0] ?? "") : "";
      filled[i] = [first];
      grades[i] = 1;
    }
  });
  return { filled, grades };
}
