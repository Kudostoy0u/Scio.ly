import type { Question } from "@/app/utils/geminiService";
import { useState } from "react";

/**
 * Hook for managing edit and report functionality
 */
export function useTestEdit() {
  const [submittedReports, setSubmittedReports] = useState<Record<number, boolean>>({});
  const [submittedEdits, setSubmittedEdits] = useState<Record<number, boolean>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const handleReportSubmitted = (index: number) => {
    setSubmittedReports((prev) => ({ ...prev, [index]: true }));
  };

  const handleEditSubmitted = (index: number) => {
    setSubmittedEdits((prev) => ({ ...prev, [index]: true }));
  };

  const handleEditOpen = (question: Question) => {
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
