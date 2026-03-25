import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ConversationItem from './ConversationItem';

describe('ConversationItem', () => {
  it('renders now for a recent chat time', () => {
    render(
      <ConversationItem
        item={{
          id: 'conv-1',
          type: 'direct',
          name: 'Aria Chen',
          initials: 'AC',
          gradient: ['#4fc3f7', '#6c63ff'],
          status: 'online',
          preview: 'Latest message',
          time: 'now',
          unread: 1,
          role: 'Designer',
          email: 'aria@example.com',
          location: '@aria',
          isMuted: false,
        }}
        isActive={false}
        onOpen={() => {}}
      />,
    );

    expect(screen.getByText('now')).toBeInTheDocument();
  });
});
