import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MessageList from './MessageList';

const currentUser = {
  id: '1',
  email: 'alex@example.com',
  name: 'Alex Rivera',
  username: 'alex_r',
  initials: 'AR',
  role: 'Product Lead',
  status: 'online' as const,
};

const activeConversation = {
  id: 'conv-1',
  type: 'direct' as const,
  name: 'Aria Chen',
  initials: 'AC',
  gradient: ['#4fc3f7', '#6c63ff'],
  status: 'online' as const,
  preview: 'Latest message',
  time: 'now',
  unread: 0,
  role: 'Designer',
  email: 'aria@example.com',
  location: '@aria',
  isMuted: false,
};

describe('MessageList', () => {
  it('renders message replies using the original message preview', () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    render(
      <MessageList
        activeConversation={activeConversation}
        currentUser={currentUser}
        messages={[
          {
            id: 'm1',
            kind: 'text',
            sender: 'other',
            senderUserId: '2',
            senderName: 'Aria',
            senderInitials: 'AC',
            text: 'Original note',
            caption: '',
            image: '',
            fileName: '',
            fileSize: '',
            time: '10:00',
            reactions: [],
          },
          {
            id: 'm2',
            kind: 'text',
            sender: 'self',
            senderUserId: '1',
            senderName: 'Alex Rivera',
            senderInitials: 'AR',
            text: 'Replying now',
            caption: '',
            image: '',
            fileName: '',
            fileSize: '',
            time: '10:01',
            replyToMessageId: 'm1',
            reactions: [],
          },
        ]}
        isTyping={false}
        onReply={vi.fn()}
        onShowToast={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Original note')).toHaveLength(2);
    expect(screen.getByText('Replying now')).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it('shows typing indicator only when isTyping is true', () => {
    const { rerender } = render(
      <MessageList
        activeConversation={activeConversation}
        currentUser={currentUser}
        messages={[]}
        isTyping={false}
        onReply={vi.fn()}
        onShowToast={vi.fn()}
      />,
    );

    expect(screen.queryByText('Typing…')).not.toBeInTheDocument();

    rerender(
      <MessageList
        activeConversation={activeConversation}
        currentUser={currentUser}
        messages={[]}
        isTyping
        onReply={vi.fn()}
        onShowToast={vi.fn()}
      />,
    );

    expect(screen.getByText('Typing…')).toBeInTheDocument();
  });
});
