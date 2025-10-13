import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuestionPreviewStep from '../QuestionPreviewStep';
import { Question } from '../assignmentTypes';

describe('QuestionPreviewStep', () => {
  const mockQuestions: Question[] = [
    {
      question_text: 'What is the capital of France?',
      question_type: 'multiple_choice',
      options: [
        { id: '1', text: 'London', isCorrect: false },
        { id: '2', text: 'Paris', isCorrect: true },
        { id: '3', text: 'Berlin', isCorrect: false },
        { id: '4', text: 'Madrid', isCorrect: false }
      ],
      correct_answer: 'Paris',
      points: 10,
      order_index: 1
    },
    {
      question_text: 'Explain the process of photosynthesis.',
      question_type: 'free_response',
      correct_answer: 'Photosynthesis is the process by which plants convert light energy into chemical energy.',
      points: 15,
      order_index: 2
    },
    {
      question_text: 'Identify this chemical compound: H2O',
      question_type: 'codebusters',
      correct_answer: 'Water',
      points: 5,
      order_index: 3,
      imageData: 'data:image/jpeg;base64,test-image-data'
    }
  ];

  const mockProps = {
    darkMode: false,
    onNext: vi.fn(),
    onBack: vi.fn(),
    onError: vi.fn(),
    questions: mockQuestions,
    showAnswers: false,
    onShowAnswersChange: vi.fn(),
    onReplaceQuestion: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders question preview header with count', () => {
      render(<QuestionPreviewStep {...mockProps} />);
      
      expect(screen.getByText('Question Preview (3 questions)')).toBeInTheDocument();
    });

    it('renders all questions', () => {
      render(<QuestionPreviewStep {...mockProps} />);
      
      expect(screen.getByText('Q1 (multiple_choice)')).toBeInTheDocument();
      expect(screen.getByText('Q2 (free_response)')).toBeInTheDocument();
      expect(screen.getByText('Q3 (codebusters)')).toBeInTheDocument();
    });

    it('renders question text', () => {
      render(<QuestionPreviewStep {...mockProps} />);
      
      expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
      expect(screen.getByText('Explain the process of photosynthesis.')).toBeInTheDocument();
      expect(screen.getByText('Identify this chemical compound: H2O')).toBeInTheDocument();
    });

    it('renders multiple choice options', () => {
      render(<QuestionPreviewStep {...mockProps} />);
      
      expect(screen.getByText('A. London')).toBeInTheDocument();
      expect(screen.getByText('B. Paris')).toBeInTheDocument();
      expect(screen.getByText('C. Berlin')).toBeInTheDocument();
      expect(screen.getByText('D. Madrid')).toBeInTheDocument();
    });

    it('renders replace button for each question', () => {
      render(<QuestionPreviewStep {...mockProps} />);
      
      const replaceButtons = screen.getAllByText('Replace');
      expect(replaceButtons).toHaveLength(3);
    });

    it('renders show answers checkbox', () => {
      render(<QuestionPreviewStep {...mockProps} />);
      
      expect(screen.getByLabelText('Show Answers')).toBeInTheDocument();
    });
  });

  describe('Show Answers Functionality', () => {
    it('shows correct answers when showAnswers is true', () => {
      render(<QuestionPreviewStep {...mockProps} showAnswers={true} />);
      
      expect(screen.getAllByText('Correct Answer:')).toHaveLength(3);
      expect(screen.getByText('Paris')).toBeInTheDocument();
      expect(screen.getByText('Photosynthesis is the process by which plants convert light energy into chemical energy.')).toBeInTheDocument();
      expect(screen.getByText('Water')).toBeInTheDocument();
    });

    it('shows correct option indicators when showAnswers is true', () => {
      render(<QuestionPreviewStep {...mockProps} showAnswers={true} />);
      
      const correctIndicators = screen.getAllByText('✓');
      expect(correctIndicators).toHaveLength(1); // Only one correct option in MCQ
    });

    it('does not show answers when showAnswers is false', () => {
      render(<QuestionPreviewStep {...mockProps} showAnswers={false} />);
      
      expect(screen.queryByText('Correct Answer:')).not.toBeInTheDocument();
      expect(screen.queryByText('✓')).not.toBeInTheDocument();
    });

    it('calls onShowAnswersChange when checkbox is toggled', () => {
      render(<QuestionPreviewStep {...mockProps} />);
      
      const checkbox = screen.getByLabelText('Show Answers');
      fireEvent.click(checkbox);
      
      expect(mockProps.onShowAnswersChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Image Handling', () => {
    it('renders image when imageData is present', () => {
      render(<QuestionPreviewStep {...mockProps} />);
      
      const image = screen.getByAltText('Question Image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'data:image/jpeg;base64,test-image-data');
    });

    it('handles image load error', () => {
      render(<QuestionPreviewStep {...mockProps} />);
      
      const image = screen.getByAltText('Question Image');
      
      // Simulate image load error
      fireEvent.error(image);
      
      expect(image).toHaveStyle('display: none');
    });
  });

  describe('Button Interactions', () => {
    it('calls onBack when back button is clicked', () => {
      render(<QuestionPreviewStep {...mockProps} />);
      
      const backButton = screen.getByText('Back');
      fireEvent.click(backButton);
      
      expect(mockProps.onBack).toHaveBeenCalled();
    });

    it('calls onNext when next button is clicked', () => {
      render(<QuestionPreviewStep {...mockProps} />);
      
      const nextButton = screen.getByText('Next: Select Roster');
      fireEvent.click(nextButton);
      
      expect(mockProps.onNext).toHaveBeenCalled();
    });

    it('calls onReplaceQuestion when replace button is clicked', () => {
      render(<QuestionPreviewStep {...mockProps} />);
      
      const replaceButtons = screen.getAllByText('Replace');
      fireEvent.click(replaceButtons[0]);
      
      expect(mockProps.onReplaceQuestion).toHaveBeenCalledWith(0);
    });

    it('calls onReplaceQuestion with correct index for each question', () => {
      render(<QuestionPreviewStep {...mockProps} />);
      
      const replaceButtons = screen.getAllByText('Replace');
      
      fireEvent.click(replaceButtons[1]);
      expect(mockProps.onReplaceQuestion).toHaveBeenCalledWith(1);
      
      fireEvent.click(replaceButtons[2]);
      expect(mockProps.onReplaceQuestion).toHaveBeenCalledWith(2);
    });
  });

  describe('Empty State', () => {
    it('renders empty state when no questions', () => {
      render(<QuestionPreviewStep {...mockProps} questions={[]} />);
      
      expect(screen.getByText('Question Preview (0 questions)')).toBeInTheDocument();
      expect(screen.queryByText('Q1')).not.toBeInTheDocument();
    });
  });

  describe('Dark Mode', () => {
    it('applies dark mode classes when darkMode is true', () => {
      render(<QuestionPreviewStep {...mockProps} darkMode={true} />);
      
      const questionContainer = screen.getByText('What is the capital of France?').closest('div');
      expect(questionContainer).toHaveClass('bg-gray-700', 'border-gray-600');
    });

    it('applies light mode classes when darkMode is false', () => {
      render(<QuestionPreviewStep {...mockProps} darkMode={false} />);
      
      const questionContainer = screen.getByText('What is the capital of France?').closest('div');
      expect(questionContainer).toHaveClass('bg-gray-50', 'border-gray-200');
    });
  });

  describe('Accessibility', () => {
    it('has proper alt text for images', () => {
      render(<QuestionPreviewStep {...mockProps} />);
      
      const image = screen.getByAltText('Question Image');
      expect(image).toBeInTheDocument();
    });

    it('has proper labels for interactive elements', () => {
      render(<QuestionPreviewStep {...mockProps} />);
      
      expect(screen.getByLabelText('Show Answers')).toBeInTheDocument();
    });

    it('has proper button text for actions', () => {
      render(<QuestionPreviewStep {...mockProps} />);
      
      expect(screen.getByText('Back')).toBeInTheDocument();
      expect(screen.getByText('Next: Select Roster')).toBeInTheDocument();
      expect(screen.getAllByText('Replace')).toHaveLength(3);
    });
  });

  describe('Question Types', () => {
    it('renders multiple choice questions correctly', () => {
      render(<QuestionPreviewStep {...mockProps} />);
      
      expect(screen.getByText('Q1 (multiple_choice)')).toBeInTheDocument();
      expect(screen.getByText('A. London')).toBeInTheDocument();
      expect(screen.getByText('B. Paris')).toBeInTheDocument();
    });

    it('renders free response questions correctly', () => {
      render(<QuestionPreviewStep {...mockProps} />);
      
      expect(screen.getByText('Q2 (free_response)')).toBeInTheDocument();
      expect(screen.getByText('Explain the process of photosynthesis.')).toBeInTheDocument();
    });

    it('renders codebusters questions correctly', () => {
      render(<QuestionPreviewStep {...mockProps} />);
      
      expect(screen.getByText('Q3 (codebusters)')).toBeInTheDocument();
      expect(screen.getByText('Identify this chemical compound: H2O')).toBeInTheDocument();
    });
  });
});
