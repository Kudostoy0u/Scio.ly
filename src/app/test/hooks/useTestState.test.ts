import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Test State Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Assignment Question Validation', () => {
    it('should throw error when loading assignment questions without answers field', () => {
      const invalidQuestions = [
        {
          id: '1',
          question: 'Which color has the highest frequency?',
          options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
          // Missing answers field
        }
      ];

      expect(() => {
        validateAssignmentQuestions(invalidQuestions);
      }).toThrow('Assignment question 1 (Which color has the highest frequency?) missing required answers field');
    });

    it('should throw error when loading assignment questions with undefined answers', () => {
      const invalidQuestions = [
        {
          id: '1',
          question: 'Which color has the highest frequency?',
          options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
          answers: undefined
        }
      ];

      expect(() => {
        validateAssignmentQuestions(invalidQuestions);
      }).toThrow('Assignment question 1 (Which color has the highest frequency?) missing required answers field');
    });

    it('should throw error when loading assignment questions with null answers', () => {
      const invalidQuestions = [
        {
          id: '1',
          question: 'Which color has the highest frequency?',
          options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
          answers: null
        }
      ];

      expect(() => {
        validateAssignmentQuestions(invalidQuestions);
      }).toThrow('Assignment question 1 (Which color has the highest frequency?) missing required answers field');
    });

    it('should throw error when loading assignment questions with empty answers array', () => {
      const invalidQuestions = [
        {
          id: '1',
          question: 'Which color has the highest frequency?',
          options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
          answers: []
        }
      ];

      expect(() => {
        validateAssignmentQuestions(invalidQuestions);
      }).toThrow('Assignment question 1 (Which color has the highest frequency?) has empty answers array');
    });

    it('should pass validation for valid assignment questions', () => {
      const validQuestions = [
        {
          id: '1',
          question: 'Which color has the highest frequency?',
          options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
          answers: [5] // Violet is correct
        }
      ];

      expect(() => {
        validateAssignmentQuestions(validQuestions);
      }).not.toThrow();
    });

    it('should validate multiple questions and report which ones are invalid', () => {
      const mixedQuestions = [
        {
          id: '1',
          question: 'Valid question 1',
          options: ['A', 'B', 'C'],
          answers: [0]
        },
        {
          id: '2',
          question: 'Invalid question 2',
          options: ['A', 'B', 'C'],
          // Missing answers
        },
        {
          id: '3',
          question: 'Valid question 3',
          options: ['A', 'B', 'C'],
          answers: [1]
        }
      ];

      expect(() => {
        validateAssignmentQuestions(mixedQuestions);
      }).toThrow('Assignment question 2 (Invalid question 2) missing required answers field');
    });
  });

  describe('Question Loading Validation', () => {
    it('should validate questions when loading from localStorage', () => {
      const localStorageQuestions = [
        {
          id: '1',
          question: 'Which color has the highest frequency?',
          options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
          answers: [5]
        }
      ];

      expect(() => {
        validateLoadedQuestions(localStorageQuestions, true); // isAssignment = true
      }).not.toThrow();
    });

    it('should throw error when loading invalid assignment questions from localStorage', () => {
      const localStorageQuestions = [
        {
          id: '1',
          question: 'Which color has the highest frequency?',
          options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
          // Missing answers
        }
      ];

      expect(() => {
        validateLoadedQuestions(localStorageQuestions, true); // isAssignment = true
      }).toThrow('Invalid assignment questions loaded from localStorage');
    });

    it('should not validate answers for regular test questions', () => {
      const regularQuestions = [
        {
          id: '1',
          question: 'Which color has the highest frequency?',
          options: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet'],
          // Missing answers - but this is OK for regular tests
        }
      ];

      expect(() => {
        validateLoadedQuestions(regularQuestions, false); // isAssignment = false
      }).not.toThrow();
    });
  });
});

// Helper functions for testing
function validateAssignmentQuestions(questions: any[]): void {
  questions.forEach((question, index) => {
    if (!question.answers) {
      throw new Error(`Assignment question ${index + 1} (${question.question}) missing required answers field`);
    }
    
    if (question.answers === undefined) {
      throw new Error(`Assignment question ${index + 1} (${question.question}) has undefined answers field`);
    }
    
    if (question.answers === null) {
      throw new Error(`Assignment question ${index + 1} (${question.question}) has null answers field`);
    }
    
    if (Array.isArray(question.answers) && question.answers.length === 0) {
      throw new Error(`Assignment question ${index + 1} (${question.question}) has empty answers array`);
    }
  });
}

function validateLoadedQuestions(questions: any[], isAssignment: boolean): void {
  if (isAssignment) {
    try {
      validateAssignmentQuestions(questions);
    } catch (error) {
      throw new Error(`Invalid assignment questions loaded from localStorage: ${error.message}`);
    }
  }
  // For regular tests, we don't validate answers field
}
