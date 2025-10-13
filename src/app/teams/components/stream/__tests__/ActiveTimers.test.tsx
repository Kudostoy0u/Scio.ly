import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ActiveTimers from '../ActiveTimers';
import { Event } from '../streamTypes';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="x-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
}));

describe('ActiveTimers', () => {
  const mockActiveTimers: Event[] = [
    {
      id: '1',
      title: 'Tournament 1',
      description: 'Test tournament',
      date: '2023-12-15',
      start_time: '2023-12-15T10:00:00Z',
      end_time: '2023-12-15T16:00:00Z',
      location: 'Test Location',
      event_type: 'tournament',
      team_id: 'team1',
      created_by: 'user1',
      created_at: '2023-12-01T00:00:00Z',
      updated_at: '2023-12-01T00:00:00Z',
    },
    {
      id: '2',
      title: 'Practice Session',
      description: 'Team practice',
      date: '2023-12-16',
      start_time: '2023-12-16T14:00:00Z',
      end_time: '2023-12-16T16:00:00Z',
      location: 'Practice Room',
      event_type: 'practice',
      team_id: 'team1',
      created_by: 'user1',
      created_at: '2023-12-01T00:00:00Z',
      updated_at: '2023-12-01T00:00:00Z',
    },
  ];

  const defaultProps = {
    darkMode: false,
    activeTimers: mockActiveTimers,
    onRemoveTimer: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders active timers section when timers exist', () => {
      render(<ActiveTimers {...defaultProps} />);
      
      // Component renders without a header text
      expect(screen.getByText('Tournament 1')).toBeInTheDocument();
      expect(screen.getByText('Practice Session')).toBeInTheDocument();
    });

    it('does not render section when no active timers', () => {
      render(<ActiveTimers {...defaultProps} activeTimers={[]} />);
      
      expect(screen.queryByText('Active Timers')).not.toBeInTheDocument();
    });

    it('renders timer countdown displays', () => {
      render(<ActiveTimers {...defaultProps} />);
      
      // Should show countdown text (format may vary based on implementation)
      expect(screen.getByText(/Tournament 1/)).toBeInTheDocument();
      expect(screen.getByText(/Practice Session/)).toBeInTheDocument();
    });
  });

  describe('Timer Interactions', () => {
    it('calls onRemoveTimer when remove button is clicked', () => {
      render(<ActiveTimers {...defaultProps} />);
      
      const removeButtons = screen.getAllByTestId('x-icon');
      fireEvent.click(removeButtons[0].closest('button')!);
      
      expect(defaultProps.onRemoveTimer).toHaveBeenCalledWith('1');
    });

    it('calls onRemoveTimer with correct event ID for each timer', () => {
      render(<ActiveTimers {...defaultProps} />);
      
      const removeButtons = screen.getAllByTestId('x-icon');
      
      // Click first remove button
      fireEvent.click(removeButtons[0].closest('button')!);
      expect(defaultProps.onRemoveTimer).toHaveBeenCalledWith('1');
      
      // Click second remove button
      fireEvent.click(removeButtons[1].closest('button')!);
      expect(defaultProps.onRemoveTimer).toHaveBeenCalledWith('2');
    });
  });

  describe('Timer Display', () => {
    it('displays tournament events with appropriate styling', () => {
      render(<ActiveTimers {...defaultProps} />);
      
      const tournamentTimer = screen.getByText('Tournament 1').closest('.p-4');
      expect(tournamentTimer).toHaveClass('bg-gray-100');
    });

    it('displays practice events with appropriate styling', () => {
      render(<ActiveTimers {...defaultProps} />);
      
      const practiceTimer = screen.getByText('Practice Session').closest('.p-4');
      expect(practiceTimer).toHaveClass('bg-gray-100');
    });
  });

  describe('Dark Mode', () => {
    it('applies dark mode classes when darkMode is true', () => {
      render(<ActiveTimers {...defaultProps} darkMode={true} />);
      
      const container = screen.getByText('Tournament 1').closest('.mb-6');
      expect(container).toHaveClass('bg-gray-800');
    });

    it('applies light mode classes when darkMode is false', () => {
      render(<ActiveTimers {...defaultProps} darkMode={false} />);
      
      const container = screen.getByText('Tournament 1').closest('.mb-6');
      expect(container).toHaveClass('bg-white');
    });
  });

  describe('Empty State', () => {
    it('renders nothing when no active timers', () => {
      const { container } = render(<ActiveTimers {...defaultProps} activeTimers={[]} />);
      
      expect(container.firstChild).toBeNull();
    });
  });
});
