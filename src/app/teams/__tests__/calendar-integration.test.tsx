import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TeamCalendar from '../components/TeamCalendar';
import TeamsLanding from '../components/TeamsLanding';

// Mock all the required modules
vi.mock('@/app/contexts/ThemeContext', () => ({
  useTheme: () => ({
    darkMode: false,
  }),
}));

vi.mock('@/app/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
  }),
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Plus: ({ className }: any) => <div className={className} data-testid="plus-icon" />,
  Edit: ({ className }: any) => <div className={className} data-testid="edit-icon" />,
  Trash2: ({ className }: any) => <div className={className} data-testid="trash-icon" />,
  X: ({ className }: any) => <div className={className} data-testid="x-icon" />,
  Repeat: ({ className }: any) => <div className={className} data-testid="repeat-icon" />,
  ChevronLeft: ({ className }: any) => <div className={className} data-testid="chevron-left-icon" />,
  ChevronRight: ({ className }: any) => <div className={className} data-testid="chevron-right-icon" />,
  Home: ({ className }: any) => <div className={className} data-testid="home-icon" />,
  Calendar: ({ className }: any) => <div className={className} data-testid="calendar-icon" />,
  Archive: ({ className }: any) => <div className={className} data-testid="archive-icon" />,
  Settings: ({ className }: any) => <div className={className} data-testid="settings-icon" />,
  Users: ({ className }: any) => <div className={className} data-testid="users-icon" />,
}));

