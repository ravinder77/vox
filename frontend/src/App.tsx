import { useEffect, useEffectEvent, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import AuthPage from './components/Auth/AuthPage';
import Sidebar from './components/Sidebar/Sidebar';
import ChatWindow from './components/Chat/ChatWindow';
import RightPanel from './components/RightPanel/RightPanel';
import Toast from './components/UI/Toast';
import { useChatApp } from './hooks/useChatApp';
import { api, setCsrfCookieName } from './lib/api';
import type { AuthMode, User } from './types/app';

type ChatScreenProps = {
  authUser: User | null;
  onLogout: () => Promise<void>;
  toastMessage: string;
};

type AuthScreenProps = {
  authUser: User | null;
  mode: AuthMode;
  onLogin: (user: User) => void;
  onShowToast: (message: string) => void;
};

type HomeRedirectProps = {
  authUser: User | null;
  isAuthBootstrapping: boolean;
};

function ChatScreen({ authUser, onLogout, toastMessage }: ChatScreenProps) {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const chat = useChatApp(authUser, conversationId, (id, options) => navigate(`/chat/${id}`, options));

  if (!authUser) {
    return <Navigate replace to="/login" />;
  }

  if (chat.isLoading) {
    return (
      <>
        <div className="app-shell">
          <Sidebar {...chat} onLogout={onLogout} />
          <main className="main">
            <div className="empty-state">
              <div className="empty-title">Loading conversations…</div>
            </div>
          </main>
        </div>
        <Toast message={chat.toast || toastMessage} />
      </>
    );
  }

  if (!chat.activeConversation) {
    return (
      <>
        <div className="app-shell">
          <Sidebar {...chat} onLogout={onLogout} />
          <main className="main">
            <div className="empty-state">
              <div className="empty-title">No conversations yet</div>
            </div>
          </main>
        </div>
        <Toast message={chat.toast || toastMessage} />
      </>
    );
  }

  return (
    <>
      <div className="app-shell">
        <Sidebar {...chat} onLogout={onLogout} />
        <ChatWindow {...chat} />
        <RightPanel
          activeConversation={chat.activeConversation}
          isMemberSearchLoading={chat.isMemberSearchLoading}
          localTimeLabel={chat.localTimeLabel}
          memberCandidates={chat.memberCandidates}
          memberSearchQuery={chat.memberSearchQuery}
          isMuted={chat.isMuted}
          onAddParticipant={chat.addParticipant}
          onToggleMuted={chat.toggleMuted}
          onMemberSearchChange={chat.setMemberSearchQuery}
          onShowToast={chat.showToast}
        />
      </div>
      <Toast message={chat.toast || toastMessage} />
    </>
  );
}

function AuthScreen({ authUser, mode, onLogin, onShowToast }: AuthScreenProps) {
  if (authUser) {
    return <Navigate replace to="/chat" />;
  }

  return <AuthPage mode={mode} onLogin={onLogin} onShowToast={onShowToast} />;
}

function HomeRedirect({ authUser, isAuthBootstrapping }: HomeRedirectProps) {
  if (isAuthBootstrapping) {
    return (
      <main className="main">
        <div className="empty-state">
          <div className="empty-title">Checking session…</div>
        </div>
      </main>
    );
  }

  return <Navigate replace to={authUser ? '/chat' : '/login'} />;
}

export default function App() {
  const navigate = useNavigate();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isAuthBootstrapping, setIsAuthBootstrapping] = useState(true);

  const handleUnauthorized = useEffectEvent(() => {
    window.sessionStorage.removeItem('vox_user');
    setCsrfCookieName('');
    setAuthUser(null);
    setToastMessage('Session expired. Please sign in again.');
    navigate('/login', { replace: true });
  });

  useEffect(() => {
    let ignore = false;

    async function restoreSession() {
      const isChatPath =
        window.location.pathname === '/chat' || window.location.pathname.startsWith('/chat/');
      try {
        const response = await api.get<User>('/auth/me');
        const isAuthPath = ['/login', '/signup', '/forgot', '/forgot/sent'].includes(window.location.pathname);

        if (ignore) {
          return;
        }

        if (response.data) {
          setCsrfCookieName(String(response.meta?.csrfCookieName || ''));
          window.sessionStorage.setItem('vox_user', JSON.stringify(response.data));
          setAuthUser(response.data);

          if (window.location.pathname === '/' || isAuthPath) {
            navigate('/chat', { replace: true });
          }
          return;
        }

        window.sessionStorage.removeItem('vox_user');
        setCsrfCookieName('');
        setAuthUser(null);
        if (window.location.pathname === '/' || isChatPath) {
          navigate('/login', { replace: true });
        }
      } catch {
        if (!ignore) {
          window.sessionStorage.removeItem('vox_user');
          setCsrfCookieName('');
          setAuthUser(null);
          if (window.location.pathname === '/' || isChatPath) {
            navigate('/login', { replace: true });
          }
        }
      } finally {
        if (!ignore) {
          setIsAuthBootstrapping(false);
        }
      }
    }

    restoreSession();

    return () => {
      ignore = true;
    };
  }, [navigate]);

  useEffect(() => {
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setToastMessage('');
    }, 2200);

    return () => window.clearTimeout(timerId);
  }, [toastMessage]);

  function handleLogin(user: User) {
    window.sessionStorage.setItem('vox_user', JSON.stringify(user));
    setAuthUser(user);
    navigate('/chat', { replace: true });
  }

  async function handleLogout() {
    try {
      const response = await api.post('/auth/logout', {});
      setToastMessage(response.message);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Signed out');
    } finally {
      window.sessionStorage.removeItem('vox_user');
      setCsrfCookieName('');
      setAuthUser(null);
      navigate('/login', { replace: true });
    }
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<HomeRedirect authUser={authUser} isAuthBootstrapping={isAuthBootstrapping} />} />
        <Route
          path="/login"
          element={
            <AuthScreen authUser={authUser} mode="login" onLogin={handleLogin} onShowToast={setToastMessage} />
          }
        />
        <Route
          path="/signup"
          element={
            <AuthScreen authUser={authUser} mode="signup" onLogin={handleLogin} onShowToast={setToastMessage} />
          }
        />
        <Route
          path="/forgot"
          element={
            <AuthScreen authUser={authUser} mode="forgot" onLogin={handleLogin} onShowToast={setToastMessage} />
          }
        />
        <Route
          path="/forgot/sent"
          element={
            <AuthScreen authUser={authUser} mode="forgotOk" onLogin={handleLogin} onShowToast={setToastMessage} />
          }
        />
        <Route path="/chat" element={<ChatScreen authUser={authUser} onLogout={handleLogout} toastMessage={toastMessage} />} />
        <Route
          path="/chat/:conversationId"
          element={<ChatScreen authUser={authUser} onLogout={handleLogout} toastMessage={toastMessage} />}
        />
        <Route path="*" element={<Navigate replace to={authUser ? '/chat' : '/login'} />} />
      </Routes>
      <Toast message={toastMessage} />
    </>
  );
}
