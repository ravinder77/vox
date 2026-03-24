import {
  mapConversation,
  mapConversationForUser,
  mapMessage,
  mapTypingState,
} from '../src/utils/chatMapper.js';

describe('chatMapper', () => {
  it('uses the other participant in direct chats', () => {
  const conversation = {
    id: 'conv-1',
    type: 'direct',
    name: 'Fallback Name',
    initials: 'FN',
    gradient: null,
    groupInitials: null,
    groupGradients: null,
    status: 'offline',
    preview: 'Hello',
    time: '9:15 AM',
    unread: 2,
    role: 'Unknown',
    email: 'fallback@example.com',
    location: 'Fallback',
    isMuted: false,
    mediaItems: [{ position: 2, url: '/b.png' }, { position: 1, url: '/a.png' }],
    participants: [
      {
        user: {
          id: 'user-self',
          email: 'self@example.com',
          name: 'Self User',
          username: 'self',
          initials: 'SU',
          role: 'Engineer',
          status: 'online',
        },
      },
      {
        user: {
          id: 'user-other',
          email: 'other@example.com',
          name: 'Other User',
          username: 'other',
          initials: 'OU',
          role: 'Designer',
          status: 'away',
        },
      },
    ],
  };

  const mapped = mapConversationForUser(conversation, 'user-self');

  expect(mapped.name).toBe('Other User');
  expect(mapped.initials).toBe('OU');
  expect(mapped.status).toBe('away');
  expect(mapped.role).toBe('Designer');
  expect(mapped.email).toBe('other@example.com');
  expect(mapped.location).toBe('@other');
  expect(mapped.media).toEqual(['/a.png', '/b.png']);
  expect(mapped.participantCount).toBe(2);
  expect(mapped.gradient).toEqual(['#4fc3f7', '#6c63ff']);
  });

  it('preserves sorted media and participant count', () => {
  const mapped = mapConversation({
    id: 'conv-2',
    type: 'group',
    name: 'Team',
    initials: 'TM',
    gradient: ['#111111', '#222222'],
    groupInitials: ['T', 'M'],
    groupGradients: [['#111111', '#222222']],
    status: 'online',
    preview: 'Last update',
    time: '10:00 AM',
    unread: 0,
    role: null,
    email: null,
    location: null,
    isMuted: true,
    mediaItems: [{ position: 3, url: '/c.png' }, { position: 1, url: '/a.png' }],
    participants: [
      { user: { id: '1', email: 'a@example.com', name: 'A', username: 'a', initials: 'A', role: null, status: 'online' } },
      { user: { id: '2', email: 'b@example.com', name: 'B', username: 'b', initials: 'B', role: null, status: 'offline' } },
    ],
  });

  expect(mapped.media).toEqual(['/a.png', '/c.png']);
  expect(mapped.participantCount).toBe(2);
  expect(mapped.isMuted).toBe(true);
  });

  it('derives sender relative to the current user', () => {
  const selfMessage = mapMessage(
    {
      id: 'msg-1',
      kind: 'text',
      senderUserId: 'user-1',
      senderName: 'Self User',
      senderInitials: 'SU',
      text: 'Hello',
      time: '1:00 PM',
      status: '✓',
      replyTo: null,
      reactions: [{ emoji: '👍', count: 2 }],
    },
    { id: 'user-1', name: 'Self User' },
  );

  const otherMessage = mapMessage(
    {
      id: 'msg-2',
      kind: 'text',
      senderUserId: 'user-2',
      senderName: 'Other User',
      senderInitials: 'OU',
      text: 'Hi',
      time: '1:01 PM',
      status: '✓✓',
      replyTo: 'msg-1',
      reactions: [],
    },
    'user-1',
  );

  expect(selfMessage.sender).toBe('self');
  expect(otherMessage.sender).toBe('other');
  expect(otherMessage.replyToMessageId).toBe('msg-1');
  });

  it('normalizes optional values in typing state', () => {
  const timestamp = new Date('2026-03-24T06:30:00.000Z');
  const mapped = mapTypingState({
    isTyping: 1,
    userId: 'user-2',
    name: 'Other User',
    updatedAt: timestamp,
  });

  expect(mapped).toEqual({
    isTyping: true,
    userId: 'user-2',
    name: 'Other User',
    updatedAt: '2026-03-24T06:30:00.000Z',
  });
  });
});
