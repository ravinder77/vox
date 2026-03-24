import { describe, expect, it } from 'vitest';
import { bumpConversationList, syncConversationList } from './conversations';

const baseConversations = [
  {
    id: 'conv-1',
    type: 'direct' as const,
    name: 'Aria',
    initials: 'AC',
    gradient: ['#1', '#2'],
    status: 'online' as const,
    preview: 'hello',
    time: '9:00 AM',
    unread: 0,
    role: 'Designer',
    email: 'aria@example.com',
    location: '@aria',
    isMuted: false,
  },
  {
    id: 'conv-2',
    type: 'direct' as const,
    name: 'Kenji',
    initials: 'KP',
    gradient: ['#1', '#2'],
    status: 'online' as const,
    preview: 'hey',
    time: '8:45 AM',
    unread: 0,
    role: 'Engineer',
    email: 'kenji@example.com',
    location: '@kenji',
    isMuted: false,
  },
];

describe('conversation list ordering helpers', () => {
  it('syncConversationList preserves position for existing conversations', () => {
    const result = syncConversationList(baseConversations, {
      ...baseConversations[1],
      preview: 'updated without reordering',
    });

    expect(result.map((item) => item.id)).toEqual(['conv-1', 'conv-2']);
    expect(result[1].preview).toBe('updated without reordering');
  });

  it('bumpConversationList moves active conversations to the top', () => {
    const result = bumpConversationList(baseConversations, {
      ...baseConversations[1],
      preview: 'latest message',
    });

    expect(result.map((item) => item.id)).toEqual(['conv-2', 'conv-1']);
  });
});
