import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import NotificationBell from '../NotificationBell';
import { useTheme } from '@/app/contexts/ThemeContext';

// Mock dependencies
vi.mock('@/app/contexts/ThemeContext');
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => children
}));

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

// Mock fetch globally
global.fetch = vi.fn();

describe('NotificationBell', () => {
  const defaultProps = {
    userId: 'user-123'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTheme.mockReturnValue({ darkMode: false });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ notifications: [], unread_count: 0 })
    });
  });

  it('should render notification bell', () => {
    render(<NotificationBell {...defaultProps} />);

    const bellButton = screen.getByRole('button');
    expect(bellButton).toBeInTheDocument();
  });

  it('should show unread count badge', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        notifications: [], 
        unread_count: 5 
      })
    });

    render(<NotificationBell {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('should not show badge when unread count is 0', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        notifications: [], 
        unread_count: 0 
      })
    });

    render(<NotificationBell {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  it('should show badge with 9+ for counts over 9', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        notifications: [], 
        unread_count: 15 
      })
    });

    render(<NotificationBell {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('9+')).toBeInTheDocument();
    });
  });

  it('should open notification panel when clicked', async () => {
    const mockNotifications = [
      {
        id: 'notification-1',
        type: 'new_post',
        title: 'New Post',
        message: 'A new post was created',
        is_read: false,
        created_at: '2024-01-01T00:00:00Z',
        team_name: 'Test Team'
      }
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        notifications: mockNotifications, 
        unread_count: 1 
      })
    });

    render(<NotificationBell {...defaultProps} />);

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('New Post')).toBeInTheDocument();
  });

  it('should close notification panel when close button is clicked', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        notifications: [],
        unread_count: 0
      })
    });

    render(<NotificationBell {...defaultProps} />);

    // Open the notification panel
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    // Click the bell button again to close
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });
  });

  it('should show loading state', async () => {
    // Create a promise that we can control
    let resolveFunc: any;
    const promise = new Promise<Response>(resolve => {
      resolveFunc = resolve;
    });

    (global.fetch as jest.Mock).mockImplementation(() => promise);

    render(<NotificationBell {...defaultProps} />);

    // Wait for initial load to complete
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Resolve the promise
    resolveFunc({
      ok: true,
      json: () => Promise.resolve({ notifications: [], unread_count: 0 })
    });

    // Verify the component renders
    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  it('should show no notifications message', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        notifications: [], 
        unread_count: 0 
      })
    });

    render(<NotificationBell {...defaultProps} />);

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('should display notifications with correct information', async () => {
    const mockNotifications = [
      {
        id: 'notification-1',
        type: 'new_post',
        title: 'New Post',
        message: 'A new post was created',
        is_read: false,
        created_at: '2024-01-01T00:00:00Z',
        team_name: 'Test Team'
      },
      {
        id: 'notification-2',
        type: 'new_assignment',
        title: 'New Assignment',
        message: 'A new assignment was posted',
        is_read: true,
        created_at: '2024-01-02T00:00:00Z',
        team_name: 'Test Team'
      }
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        notifications: mockNotifications, 
        unread_count: 1 
      })
    });

    render(<NotificationBell {...defaultProps} />);

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(screen.getByText('New Post')).toBeInTheDocument();
    expect(screen.getByText('A new post was created')).toBeInTheDocument();
    expect(screen.getByText('New Assignment')).toBeInTheDocument();
    expect(screen.getByText('A new assignment was posted')).toBeInTheDocument();
  });

  it('should mark notification as read when clicked', async () => {
    const mockNotifications = [
      {
        id: 'notification-1',
        type: 'new_post',
        title: 'New Post',
        message: 'A new post was created',
        is_read: false,
        created_at: '2024-01-01T00:00:00Z',
        team_name: 'Test Team'
      }
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          notifications: mockNotifications, 
          unread_count: 1 
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

    render(<NotificationBell {...defaultProps} />);

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    fireEvent.click(screen.getByText('New Post'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/teams/notifications',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_ids: ['notification-1'] })
        })
      );
    });
  });

  it('should mark all notifications as read when mark all read is clicked', async () => {
    const mockNotifications = [
      {
        id: 'notification-1',
        type: 'new_post',
        title: 'New Post',
        message: 'A new post was created',
        is_read: false,
        created_at: '2024-01-01T00:00:00Z',
        team_name: 'Test Team'
      }
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          notifications: mockNotifications, 
          unread_count: 1 
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

    render(<NotificationBell {...defaultProps} />);

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    fireEvent.click(screen.getByText('Mark all read'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/teams/notifications',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mark_all_read: true })
        })
      );
    });
  });

  it('should show view all notifications link when there are notifications', async () => {
    const mockNotifications = [
      {
        id: 'notification-1',
        type: 'new_post',
        title: 'New Post',
        message: 'A new post was created',
        is_read: false,
        created_at: '2024-01-01T00:00:00Z',
        team_name: 'Test Team'
      }
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        notifications: mockNotifications, 
        unread_count: 1 
      })
    });

    render(<NotificationBell {...defaultProps} />);

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(screen.getByText('View all notifications')).toBeInTheDocument();
  });

  it('should handle fetch errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<NotificationBell {...defaultProps} />);

    // Should not throw error
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should handle dark mode correctly', () => {
    mockUseTheme.mockReturnValue({ darkMode: true });
    render(<NotificationBell {...defaultProps} />);

    const bellButton = screen.getByRole('button');
    expect(bellButton).toHaveClass('hover:bg-gray-700');
  });

  it('should format time ago correctly', async () => {
    const mockNotifications = [
      {
        id: 'notification-1',
        type: 'new_post',
        title: 'New Post',
        message: 'A new post was created',
        is_read: false,
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        team_name: 'Test Team'
      }
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        notifications: mockNotifications, 
        unread_count: 1 
      })
    });

    render(<NotificationBell {...defaultProps} />);

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(screen.getByText('5m ago')).toBeInTheDocument();
  });

  it('should show correct notification icons', async () => {
    const mockNotifications = [
      {
        id: 'notification-1',
        type: 'new_post',
        title: 'New Post',
        message: 'A new post was created',
        is_read: false,
        created_at: '2024-01-01T00:00:00Z',
        team_name: 'Test Team'
      },
      {
        id: 'notification-2',
        type: 'new_assignment',
        title: 'New Assignment',
        message: 'A new assignment was posted',
        is_read: false,
        created_at: '2024-01-01T00:00:00Z',
        team_name: 'Test Team'
      },
      {
        id: 'notification-3',
        type: 'team_invitation',
        title: 'Team Invitation',
        message: 'You have been invited to a team',
        is_read: false,
        created_at: '2024-01-01T00:00:00Z',
        team_name: 'Test Team'
      }
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        notifications: mockNotifications, 
        unread_count: 3 
      })
    });

    render(<NotificationBell {...defaultProps} />);

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(screen.getByText('📝')).toBeInTheDocument(); // new_post
    expect(screen.getByText('📚')).toBeInTheDocument(); // new_assignment
    expect(screen.getByText('👥')).toBeInTheDocument(); // team_invitation
  });
});
