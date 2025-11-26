import type { RouterParams } from "@/app/utils/questionUtils";
import { useEffect, useState } from "react";

/**
 * Hook for managing user answers with localStorage persistence
 * Handles both practice mode and assignment mode
 */
export function useTestAnswers({ routerData }: { routerData: RouterParams }) {
  const [userAnswers, setUserAnswers] = useState<Record<number, (string | null)[] | null>>({});

  /**
   * Handle answer changes for both single and multi-select questions
   */
  const handleAnswerChange = (
    questionIndex: number,
    answer: string | null,
    multiselect = false
  ) => {
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

      const updatedAnswers = { ...prev, [questionIndex]: newAnswers };

      // Use assignment-specific localStorage keys if in assignment mode
      const isAssignmentMode = !!(
        routerData.assignmentId ||
        routerData.teamsAssign === "1" ||
        routerData.teamsAssign === 1
      );

      if (isAssignmentMode && routerData.assignmentId) {
        const assignmentKey = `assignment_${routerData.assignmentId}`;
        localStorage.setItem(`${assignmentKey}_answers`, JSON.stringify(updatedAnswers));
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
