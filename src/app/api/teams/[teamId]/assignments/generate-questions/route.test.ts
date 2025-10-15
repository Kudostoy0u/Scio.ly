import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database client
vi.mock('@/lib/db', () => ({
  client: {
    unsafe: vi.fn()
  }
}));

// Mock the buildAbsoluteUrl function
vi.mock('@/lib/utils/url', () => ({
  buildAbsoluteUrl: vi.fn((url: string) => url || null)
}));

describe('Assignment Question Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Question Format Validation', () => {
    it('should throw error when question has no answers field', () => {
      const invalidQuestion = {
        question: 'Which color has the highest frequency?',
        options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
        // Missing answers field - this should cause an error
      };

      expect(() => {
        validateQuestionFormat(invalidQuestion);
      }).toThrow('Question missing required answers field');
    });

    it('should throw error when question has empty answers array', () => {
      const invalidQuestion = {
        question: 'Which color has the highest frequency?',
        options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
        answers: [] // Empty answers array
      };

      expect(() => {
        validateQuestionFormat(invalidQuestion);
      }).toThrow('Question has empty answers array');
    });

    it('should throw error when question has null answers', () => {
      const invalidQuestion = {
        question: 'Which color has the highest frequency?',
        options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
        answers: null
      };

      expect(() => {
        validateQuestionFormat(invalidQuestion);
      }).toThrow('Question has null answers');
    });

    it('should pass validation for valid question with numeric answers', () => {
      const validQuestion = {
        question: 'Which color has the highest frequency?',
        options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
        answers: [5] // Violet is correct (index 5)
      };

      expect(() => {
        validateQuestionFormat(validQuestion);
      }).not.toThrow();
    });

    it('should pass validation for valid question with string answers', () => {
      const validQuestion = {
        question: 'Which color has the highest frequency?',
        options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
        answers: ['5'] // String representation of index
      };

      expect(() => {
        validateQuestionFormat(validQuestion);
      }).not.toThrow();
    });
  });

  describe('Answer Extraction Logic', () => {
    it('should extract correct answers from answers array', () => {
      const question = {
        options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
        answers: [5] // Violet is correct
      };

      const correctIndices = extractCorrectAnswerIndices(question);
      expect(correctIndices).toEqual([5]);
    });

    it('should extract correct answers from string answers', () => {
      const question = {
        options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
        answers: ['5'] // String representation
      };

      const correctIndices = extractCorrectAnswerIndices(question);
      expect(correctIndices).toEqual([5]);
    });

    it('should extract correct answers from correct_answer field (letter format)', () => {
      const question = {
        options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
        correct_answer: 'F' // F = index 5 (Violet)
      };

      const correctIndices = extractCorrectAnswerIndices(question);
      expect(correctIndices).toEqual([5]);
    });

    it('should extract correct answers from correct_answer field (numeric format)', () => {
      const question = {
        options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
        correct_answer: 5
      };

      const correctIndices = extractCorrectAnswerIndices(question);
      expect(correctIndices).toEqual([5]);
    });

    it('should throw error when no correct answers can be extracted', () => {
      const question = {
        options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
        // No answers or correct_answer field
      };

      expect(() => {
        extractCorrectAnswerIndices(question);
      }).toThrow('No correct answers found for question');
    });

    it('should throw error when correct_answer is invalid letter', () => {
      const question = {
        options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
        correct_answer: 'Z' // Invalid letter (beyond available options)
      };

      expect(() => {
        extractCorrectAnswerIndices(question);
      }).toThrow('Invalid correct_answer letter: Z');
    });
  });

  describe('Question Formatting', () => {
    it('should format question with proper answers field', () => {
      const originalQuestion = {
        question: 'Which color has the highest frequency?',
        options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
        answers: [5]
      };

      const formattedQuestion = formatAssignmentQuestion(originalQuestion, 0);
      
      expect(formattedQuestion).toEqual({
        question_text: 'Which color has the highest frequency?',
        question_type: 'multiple_choice',
        options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
        answers: [5], // This should be present and correct
        points: 1,
        order_index: 0,
        imageData: null
      });
    });

    it('should throw error if formatted question lacks answers field', () => {
      const originalQuestion = {
        question: 'Which color has the highest frequency?',
        options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
        // Missing answers
      };

      expect(() => {
        formatAssignmentQuestion(originalQuestion, 0);
      }).toThrow('No correct answers found for question');
    });
  });
});

// Helper functions for testing (these would be extracted from the actual route)
function validateQuestionFormat(question: any): void {
  if (question.answers === null) {
    throw new Error('Question has null answers');
  }
  
  if (question.answers === undefined) {
    throw new Error('Question missing required answers field');
  }
  
  if (Array.isArray(question.answers) && question.answers.length === 0) {
    throw new Error('Question has empty answers array');
  }
}

function extractCorrectAnswerIndices(question: any): number[] {
  let correctAnswerIndices: number[] = [];
  
  if (Array.isArray(question.answers) && question.answers.length > 0) {
    // Standard format: answers array with numeric indices
    correctAnswerIndices = question.answers.map((a: any) => typeof a === 'number' ? a : parseInt(a));
  } else if (question.correct_answer !== null && question.correct_answer !== undefined) {
    // Fallback: if correct_answer exists, try to extract from it
    if (typeof question.correct_answer === 'string') {
      // If it's a letter like "A", convert to index
      const letter = question.correct_answer.trim().toUpperCase();
      const index = letter.charCodeAt(0) - 65; // A=0, B=1, etc.
      if (index >= 0 && index < question.options.length) {
        correctAnswerIndices = [index];
      } else {
        throw new Error(`Invalid correct_answer letter: ${letter}`);
      }
    } else if (typeof question.correct_answer === 'number') {
      correctAnswerIndices = [question.correct_answer];
    }
  }
  
  if (correctAnswerIndices.length === 0) {
    throw new Error('No correct answers found for question');
  }
  
  return correctAnswerIndices;
}

function formatAssignmentQuestion(originalQuestion: any, index: number): any {
  const isMCQ = originalQuestion.options && Array.isArray(originalQuestion.options) && originalQuestion.options.length > 0;
  
  const correctAnswerIndices = extractCorrectAnswerIndices(originalQuestion);
  
  const formattedQuestion = {
    question_text: originalQuestion.question || originalQuestion.question_text,
    question_type: isMCQ ? 'multiple_choice' : 'free_response',
    options: isMCQ ? originalQuestion.options : undefined,
    answers: isMCQ ? correctAnswerIndices : (Array.isArray(originalQuestion.answers) ? originalQuestion.answers : [originalQuestion.correct_answer || '']),
    points: 1,
    order_index: index,
    imageData: null
  };
  
  // Validate the formatted question
  if (isMCQ && (!formattedQuestion.answers || formattedQuestion.answers.length === 0)) {
    throw new Error('Formatted question missing answers field');
  }
  
  return formattedQuestion;
}
