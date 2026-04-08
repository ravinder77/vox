import type { Conversation, Message, User } from '../types/app';

export const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: '1',
    email: 'user@example.com',
    name: 'Alex',
    username: 'alex',
    initials: 'A',
    role: 'Member',
    status: 'online',
    ...overrides,
});

export const createMockConversation = (
    overrides: Partial<Conversation> = {},
): Conversation => ({
    id: 'c1',
    type: 'direct',
    name: 'Room',
    initials: 'R',
    gradient: ['#000', '#fff'],
    status: 'online',
    preview: 'Hello',
    time: 'now',
    unread: 0,
    role: 'Member',
    email: 'room@example.com',
    location: '@room',
    isMuted: false,
    participants: [],
    participantCount: 1,
    ...overrides,
});

export const createMockMessage = (
    overrides: Partial<Message> = {},
): Message => ({
    id: 'm1',
    kind: 'text',
    sender: 'self',

    // ✅ MUST NOT be optional
    senderUserId: '1',
    senderName: 'Alex',
    senderInitials: 'A',

    text: 'Hello',
    caption: '',
    image: '',
    fileName: '',
    fileSize: '',

    time: '10:00',
    status: undefined,
    replyToMessageId: undefined,

    reactions: [],

    ...overrides,
});