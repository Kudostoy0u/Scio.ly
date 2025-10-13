import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuestionGenerationStep from '../QuestionGenerationStep';
import { QuestionGenerationSettings } from '../assignmentTypes';

describe('QuestionGenerationStep', () => {
  const mockProps = {
    darkMode: false,
    onNext: vi.fn(),
    onBack: vi.fn(),
    onError: vi.fn(),
    settings: {
      questionCount: 10,
      questionType: 'both' as const,
      selectedSubtopics: [],
      idPercentage: 0,
      pureIdOnly: false,
      timeLimitMinutes: 30
    } as QuestionGenerationSettings,
    onSettingsChange: vi.fn(),
    availableSubtopics: ['Subtopic 1', 'Subtopic 2', 'Subtopic 3'],
    supportsPictureQuestions: true,
    supportsIdentificationOnly: true,
    onGenerateQuestions: vi.fn(),
    generatingQuestions: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all form fields', () => {
      render(<QuestionGenerationStep {...mockProps} />);
      
      expect(screen.getByLabelText('Question Count')).toBeInTheDocument();
      expect(screen.getByText('Question Type')).toBeInTheDocument();
      expect(screen.getByText('Subtopics (optional)')).toBeInTheDocument();
      expect(screen.getByText('Picture Questions')).toBeInTheDocument();
    });

    it('renders question type options', () => {
      render(<QuestionGenerationStep {...mockProps} />);
      
      expect(screen.getByLabelText('MCQ')).toBeInTheDocument();
      expect(screen.getByLabelText('Both')).toBeInTheDocument();
      expect(screen.getByLabelText('FRQ')).toBeInTheDocument();
    });

    it('renders subtopics when available', () => {
      render(<QuestionGenerationStep {...mockProps} />);
      
      expect(screen.getByText('Subtopic 1')).toBeInTheDocument();
      expect(screen.getByText('Subtopic 2')).toBeInTheDocument();
      expect(screen.getByText('Subtopic 3')).toBeInTheDocument();
    });

    it('shows no subtopics message when none available', () => {
      render(<QuestionGenerationStep {...mockProps} availableSubtopics={[]} />);
      
      expect(screen.getByText('No subtopics available for this event')).toBeInTheDocument();
    });

    it('renders picture questions slider when supported', () => {
      render(<QuestionGenerationStep {...mockProps} supportsPictureQuestions={true} />);
      
      expect(screen.getByLabelText('Picture Questions')).toBeInTheDocument();
    });

    it('does not render picture questions slider when not supported', () => {
      render(<QuestionGenerationStep {...mockProps} supportsPictureQuestions={false} />);
      
      expect(screen.queryByLabelText('Picture Questions')).not.toBeInTheDocument();
    });

    it('renders identification only checkbox when supported', () => {
      render(<QuestionGenerationStep {...mockProps} supportsIdentificationOnly={true} />);
      
      expect(screen.getByLabelText('Identification Only Mode')).toBeInTheDocument();
    });

    it('does not render identification only checkbox when not supported', () => {
      render(<QuestionGenerationStep {...mockProps} supportsIdentificationOnly={false} />);
      
      expect(screen.queryByLabelText('Identification Only Mode')).not.toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('calls onSettingsChange when question count is updated', () => {
      render(<QuestionGenerationStep {...mockProps} />);
      
      const countInput = screen.getByLabelText('Question Count');
      fireEvent.change(countInput, { target: { value: '15' } });
      
      expect(mockProps.onSettingsChange).toHaveBeenCalledWith({ questionCount: 15 });
    });

    it('calls onSettingsChange when picture questions slider is moved', () => {
      render(<QuestionGenerationStep {...mockProps} />);
      
      const slider = screen.getByLabelText('Picture Questions');
      fireEvent.change(slider, { target: { value: '5' } });
      
      expect(mockProps.onSettingsChange).toHaveBeenCalledWith({ idPercentage: 5 });
    });

    it('calls onSettingsChange when question type is changed', () => {
      render(<QuestionGenerationStep {...mockProps} />);
      
      const mcqRadio = screen.getByLabelText('MCQ');
      fireEvent.click(mcqRadio);
      
      expect(mockProps.onSettingsChange).toHaveBeenCalledWith({ questionType: 'mcq' });
    });

    it('calls onSettingsChange when subtopic is selected', () => {
      render(<QuestionGenerationStep {...mockProps} />);
      
      const subtopic1Checkbox = screen.getByLabelText('Subtopic 1');
      fireEvent.click(subtopic1Checkbox);
      
      expect(mockProps.onSettingsChange).toHaveBeenCalledWith({ 
        selectedSubtopics: ['Subtopic 1'] 
      });
    });

    it('calls onSettingsChange when subtopic is deselected', () => {
      const propsWithSelectedSubtopic = {
        ...mockProps,
        settings: {
          ...mockProps.settings,
          selectedSubtopics: ['Subtopic 1']
        }
      };
      
      render(<QuestionGenerationStep {...propsWithSelectedSubtopic} />);
      
      const subtopic1Checkbox = screen.getByLabelText('Subtopic 1');
      fireEvent.click(subtopic1Checkbox);
      
      expect(mockProps.onSettingsChange).toHaveBeenCalledWith({ 
        selectedSubtopics: [] 
      });
    });

    it('calls onSettingsChange when picture questions slider is moved', () => {
      render(<QuestionGenerationStep {...mockProps} supportsPictureQuestions={true} />);
      
      const slider = screen.getByLabelText('Picture Questions');
      fireEvent.change(slider, { target: { value: '5' } });
      
      expect(mockProps.onSettingsChange).toHaveBeenCalledWith({ idPercentage: 5 });
    });

    it('calls onSettingsChange when identification only checkbox is toggled', () => {
      render(<QuestionGenerationStep {...mockProps} supportsIdentificationOnly={true} />);
      
      const checkbox = screen.getByLabelText('Identification Only Mode');
      fireEvent.click(checkbox);
      
      expect(mockProps.onSettingsChange).toHaveBeenCalledWith({ pureIdOnly: true });
    });
  });

  describe('Button Interactions', () => {
    it('calls onBack when back button is clicked', () => {
      render(<QuestionGenerationStep {...mockProps} />);
      
      const backButton = screen.getByText('Back');
      fireEvent.click(backButton);
      
      expect(mockProps.onBack).toHaveBeenCalled();
    });

    it('calls onNext when next button is clicked', () => {
      render(<QuestionGenerationStep {...mockProps} />);
      
      const nextButton = screen.getByText('Next: Preview Questions');
      fireEvent.click(nextButton);
      
      expect(mockProps.onNext).toHaveBeenCalled();
    });

    it('disables next button when generating', () => {
      render(<QuestionGenerationStep {...mockProps} generatingQuestions={true} />);
      
      const nextButton = screen.getByText('Generating Questions...');
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Validation', () => {
    it('calls onError when question count is too low', () => {
      const propsWithLowCount = {
        ...mockProps,
        settings: {
          ...mockProps.settings,
          questionCount: 0
        }
      };
      
      render(<QuestionGenerationStep {...propsWithLowCount} />);
      
      const nextButton = screen.getByText('Next: Preview Questions');
      fireEvent.click(nextButton);
      
      expect(mockProps.onError).toHaveBeenCalledWith('Question count must be between 1 and 50');
      expect(mockProps.onNext).not.toHaveBeenCalled();
    });

    it('calls onError when question count is too high', () => {
      const propsWithHighCount = {
        ...mockProps,
        settings: {
          ...mockProps.settings,
          questionCount: 100
        }
      };
      
      render(<QuestionGenerationStep {...propsWithHighCount} />);
      
      const nextButton = screen.getByText('Next: Preview Questions');
      fireEvent.click(nextButton);
      
      expect(mockProps.onError).toHaveBeenCalledWith('Question count must be between 1 and 50');
      expect(mockProps.onNext).not.toHaveBeenCalled();
    });

    it('calls onNext when validation passes', () => {
      render(<QuestionGenerationStep {...mockProps} />);
      
      const nextButton = screen.getByText('Next: Preview Questions');
      fireEvent.click(nextButton);
      
      expect(mockProps.onNext).toHaveBeenCalled();
      expect(mockProps.onError).not.toHaveBeenCalled();
    });
  });

  describe('Dark Mode', () => {
    it('applies dark mode classes when darkMode is true', () => {
      render(<QuestionGenerationStep {...mockProps} darkMode={true} />);
      
      const countInput = screen.getByLabelText('Question Count');
      expect(countInput).toHaveClass('bg-gray-700', 'border-gray-600', 'text-white');
    });

    it('applies light mode classes when darkMode is false', () => {
      render(<QuestionGenerationStep {...mockProps} darkMode={false} />);
      
      const countInput = screen.getByLabelText('Question Count');
      expect(countInput).toHaveClass('bg-white', 'border-gray-300', 'text-gray-900');
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for all form fields', () => {
      render(<QuestionGenerationStep {...mockProps} />);
      
      expect(screen.getByLabelText('Question Count')).toBeInTheDocument();
      expect(screen.getByLabelText('Picture Questions')).toBeInTheDocument();
      expect(screen.getByLabelText('MCQ')).toBeInTheDocument();
      expect(screen.getByLabelText('Both')).toBeInTheDocument();
      expect(screen.getByLabelText('FRQ')).toBeInTheDocument();
    });

    it('has proper input constraints', () => {
      render(<QuestionGenerationStep {...mockProps} />);
      
      const countInput = screen.getByLabelText('Question Count');
      expect(countInput).toHaveAttribute('min', '1');
      expect(countInput).toHaveAttribute('max', '50');
    });
  });
});
