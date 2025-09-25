export interface Question {
  question: string;
  options?: string[];
  answers: (number | string)[];
  difficulty: number;
}

export const parseQuestion = (questionData: string | unknown): Question | null => {
  if (typeof questionData === 'string') {
    try {
      const parsed = JSON.parse(questionData);
      if (typeof parsed === 'object' && parsed !== null && 'question' in parsed) {
        return {
          question: (parsed as any).question,
          options: (parsed as any).options || [],
          answers: (parsed as any).answers || [],
          difficulty: typeof (parsed as any).difficulty === 'number' ? (parsed as any).difficulty : 0.5,
        };
      }
      return { question: parsed as any, answers: [], difficulty: 0.5 };
    } catch {
      return { question: questionData as any, answers: [], difficulty: 0.5 };
    }
  } else if (typeof questionData === 'object' && questionData !== null) {
    const q = questionData as Partial<Question>;
    return {
      question: (q.question as string) || 'Unknown question',
      options: (q.options as string[]) || [],
      answers: (q.answers as (number | string)[]) || [],
      difficulty: typeof q.difficulty === 'number' ? (q.difficulty as number) : 0.5,
    };
  }
  return null;
};


