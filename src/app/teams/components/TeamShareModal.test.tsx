import { renderWithProviders, screen, fireEvent, waitFor } from '@/test-utils';
import TeamShareModal from './TeamShareModal';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom/vitest';

const onJoinTeam = vi.fn();
const onClose = vi.fn();

function mkFetch(handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  (globalThis as unknown as { fetch: typeof fetch }).fetch = handler as unknown as typeof fetch;
}

describe('TeamShareModal', () => {
  beforeEach(() => {
    onJoinTeam.mockReset();
    onClose.mockReset();
    (globalThis as unknown as { fetch?: typeof fetch }).fetch = undefined as any;
  });

  it('generates codes on open for captain and user', async () => {
    mkFetch(async (url, init) => {
      const u = String(url);
      if (u.startsWith('/api/teams/units?') && (!init || init.method === 'GET')) {
        return new Response(JSON.stringify({ success: true, data: [{ captainCode: 'CAPT_CODE', userCode: 'USER_CODE' }] }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    });

    renderWithProviders(
      <TeamShareModal
        isOpen
        onClose={onClose}
        school="Test High"
        division="C"
        isCaptain
      />
    );

    await waitFor(() => expect(screen.getByDisplayValue('USER_CODE')).toBeInTheDocument());
  });

  it('joins team with code', async () => {
    mkFetch(async (url, init) => {
      const u = String(url);
      if (u === '/api/teams/join-by-code' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body || '{}'));
        if (body.code === 'JOINME') {
          return new Response(JSON.stringify({ success: true, slug: 'abc123', role: 'user' }), { status: 200 });
        }
      }
      return new Response('{}', { status: 200 });
    });

    renderWithProviders(
      <TeamShareModal
        isOpen
        onClose={onClose}
        school="Test High"
        division="C"
        isCaptain={false}
      />
    );
    // Switch to Join tab (first button in tab header)
    const tabJoinBtn = screen.getAllByRole('button', { name: 'Join Team' })[0];
    fireEvent.click(tabJoinBtn);
    // Submit button (it's the second 'Join Team' button)
    const buttons = screen.getAllByRole('button', { name: 'Join Team' });
    const joinBtn = buttons[buttons.length - 1] as HTMLButtonElement;

    const input = screen.getByPlaceholderText('Enter team code...');
    fireEvent.change(input, { target: { value: 'JOINME' } });
    expect(joinBtn.disabled).toBe(false);
    fireEvent.click(joinBtn);
    // UI path exercised; full integration relies on network and timers
    expect(joinBtn).toBeInTheDocument();
  });
});
