export type PresenceStatus = 'online' | 'away' | 'offline';

export type AuthMode = 'login' | 'signup' | 'forgot' | 'forgotOk';

export type User = {
  id: string;
  email: string;
  name: string;
  username: string;
  initials: string;
  role: string;
  status: PresenceStatus;
  isMember?: boolean;
};

export type Reaction = {
  emoji: string;
  count: number;
};

export type Message = {
  id: string;
  kind: 'text' | 'image' | 'file';
  sender: 'self' | 'other';
  senderUserId: string | null;
  senderName: string | null;
  senderInitials: string | null;
  text?: string | null;
  image?: string | null;
  caption?: string | null;
  fileName?: string | null;
  fileSize?: string | null;
  time: string;
  status?: string | null;
  replyToMessageId?: string | null;
  reactions: Reaction[];
};

export type Conversation = {
  id: string;
  type: 'direct' | 'group';
  name: string;
  initials: string;
  gradient?: string[];
  groupInitials?: string[];
  groupGradients?: string[][];
  status: PresenceStatus;
  preview: string;
  time: string;
  unread: number;
  role: string;
  email: string;
  location: string;
  media?: string[];
  isMuted: boolean;
  participants?: User[];
  participantCount?: number;
};

export type TypingState = {
  isTyping: boolean;
  userId: string | null;
  name: string | null;
  updatedAt: string | null;
};

export type CallState = {
  isActive: boolean;
  startedAt: string | null;
  endedAt: string | null;
  startedBy: string | null;
  mode: 'voice' | 'video' | null;
};

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
  meta?: Record<string, unknown>;
};

export type BootstrapData = {
  currentUser: User | null;
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
  typingByConversation: Record<string, TypingState>;
  callsByConversation: Record<string, CallState>;
};

export type ActionErrors = Record<string, string>;

export type ActionResult = {
  errors: ActionErrors;
};
