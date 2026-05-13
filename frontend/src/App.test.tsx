import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const mockNavigate = vi.fn();
const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
const mockSetCsrfCookieName = vi.fn();
const mockUseChatApp = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('./hooks/useChatApp', () => ({
  useChatApp: (...args: unknown[]) => mockUseChatApp(...args),
}));

vi.mock('./lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
  setCsrfCookieName: (...args: unknown[]) => mockSetCsrfCookieName(...args),
}));

vi.mock('./components/Sidebar/Sidebar', () => ({
  default: ({ onLogout }: { onLogout: () => Promise<void> }) => (
    <button type="button" onClick={() => void onLogout()}>
      Sidebar Logout
    </button>
  ),
}));

vi.mock('./components/Chat/ChatWindow', () => ({
  default: () => <div>Chat Window</div>,
}));

vi.mock('./components/RightPanel/RightPanel', () => ({
  default: () => <div>Right Panel</div>,
}));

vi.mock('./components/Auth/AuthPage', () => ({
  default: ({ mode, onLogin, onShowToast }: { mode: string; onLogin: (user: unknown) => void; onShowToast: (msg: string) => void }) => (
    <div>
      <div>Auth Mode: {mode}</div>
      <button type="button" onClick={() => onLogin({ id: '1', name: 'Alex', email: 'alex@example.com', username: 'alex', initials: 'A', role: 'Member', status: 'online' })}>
        Trigger Login
      </button>
      <button type="button" onClick={() => onShowToast('Toast from auth')}>
        Trigger Toast
      </button>
    </div>
  ),
}));

function renderApp(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  );
}

const chatState = {
  isLoading: false,
  activeConversation: { id: 'c1', name: 'Room' },
  activeConversationId: 'c1',
  activeMessages: [],
  toast: '',
  isMemberSearchLoading: false,
  localTimeLabel: '09:30 AM PST',
  memberCandidates: [],
  memberSearchQuery: '',
  isMuted: false,
  addParticipant: vi.fn(),
  toggleMuted: vi.fn(),
  setMemberSearchQuery: vi.fn(),
  showToast: vi.fn(),
};

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    mockUseChatApp.mockReturnValue(chatState);
  });

  it('shows auth routes for signed-out users', async () => {
    mockApiGet.mockRejectedValue(new Error('Unauthorized'));

    renderApp(['/login']);

    await waitFor(() => {
      expect(screen.getByText('Auth Mode: login')).toBeInTheDocument();
    });
  });

  it('redirects home after restoring a session', async () => {
    mockApiGet.mockResolvedValue({
      data: { id: '1', name: 'Alex', email: 'alex@example.com', username: 'alex', initials: 'A', role: 'Member', status: 'online' },
      meta: { csrfCookieName: 'csrf' },
    });

    renderApp(['/']);

    await waitFor(() => {
      expect(mockSetCsrfCookieName).toHaveBeenCalledWith('csrf');
      expect(mockNavigate).toHaveBeenCalledWith('/chat', { replace: true });
    });
  });

  it('renders chat loading and empty states when the hook reports them', async () => {
    mockApiGet.mockResolvedValue({
      data: { id: '1', name: 'Alex', email: 'alex@example.com', username: 'alex', initials: 'A', role: 'Member', status: 'online' },
      meta: { csrfCookieName: 'csrf' },
    });
    mockUseChatApp.mockReturnValue({ ...chatState, isLoading: true, activeConversation: null });

    renderApp(['/chat']);

    await waitFor(() => {
      expect(screen.getByText(/loading conversations/i)).toBeInTheDocument();
    });
  });

  it('renders the full chat shell when a conversation is active', async () => {
    mockApiGet.mockResolvedValue({
      data: { id: '1', name: 'Alex', email: 'alex@example.com', username: 'alex', initials: 'A', role: 'Member', status: 'online' },
      meta: { csrfCookieName: 'csrf' },
    });

    renderApp(['/chat/c1']);

    await waitFor(() => {
      expect(screen.getByText('Chat Window')).toBeInTheDocument();
      expect(screen.getByText('Right Panel')).toBeInTheDocument();
    });
  });

  it('logs out and handles auth events', async () => {
    mockApiGet.mockResolvedValue({
      data: { id: '1', name: 'Alex', email: 'alex@example.com', username: 'alex', initials: 'A', role: 'Member', status: 'online' },
      meta: { csrfCookieName: 'csrf' },
    });
    mockApiPost.mockResolvedValue({ message: 'Signed out' });

    renderApp(['/chat']);

    await waitFor(() => {
      expect(screen.getByText('Sidebar Logout')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Sidebar Logout'));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/auth/logout', {});
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });

    act(() => {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    });

    expect(mockSetCsrfCookieName).toHaveBeenCalledWith('');
  });
});
