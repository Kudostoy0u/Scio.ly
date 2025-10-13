import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AssignmentDetailsStep from '../AssignmentDetailsStep';
import { AssignmentDetails } from '../assignmentTypes';

describe('AssignmentDetailsStep', () => {
  const mockProps = {
    darkMode: false,
    onNext: vi.fn(),
    onBack: vi.fn(),
    onError: vi.fn(),
    details: {
      title: '',
      description: '',
      assignmentType: 'homework' as const,
      dueDate: '',
      points: 100,
      timeLimitMinutes: 30,
      eventName: ''
    } as AssignmentDetails,
    onDetailsChange: vi.fn(),
    prefillEventName: '',
    availableEvents: ['Test Event 1', 'Test Event 2']
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all form fields', () => {
      render(<AssignmentDetailsStep {...mockProps} />);
      
      expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Event/)).toBeInTheDocument();
      expect(screen.getByLabelText('Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Due Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Points')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });

    it('renders with prefill event name', () => {
      render(<AssignmentDetailsStep {...mockProps} prefillEventName="Prefilled Event" />);
      
      expect(screen.queryByLabelText('Event')).not.toBeInTheDocument();
    });

    it('renders available events in dropdown', () => {
      render(<AssignmentDetailsStep {...mockProps} />);
      
      const eventSelect = screen.getByLabelText(/Event/);
      expect(eventSelect).toBeInTheDocument();
      
      fireEvent.click(eventSelect);
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
      expect(screen.getByText('Test Event 2')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('calls onDetailsChange when title is updated', () => {
      render(<AssignmentDetailsStep {...mockProps} />);
      
      const titleInput = screen.getByLabelText(/Title/);
      fireEvent.change(titleInput, { target: { value: 'New Title' } });
      
      expect(mockProps.onDetailsChange).toHaveBeenCalledWith({ title: 'New Title' });
    });

    it('calls onDetailsChange when event is selected', () => {
      render(<AssignmentDetailsStep {...mockProps} />);
      
      const eventSelect = screen.getByLabelText(/Event/);
      fireEvent.change(eventSelect, { target: { value: 'Test Event 1' } });
      
      expect(mockProps.onDetailsChange).toHaveBeenCalledWith({ eventName: 'Test Event 1' });
    });

    it('calls onDetailsChange when assignment type is changed', () => {
      render(<AssignmentDetailsStep {...mockProps} />);
      
      const typeSelect = screen.getByLabelText('Type');
      fireEvent.change(typeSelect, { target: { value: 'project' } });
      
      expect(mockProps.onDetailsChange).toHaveBeenCalledWith({ assignmentType: 'project' });
    });

    it('calls onDetailsChange when due date is updated', () => {
      render(<AssignmentDetailsStep {...mockProps} />);
      
      const dateInput = screen.getByLabelText('Due Date');
      fireEvent.change(dateInput, { target: { value: '2023-12-31' } });
      
      expect(mockProps.onDetailsChange).toHaveBeenCalledWith({ dueDate: '2023-12-31' });
    });

    it('calls onDetailsChange when points are updated', () => {
      render(<AssignmentDetailsStep {...mockProps} />);
      
      const pointsInput = screen.getByLabelText('Points');
      fireEvent.change(pointsInput, { target: { value: '150' } });
      
      expect(mockProps.onDetailsChange).toHaveBeenCalledWith({ points: 150 });
    });

    it('calls onDetailsChange when description is updated', () => {
      render(<AssignmentDetailsStep {...mockProps} />);
      
      const descriptionInput = screen.getByLabelText('Description');
      fireEvent.change(descriptionInput, { target: { value: 'New description' } });
      
      expect(mockProps.onDetailsChange).toHaveBeenCalledWith({ description: 'New description' });
    });
  });

  describe('Validation', () => {
    it('calls onNext when form is valid', () => {
      const validProps = {
        ...mockProps,
        details: {
          ...mockProps.details,
          title: 'Valid Title',
          eventName: 'Test Event 1'
        }
      };
      
      render(<AssignmentDetailsStep {...validProps} />);
      
      const nextButton = screen.getByText('Next: Generate Questions');
      fireEvent.click(nextButton);
      
      expect(mockProps.onNext).toHaveBeenCalled();
    });

    it('calls onError when title is missing', () => {
      render(<AssignmentDetailsStep {...mockProps} />);
      
      const nextButton = screen.getByText('Next: Generate Questions');
      fireEvent.click(nextButton);
      
      expect(mockProps.onError).toHaveBeenCalledWith('Title is required to proceed');
      expect(mockProps.onNext).not.toHaveBeenCalled();
    });

    it('calls onError when event is missing', () => {
      const propsWithoutEvent = {
        ...mockProps,
        details: {
          ...mockProps.details,
          title: 'Valid Title',
          eventName: ''
        }
      };
      
      render(<AssignmentDetailsStep {...propsWithoutEvent} />);
      
      const nextButton = screen.getByText('Next: Generate Questions');
      fireEvent.click(nextButton);
      
      expect(mockProps.onError).toHaveBeenCalledWith('Event selection is required to proceed');
      expect(mockProps.onNext).not.toHaveBeenCalled();
    });
  });

  describe('Dark Mode', () => {
    it('applies dark mode classes when darkMode is true', () => {
      render(<AssignmentDetailsStep {...mockProps} darkMode={true} />);
      
      const titleInput = screen.getByLabelText(/Title/);
      expect(titleInput).toHaveClass('bg-gray-700', 'border-gray-600', 'text-white');
    });

    it('applies light mode classes when darkMode is false', () => {
      render(<AssignmentDetailsStep {...mockProps} darkMode={false} />);
      
      const titleInput = screen.getByLabelText(/Title/);
      expect(titleInput).toHaveClass('bg-white', 'border-gray-300', 'text-gray-900');
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for all form fields', () => {
      render(<AssignmentDetailsStep {...mockProps} />);
      
      expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Event/)).toBeInTheDocument();
      expect(screen.getByLabelText('Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Due Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Points')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });

    it('has required indicators for mandatory fields', () => {
      render(<AssignmentDetailsStep {...mockProps} />);
      
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });
});
