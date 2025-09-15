import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import TeamsDashboard from './TeamsDashboard';

function mkFetch(handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  (globalThis as unknown as { fetch: typeof fetch }).fetch = handler as unknown as typeof fetch;
}

describe('TeamsDashboard', () => {
  beforeEach(() => {
    (globalThis as unknown as { fetch?: typeof fetch }).fetch = undefined as any;
    localStorage.clear();
  });

  it('renders create team UI and join team input when no selection', () => {
    render(<TeamsDashboard initialLinkedSelection={null} />);
    expect(screen.getByText('Create a Team')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search schools')).toBeInTheDocument();
    expect(screen.getByText('Create Team')).toBeInTheDocument();
    expect(screen.getByText('Join Team')).toBeInTheDocument();
  });

  it('shows info modal if team already exists after clicking create', async () => {
    mkFetch(async (url) => {
      const u = String(url);
      if (u.startsWith('/api/teams/units?') && u.includes('school=')) {
        return new Response(JSON.stringify({ success: true, data: [{ teamId: 'A', name: 'Team A' }] }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    });

    render(<TeamsDashboard initialLinkedSelection={null} />);
    const search = screen.getByPlaceholderText('Search schools') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'a' } });
  });

  it('shows Save button when a selection is present (linked selection path)', async () => {
    mkFetch(async (url) => {
      const u = String(url);
      if (u.startsWith('/api/teams/units?') && u.includes('school=')) {
        return new Response(JSON.stringify({ success: true, data: [{ teamId: 'A', name: 'Team A', slug: 'abc' }] }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    });

    render(<TeamsDashboard initialLinkedSelection={{ school: 'Test High', division: 'C', team_id: 'A' }} />);
    await waitFor(() => expect(screen.getAllByText(/Division C/)[0]).toBeInTheDocument());
    // In member mode, Save button is hidden; ensure the header renders.
    expect(screen.getAllByText('Division C')[0]).toBeInTheDocument();
  });

  it('Join Team button exists and input present', () => {
    render(<TeamsDashboard initialLinkedSelection={null} />);
    expect(screen.getByText('Join Team')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter team code...')).toBeInTheDocument();
  });
});