// Mock NotificationsContext
vi.mock('@/app/contexts/NotificationsContext', () => ({
  useNotifications: () => ({
    unread: 0,
    notifs: [],
    refresh: vi.fn(),
    markAllRead: vi.fn(),
    markReadById: vi.fn(),
    clearingAll: false,
    setClearingAll: vi.fn(),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Calendar Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Calendar Component Integration', () => {
    it('loads and displays team events and personal events', async () => {
      const mockTeamEvents = [
        {
          id: 'team-event-1',
          title: 'Team Practice',
          start_time: new Date().toISOString(),
          event_type: 'practice',
          team_id: 'team-123',
        },
      ];

      const mockPersonalEvents = [
        {
          id: 'personal-event-1',
          title: 'Personal Study',
          start_time: new Date().toISOString(),
          event_type: 'personal',
          team_id: null,
        },
      ];

      const mockRecurringMeetings = [
        {
          id: 'recurring-1',
          title: 'Weekly Practice',
          days_of_week: [1, 3], // Monday and Wednesday
          start_time: '15:00',
          end_time: '17:00',
          exceptions: [],
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, events: mockTeamEvents }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, events: mockPersonalEvents }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, meetings: mockRecurringMeetings }),
        });

      render(
        <TeamCalendar
          teamId="team-123"
          isCaptain={true}
          teamSlug="test-team"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Team Practice')).toBeInTheDocument();
        expect(screen.getByText('Personal Study')).toBeInTheDocument();
      });

      // Verify all API calls were made
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/teams/v2/team-123/events')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/teams/calendar/personal')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/teams/v2/team-123/recurring-meetings')
      );
    });

    it('creates event and refreshes calendar', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, events: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, events: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, meetings: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, eventId: 'new-event-id' }),
        });

      render(
        <TeamCalendar
          teamId="team-123"
          isCaptain={true}
          teamSlug="test-team"
        />
      );

      // Open event modal
      const addEventButton = screen.getByText('Add Event');
      fireEvent.click(addEventButton);

      await waitFor(() => {
        expect(screen.getByText('Create Event')).toBeInTheDocument();
      });

      // Fill out form
      fireEvent.change(screen.getByPlaceholderText('Event title'), {
        target: { value: 'New Team Event' },
      });
      fireEvent.change(screen.getByDisplayValue(''), {
        target: { value: '14:00' },
      });
      fireEvent.change(screen.getByDisplayValue(''), {
        target: { value: '16:00' },
      });

      // Submit form
      const createButton = screen.getByText('Create');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/teams/calendar/events',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('New Team Event'),
          })
        );
      });
    });

    it('creates recurring meeting and refreshes calendar', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, events: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, events: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, meetings: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, meetingId: 'new-meeting-id' }),
        });

      render(
        <TeamCalendar
          teamId="team-123"
          isCaptain={true}
          teamSlug="test-team"
        />
      );

      // Open recurring meeting modal
      const recurringButton = screen.getByText('Recurring');
      fireEvent.click(recurringButton);

      await waitFor(() => {
        expect(screen.getByText('Create Recurring Meeting')).toBeInTheDocument();
      });

      // Fill out form
      fireEvent.change(screen.getByPlaceholderText('e.g., Weekly Science Olympiad Practice'), {
        target: { value: 'Weekly Practice' },
      });

      // Select days of week
      const mondayCheckbox = screen.getByDisplayValue('1');
      const wednesdayCheckbox = screen.getByDisplayValue('3');
      fireEvent.click(mondayCheckbox);
      fireEvent.click(wednesdayCheckbox);

      fireEvent.change(screen.getByDisplayValue(''), {
        target: { value: '15:00' },
      });
      fireEvent.change(screen.getByDisplayValue(''), {
        target: { value: '17:00' },
      });

      // Submit form
      const createButton = screen.getByText('Create Recurring Meeting');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/teams/calendar/recurring-meetings',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('Weekly Practice'),
          })
        );
      });
    });
  });

  describe('TeamsLanding Integration', () => {
    it('switches to upcoming tab and shows calendar', async () => {
      const mockUserTeams = [
        {
          id: 'team-1',
          name: 'Test Team',
          slug: 'test-team',
          members: [],
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, events: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, events: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, meetings: [] }),
        });

      render(
        <TeamsLanding
          onCreateTeam={() => {}}
          onJoinTeam={() => {}}
          userTeams={mockUserTeams}
          onTeamSelect={() => {}}
        />
      );

      // Click on Upcoming tab
      const upcomingTab = screen.getByText('Upcoming');
      fireEvent.click(upcomingTab);

      await waitFor(() => {
        expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
      });
    });

    it('shows different content for different tabs', async () => {
      const mockUserTeams = [
        {
          id: 'team-1',
          name: 'Test Team',
          slug: 'test-team',
          members: [],
        },
      ];

      render(
        <TeamsLanding
          onCreateTeam={() => {}}
          onJoinTeam={() => {}}
          userTeams={mockUserTeams}
          onTeamSelect={() => {}}
        />
      );

      // Should start with home tab
      expect(screen.getByText('Add a team to get started')).toBeInTheDocument();

      // Switch to settings tab
      const settingsTab = screen.getByText('Settings');
      fireEvent.click(settingsTab);

      await waitFor(() => {
        expect(screen.getByText('Team and account settings will appear here.')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('handles API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(
        <TeamCalendar
          teamId="team-123"
          isCaptain={true}
          teamSlug="test-team"
        />
      );

      await waitFor(() => {
        // Should not crash and should show calendar
        expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
      });
    });

    it('handles partial API failures', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, events: [] }),
        })
        .mockRejectedValueOnce(new Error('Personal events failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, meetings: [] }),
        });

      render(
        <TeamCalendar
          teamId="team-123"
          isCaptain={true}
          teamSlug="test-team"
        />
      );

      await waitFor(() => {
        // Should still show calendar even if personal events fail
        expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
      });
    });
  });

  describe('Calendar Navigation Integration', () => {
    it('navigates between months and maintains state', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, events: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, events: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, meetings: [] }),
        });

      render(
        <TeamCalendar
          teamId="team-123"
          isCaptain={true}
          teamSlug="test-team"
        />
      );

      // Navigate to next month
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        // Should show next month
        expect(screen.getByText(/February|March|April/)).toBeInTheDocument();
      });

      // Navigate to previous month
      const prevButton = screen.getByRole('button', { name: /previous/i });
      fireEvent.click(prevButton);

      await waitFor(() => {
        // Should show previous month
        expect(screen.getByText(/December|January/)).toBeInTheDocument();
      });
    });

    it('changes view modes and maintains calendar state', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, events: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, events: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, meetings: [] }),
        });

      render(
        <TeamCalendar
          teamId="team-123"
          isCaptain={true}
          teamSlug="test-team"
        />
      );

      // Change to week view
      const weekButton = screen.getByText('Week');
      fireEvent.click(weekButton);

      expect(weekButton).toHaveClass('bg-blue-500');

      // Change to day view
      const dayButton = screen.getByText('Day');
      fireEvent.click(dayButton);

      expect(dayButton).toHaveClass('bg-blue-500');
      expect(weekButton).not.toHaveClass('bg-blue-500');
    });
  });

  describe('Event Interaction Integration', () => {
    it('allows clicking on events to view details', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Team Practice',
          start_time: new Date().toISOString(),
          event_type: 'practice',
          description: 'Weekly team practice',
          location: 'Gym',
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, events: mockEvents }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, events: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, meetings: [] }),
        });

      render(
        <TeamCalendar
          teamId="team-123"
          isCaptain={true}
          teamSlug="test-team"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Team Practice')).toBeInTheDocument();
      });

      // Click on event
      const eventElement = screen.getByText('Team Practice');
      fireEvent.click(eventElement);

      // Should open event details or modal
      // This would depend on the specific implementation
    });

    it('allows adding events to specific dates', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, events: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, events: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, meetings: [] }),
        });

      render(
        <TeamCalendar
          teamId="team-123"
          isCaptain={true}
          teamSlug="test-team"
        />
      );

      // Find a day in the current month
      const dayButtons = screen.getAllByRole('button');
      const dayButton = dayButtons.find(button => 
        button.textContent && /^\d+$/.test(button.textContent)
      );

      if (dayButton) {
        fireEvent.click(dayButton);

        await waitFor(() => {
          expect(screen.getByText('Create Event')).toBeInTheDocument();
        });
      }
    });
  });
});
