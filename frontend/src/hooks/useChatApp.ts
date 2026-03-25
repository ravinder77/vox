import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { api } from '../lib/api';
import { connectSocket, disconnectSocket, emitSocketEvent, socket } from '../lib/socket';
import type { BootstrapData, Conversation, User } from '../types/app';
import { bumpConversationList, syncConversationList } from '../utils/conversations';
import { formatNow, getLocalTimeLabel } from '../utils/chat';

export function useChatApp(authUser, routedConversationId, navigateToConversation) {
  const [conversationItems, setConversationItems] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState('');
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [typingByConversation, setTypingByConversation] = useState({});
  const [callsByConversation, setCallsByConversation] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [composerValue, setComposerValue] = useState('');
  const [replyContext, setReplyContext] = useState(null);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [toast, setToast] = useState('');
  const [callSeconds, setCallSeconds] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [currentPresence, setCurrentPresence] = useState('online');
  const [localTimeLabel, setLocalTimeLabel] = useState(getLocalTimeLabel());
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedBootstrap, setHasLoadedBootstrap] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberCandidates, setMemberCandidates] = useState([]);
  const [isMemberSearchLoading, setIsMemberSearchLoading] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newChatMode, setNewChatMode] = useState('direct');
  const [newChatSearchQuery, setNewChatSearchQuery] = useState('');
  const [newChatUsers, setNewChatUsers] = useState([]);
  const [isNewChatLoading, setIsNewChatLoading] = useState(false);
  const [selectedNewGroupUserIds, setSelectedNewGroupUserIds] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [isRouteTransitionPending, startRouteTransition] = useTransition();
  const toastTimerRef = useRef(null);
  const callTimerRef = useRef(null);
  const typingTimerRef = useRef(null);
  const awayTimerRef = useRef(null);
  const typingStatusRef = useRef({
    conversationId: null,
    isTyping: false,
  });
  const presenceStatusRef = useRef('online');
  const didInitiateSocketDisconnectRef = useRef(false);
  const didSkipInitialConversationRefreshRef = useRef(false);
  const currentUser = authUser;
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredMemberSearchQuery = useDeferredValue(memberSearchQuery);
  const deferredNewChatSearchQuery = useDeferredValue(newChatSearchQuery);

  const activeConversation = useMemo(
    () => conversationItems.find((item) => item.id === activeConversationId) ?? conversationItems[0],
    [activeConversationId, conversationItems],
  );
  const isMuted = Boolean(activeConversation?.isMuted);

  const activeConversationKey = activeConversation?.id ?? activeConversationId;
  const activeMessages = messagesByConversation[activeConversationKey] ?? [];
  const activeTypingState = typingByConversation[activeConversationKey] ?? null;
  const activeCall = callsByConversation[activeConversationKey] ?? null;
  const filteredConversations = conversationItems;
  const navigateToConversationEvent = useEffectEvent((id: string, options?: { replace?: boolean }) => {
    navigateToConversation?.(id, options);
  });

  function scheduleAway() {
    if (awayTimerRef.current) {
      window.clearTimeout(awayTimerRef.current);
    }

    awayTimerRef.current = window.setTimeout(() => {
      if (presenceStatusRef.current === 'away') {
        return;
      }

      presenceStatusRef.current = 'away';
      setCurrentPresence('away');
      emitSocketEvent('presence:set', { status: 'away' }).catch(() => {});
    }, 60000);
  }

  function pushPresence(status, options: { restartAwayTimer?: boolean } = {}) {
    const restartAwayTimer = options.restartAwayTimer ?? status === 'online';

    if (presenceStatusRef.current !== status) {
      presenceStatusRef.current = status;
      setCurrentPresence(status);
      emitSocketEvent('presence:set', { status }).catch(() => {});
    }

    if (restartAwayTimer) {
      scheduleAway();
      return;
    }

    if (awayTimerRef.current) {
      window.clearTimeout(awayTimerRef.current);
    }
  }

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setLocalTimeLabel(getLocalTimeLabel());
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  function scheduleToast(message) {
    setToast(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast('');
    }, 2200);
  }

  const showToastFromEffect = useEffectEvent((message) => {
    scheduleToast(message);
  });

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      if (callTimerRef.current) {
        window.clearInterval(callTimerRef.current);
      }
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
      }
      if (awayTimerRef.current) {
        window.clearTimeout(awayTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typingStatusRef.current.conversationId === activeConversationId) {
      return;
    }

    typingStatusRef.current = {
      conversationId: activeConversationId || null,
      isTyping: false,
    };
  }, [activeConversationId]);

  useEffect(() => {
    let ignore = false;

    async function loadBootstrap() {
      setIsLoading(true);
      try {
        const response = await api.get<BootstrapData>('/bootstrap');
        if (ignore) {
          return;
        }

        const data = response.data;
        setConversationItems(data.conversations || []);
        setMessagesByConversation(data.messagesByConversation || {});
        setTypingByConversation(data.typingByConversation || {});
        setCallsByConversation(data.callsByConversation || {});
        acknowledgeDeliveredMessages(data.messagesByConversation || {});
        didSkipInitialConversationRefreshRef.current = false;
        setHasLoadedBootstrap(true);
      } catch (error) {
        if (!ignore) {
          setHasLoadedBootstrap(false);
          showToastFromEffect(error instanceof Error ? error.message : 'Failed to load chats');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    if (authUser) {
      loadBootstrap();
    } else {
      setConversationItems([]);
      setMessagesByConversation({});
      setTypingByConversation({});
      setCallsByConversation({});
      setActiveConversationId('');
      setHasLoadedBootstrap(false);
      setMemberSearchQuery('');
      setMemberCandidates([]);
      setIsNewChatOpen(false);
      setIsSettingsOpen(false);
      setNewChatSearchQuery('');
      setNewChatUsers([]);
      setSelectedNewGroupUserIds([]);
      setGroupName('');
    }

    return () => {
      ignore = true;
    };
  }, [authUser]);

  useEffect(() => {
    if (!authUser || !hasLoadedBootstrap) {
      return;
    }

    const preferredConversationId =
      conversationItems.find((item) => item.id === routedConversationId)?.id ||
      conversationItems.find((item) => item.id === activeConversationId)?.id ||
      conversationItems[0]?.id ||
      '';

    if (preferredConversationId && preferredConversationId !== activeConversationId) {
      startTransition(() => {
        setActiveConversationId(preferredConversationId);
      });
    }

    if (preferredConversationId && preferredConversationId !== routedConversationId) {
      navigateToConversationEvent(preferredConversationId, { replace: !routedConversationId });
    }
  }, [
    activeConversationId,
    authUser,
    conversationItems,
    hasLoadedBootstrap,
    routedConversationId,
  ]);

  useEffect(() => {
    let ignore = false;

    async function loadConversations() {
      if (!authUser || !hasLoadedBootstrap) {
        return;
      }

      try {
        const params = new URLSearchParams();
        if (activeTab) {
          params.set('tab', activeTab);
        }
        if (deferredSearchQuery.trim()) {
          params.set('search', deferredSearchQuery.trim());
        }

        const response = await api.get<Conversation[]>(`/conversations?${params.toString()}`);
        if (!ignore) {
          setConversationItems(response.data);
          if (!response.data.find((item) => item.id === activeConversationId)) {
            setActiveConversationId(response.data[0]?.id || '');
          }
        }
      } catch (error) {
        if (!ignore) {
          showToastFromEffect(error instanceof Error ? error.message : 'Failed to refresh conversations');
        }
      }
    }

    if (!didSkipInitialConversationRefreshRef.current && activeTab === 'all' && !deferredSearchQuery.trim()) {
      didSkipInitialConversationRefreshRef.current = true;
      return;
    }

    loadConversations();

    return () => {
      ignore = true;
    };
  }, [activeTab, authUser, deferredSearchQuery, hasLoadedBootstrap]);

  useEffect(() => {
    if (!isNewChatOpen || !authUser) {
      setNewChatUsers([]);
      setIsNewChatLoading(false);
      return undefined;
    }

    let ignore = false;

    async function loadNewChatUsers() {
      setIsNewChatLoading(true);
      try {
        const params = new URLSearchParams();
        if (deferredNewChatSearchQuery.trim()) {
          params.set('search', deferredNewChatSearchQuery.trim());
        }

        const response = await api.get<User[]>(`/users${params.toString() ? `?${params.toString()}` : ''}`);
        if (!ignore) {
          setNewChatUsers(response.data);
        }
      } catch {
        if (!ignore) {
          setNewChatUsers([]);
        }
      } finally {
        if (!ignore) {
          setIsNewChatLoading(false);
        }
      }
    }

    loadNewChatUsers();

    return () => {
      ignore = true;
    };
  }, [authUser, deferredNewChatSearchQuery, isNewChatOpen]);

  useEffect(() => {
    if (activeConversation?.type !== 'group') {
      setMemberSearchQuery('');
      setMemberCandidates([]);
      setIsMemberSearchLoading(false);
      return undefined;
    }

    let ignore = false;

    async function loadMemberCandidates() {
      setIsMemberSearchLoading(true);
      try {
        const params = new URLSearchParams({
          conversationId: activeConversationId,
        });

        if (deferredMemberSearchQuery.trim()) {
          params.set('search', deferredMemberSearchQuery.trim());
        }

        const response = await api.get<User[]>(`/users?${params.toString()}`);
        if (!ignore) {
          setMemberCandidates(response.data);
        }
      } catch {
        if (!ignore) {
          setMemberCandidates([]);
        }
      } finally {
        if (!ignore) {
          setIsMemberSearchLoading(false);
        }
      }
    }

    if (authUser && activeConversationId) {
      loadMemberCandidates();
    }

    return () => {
      ignore = true;
    };
  }, [activeConversation?.type, activeConversationId, authUser, deferredMemberSearchQuery]);

  useEffect(() => {
    if (!authUser || !activeConversationId) {
      return;
    }

    let ignore = false;

    async function syncActiveConversation() {
      try {
        const [typingResponse, callResponse] = await Promise.all([
          api.get(`/conversations/${activeConversationId}/typing`),
          api.get(`/conversations/${activeConversationId}/call`),
        ]);

        if (ignore) {
          return;
        }

        setTypingByConversation((state) => ({
          ...state,
          [activeConversationId]: typingResponse.data,
        }));
        setCallsByConversation((state) => ({
          ...state,
          [activeConversationId]: callResponse.data,
        }));
      } catch (error) {
        if (!ignore) {
          showToastFromEffect(error.message || 'Failed to sync conversation');
        }
      }
    }

    syncActiveConversation();

    return () => {
      ignore = true;
    };
  }, [activeConversationId, authUser]);

  useEffect(() => {
    if (!authUser) {
      presenceStatusRef.current = 'online';
      setCurrentPresence('online');
      if (awayTimerRef.current) {
        window.clearTimeout(awayTimerRef.current);
      }
      return undefined;
    }

    function handleActivity() {
      pushPresence('online');
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        pushPresence('away', { restartAwayTimer: false });
        return;
      }

      handleActivity();
    }

    handleActivity();

    const activityEvents = ['pointerdown', 'mousemove', 'keydown', 'focus'];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity);
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (awayTimerRef.current) {
        window.clearTimeout(awayTimerRef.current);
      }
    };
  }, [authUser]);

  useEffect(() => {
    setIsTyping(
      Boolean(activeTypingState?.isTyping) &&
        Boolean(activeTypingState?.userId) &&
        activeTypingState.userId !== currentUser?.id,
    );
  }, [activeTypingState, currentUser?.id]);

  useEffect(() => {
    if (callTimerRef.current) {
      window.clearInterval(callTimerRef.current);
    }

    if (activeCall?.isActive && activeCall.startedAt) {
      const startedAt = new Date(activeCall.startedAt).getTime();
      setCallSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
      setIsCallActive(true);
      callTimerRef.current = window.setInterval(() => {
        setCallSeconds((value) => value + 1);
      }, 1000);
      return () => {
        if (callTimerRef.current) {
          window.clearInterval(callTimerRef.current);
        }
      };
    }

    setIsCallActive(false);
    setCallSeconds(0);
    return undefined;
  }, [activeCall]);

  function showToast(message) {
    scheduleToast(message);
  }

  function syncConversation(nextConversation) {
    setConversationItems((items) => syncConversationList(items, nextConversation));
  }

  function bumpConversation(nextConversation) {
    setConversationItems((items) => bumpConversationList(items, nextConversation));
  }

  function upsertMessage(conversationId, nextMessage) {
    setMessagesByConversation((state) => {
      const messages = state[conversationId] ?? [];
      const existingIndex = messages.findIndex((message) => message.id === nextMessage.id);

      if (existingIndex === -1) {
        return {
          ...state,
          [conversationId]: [...messages, nextMessage],
        };
      }

      const nextMessages = messages.slice();
      nextMessages[existingIndex] = nextMessage;

      return {
        ...state,
        [conversationId]: nextMessages,
      };
    });
  }

  function acknowledgeDeliveredMessages(messagesByConversationState: Record<string, any[]>) {
    if (!currentUser?.id) {
      return;
    }

    const deliveredMessageIds = new Set();

    Object.values(messagesByConversationState || {}).forEach((messages: any[]) => {
      (messages || []).forEach((message) => {
        if (
          message?.id &&
          message.senderUserId &&
          message.senderUserId !== currentUser.id &&
          message.status !== '✓✓'
        ) {
          deliveredMessageIds.add(message.id);
        }
      });
    });

    deliveredMessageIds.forEach((messageId) => {
      emitSocketEvent('message:received', {
        messageId,
      }).catch(() => {});
    });
  }

  useEffect(() => {
    if (!authUser) {
      disconnectSocket();
      return undefined;
    }

    function handleConversationUpsert(payload) {
      if (payload?.conversation) {
        syncConversation(payload.conversation);
      }
    }

    function handleMessageCreated(payload) {
      if (!payload?.conversationId || !payload?.message) {
        return;
      }

      upsertMessage(payload.conversationId, payload.message);

      if (
        currentUser?.id &&
        payload.message.senderUserId &&
        payload.message.senderUserId !== currentUser.id
      ) {
        emitSocketEvent('message:received', {
          messageId: payload.message.id,
        }).catch(() => {});
      }

      if (payload.conversation) {
        bumpConversation(payload.conversation);
      }
    }

    function handleMessageUpdated(payload) {
      if (!payload?.conversationId || !payload?.message) {
        return;
      }

      upsertMessage(payload.conversationId, payload.message);
    }

    function handleTypingUpdate(payload) {
      if (!payload?.conversationId) {
        return;
      }

      setTypingByConversation((state) => ({
        ...state,
        [payload.conversationId]: payload.typing,
      }));
    }

    function handleCallUpdate(payload) {
      if (!payload?.conversationId) {
        return;
      }

      setCallsByConversation((state) => ({
        ...state,
        [payload.conversationId]: payload.call,
      }));
    }

    function handleMessagesRead(payload) {
      if (!payload?.conversationId) {
        return;
      }

      if (payload.conversation) {
        syncConversation(payload.conversation);
      }

      if (!currentUser?.id || payload.readByUserId === currentUser.id) {
        return;
      }

      setMessagesByConversation((state) => {
        const messages = state[payload.conversationId] ?? [];
        let hasChanges = false;

        const nextMessages = messages.map((message) => {
          if (message.senderUserId === currentUser.id && message.status !== '✓✓') {
            hasChanges = true;
            return { ...message, status: '✓✓' };
          }

          return message;
        });

        if (!hasChanges) {
          return state;
        }

        return {
          ...state,
          [payload.conversationId]: nextMessages,
        };
      });
    }

    function handleSocketConnect() {
      didInitiateSocketDisconnectRef.current = false;
      console.info('[realtime] socket connected', {
        socketId: socket.id,
        transport: socket.io.engine?.transport?.name,
      });
    }

    function handleSocketReady(payload) {
      console.info('[realtime] socket ready', payload);
    }

    function handleSocketConnectError(error) {
      console.error('[realtime] socket connection failed', error);
      showToastFromEffect(
        error?.message === 'Authentication required'
          ? 'Realtime connection failed. Please sign in again.'
          : 'Realtime connection failed. Updates may be delayed.',
      );
    }

    function handleSocketDisconnect(reason) {
      console.warn('[realtime] socket disconnected', { reason });
      if (!didInitiateSocketDisconnectRef.current) {
        showToastFromEffect('Realtime connection lost. Reconnecting…');
      }
    }

    didInitiateSocketDisconnectRef.current = false;
    connectSocket();
    socket.on('connect', handleSocketConnect);
    socket.on('realtime:ready', handleSocketReady);
    socket.on('connect_error', handleSocketConnectError);
    socket.on('disconnect', handleSocketDisconnect);
    socket.on('conversation:upsert', handleConversationUpsert);
    socket.on('message:created', handleMessageCreated);
    socket.on('message:updated', handleMessageUpdated);
    socket.on('typing:update', handleTypingUpdate);
    socket.on('call:update', handleCallUpdate);
    socket.on('conversation:messagesRead', handleMessagesRead);

    return () => {
      didInitiateSocketDisconnectRef.current = true;
      socket.off('connect', handleSocketConnect);
      socket.off('realtime:ready', handleSocketReady);
      socket.off('connect_error', handleSocketConnectError);
      socket.off('disconnect', handleSocketDisconnect);
      socket.off('conversation:upsert', handleConversationUpsert);
      socket.off('message:created', handleMessageCreated);
      socket.off('message:updated', handleMessageUpdated);
      socket.off('typing:update', handleTypingUpdate);
      socket.off('call:update', handleCallUpdate);
      socket.off('conversation:messagesRead', handleMessagesRead);
      disconnectSocket();
    };
  }, [authUser, currentUser?.id]);

  async function openConversation(id) {
    startRouteTransition(() => {
      setActiveConversationId(id);
    });
    navigateToConversationEvent(id);
    setConversationItems((items) =>
      items.map((item) => (item.id === id ? { ...item, unread: 0 } : item)),
    );
    setReplyContext(null);
    setComposerValue('');
    setIsEmojiOpen(false);
    showToast(`Opened chat with ${conversationItems.find((item) => item.id === id)?.name ?? 'contact'}`);

    try {
      await api.post(`/conversations/${id}/read`, {});
    } catch {
      // Keep the UI responsive even if the read-sync call fails.
    }
  }

  function setTab(tab) {
    startTransition(() => {
      setActiveTab(tab);
    });
    showToast(`Showing ${tab} conversations`);
  }

  function toggleNewChat() {
    setIsSettingsOpen(false);
    setIsNewChatOpen((value) => !value);
    setNewChatSearchQuery('');
    setSelectedNewGroupUserIds([]);
    setGroupName('');
  }

  function toggleSettings() {
    setIsNewChatOpen(false);
    setIsSettingsOpen((value) => !value);
  }

  function setManualPresence(status) {
    pushPresence(status, { restartAwayTimer: status === 'online' });
    showToast(status === 'online' ? 'Presence set to online' : 'Presence set to away');
  }

  function resetSidebarState() {
    setSearchQuery('');
    startTransition(() => {
      setActiveTab('all');
    });
    setIsNewChatOpen(false);
    setIsSettingsOpen(false);
    showToast('Sidebar filters reset');
  }

  function toggleNewGroupMember(userId) {
    setSelectedNewGroupUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  function handleComposerChange(value) {
    setComposerValue(value);
    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
    }
    const nextIsTyping = Boolean(value.trim());

    if (
      activeConversationId &&
      (typingStatusRef.current.conversationId !== activeConversationId ||
        typingStatusRef.current.isTyping !== nextIsTyping)
    ) {
      typingStatusRef.current = {
        conversationId: activeConversationId,
        isTyping: nextIsTyping,
      };
      emitSocketEvent('typing:set', {
        conversationId: activeConversationId,
        isTyping: nextIsTyping,
      }).catch(() => {});
    }
    typingTimerRef.current = window.setTimeout(() => {
      setIsTyping(false);
      if (activeConversationId) {
        typingStatusRef.current = {
          conversationId: activeConversationId,
          isTyping: false,
        };
        emitSocketEvent('typing:set', {
          conversationId: activeConversationId,
          isTyping: false,
        }).catch(() => {});
      }
    }, 1200);
  }

  async function sendMessage() {
    const text = composerValue.trim();
    if (!text || !activeConversation) {
      return;
    }

    try {
      const response = await emitSocketEvent<any>('message:send', {
        conversationId: activeConversationId,
        kind: 'text',
        text,
        replyToMessageId: replyContext?.id || null,
      });
      const nextMessage = response.data;

      upsertMessage(activeConversationId, nextMessage);
      setConversationItems((items) =>
        items.map((item) =>
          item.id === activeConversationId ? { ...item, preview: text, time: formatNow() } : item,
        ),
      );
      setComposerValue('');
      setReplyContext(null);
      setIsEmojiOpen(false);

      typingStatusRef.current = {
        conversationId: activeConversationId,
        isTyping: false,
      };
      emitSocketEvent('typing:set', {
        conversationId: activeConversationId,
        isTyping: false,
      }).catch(() => {});
    } catch (error) {
      showToast(error.message || 'Failed to send message');
    }
  }

  function startReply(message) {
    setReplyContext({
      author: activeConversation?.name ?? 'Conversation',
      id: message.id,
      text: message.text || message.caption || message.fileName || 'Message',
    });
  }

  function closeReply() {
    setReplyContext(null);
  }

  function toggleEmoji() {
    setIsEmojiOpen((value) => !value);
  }

  function addEmoji(emoji) {
    setComposerValue((value) => `${value}${emoji}`);
    setIsEmojiOpen(false);
  }

  async function startCall() {
    if (!activeConversationId) {
      return;
    }

    try {
      const response = await api.post(`/conversations/${activeConversationId}/call/start`, {
        mode: 'voice',
      });
      setCallsByConversation((state) => ({
        ...state,
        [activeConversationId]: response.data,
      }));
      showToast(response.message);
    } catch (error) {
      showToast(error.message || 'Failed to start call');
    }
  }

  async function endCall() {
    if (!activeConversationId) {
      return;
    }

    try {
      const response = await api.post(`/conversations/${activeConversationId}/call/end`, {});
      setCallsByConversation((state) => ({
        ...state,
        [activeConversationId]: response.data,
      }));
      showToast(response.message);
    } catch (error) {
      showToast(error.message || 'Failed to end call');
    }
  }

  async function toggleMuted() {
    if (!activeConversationId) {
      return;
    }

    try {
      const response = await api.patch(`/conversations/${activeConversationId}/notifications`, {
        isMuted: !isMuted,
      });
      setConversationItems((items) =>
        items.map((item) => (item.id === activeConversationId ? response.data : item)),
      );
      showToast(response.message);
    } catch (error) {
      showToast(error.message || 'Failed to update notifications');
    }
  }

  async function addParticipant(userId) {
    if (!activeConversationId) {
      return;
    }

    try {
      const response = await api.post(`/conversations/${activeConversationId}/participants`, {
        userId,
      });

      setConversationItems((items) =>
        items.map((item) => (item.id === activeConversationId ? response.data : item)),
      );
      setMemberCandidates((users) =>
        users.map((user) => (user.id === userId ? { ...user, isMember: true } : user)),
      );
      showToast(response.message);
    } catch (error) {
      showToast(error.message || 'Failed to add user');
    }
  }

  async function createDirectConversation(userId) {
    try {
      setIsCreatingConversation(true);
      const response = await api.post<Conversation, { type: 'direct'; userId: string }>('/conversations', {
        type: 'direct',
        userId,
      });

      bumpConversation(response.data);
      startRouteTransition(() => {
        setActiveConversationId(response.data.id);
      });
      navigateToConversationEvent(response.data.id);
      setIsNewChatOpen(false);
      setNewChatSearchQuery('');
      showToast(response.message || 'Started chat');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to start chat');
    } finally {
      setIsCreatingConversation(false);
    }
  }

  async function createGroupConversation() {
    try {
      setIsCreatingConversation(true);
      const response = await api.post<
        Conversation,
        { type: 'group'; name: string; participantIds: string[] }
      >('/conversations', {
        type: 'group',
        name: groupName.trim(),
        participantIds: selectedNewGroupUserIds,
      });

      bumpConversation(response.data);
      startRouteTransition(() => {
        setActiveConversationId(response.data.id);
      });
      navigateToConversationEvent(response.data.id);
      setIsNewChatOpen(false);
      setNewChatSearchQuery('');
      setSelectedNewGroupUserIds([]);
      setGroupName('');
      showToast(response.message || 'Created group');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to create group');
    } finally {
      setIsCreatingConversation(false);
    }
  }

  return {
    addParticipant,
    activeConversation,
    activeMessages,
    activeTab,
    callSeconds,
    composerValue,
    conversationItems,
    currentPresence,
    currentUser,
    createDirectConversation,
    createGroupConversation,
    endCall,
    filteredConversations,
    groupName,
    isLoading,
    isCallActive,
    isCreatingConversation,
    isEmojiOpen,
    isMuted,
    isMemberSearchLoading,
    isNewChatLoading,
    isNewChatOpen,
    isSettingsOpen,
    isRouteTransitionPending,
    isTyping,
    localTimeLabel,
    memberCandidates,
    memberSearchQuery,
    newChatMode,
    newChatSearchQuery,
    newChatUsers,
    openConversation,
    replyContext,
    resetSidebarState,
    searchQuery,
    sendMessage,
    setComposerValue: handleComposerChange,
    setGroupName,
    setNewChatMode,
    setNewChatSearchQuery,
    setTab,
    setSearchQuery,
    selectedNewGroupUserIds,
    showToast,
    startCall,
    startReply,
    closeReply,
    toggleEmoji,
    addEmoji,
    setMemberSearchQuery,
    setManualPresence,
    toast,
    toggleNewChat,
    toggleSettings,
    toggleNewGroupMember,
    toggleMuted,
  };
}
