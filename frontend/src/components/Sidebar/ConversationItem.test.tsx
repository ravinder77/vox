import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

  it('renders group avatars and opens the selected conversation', () => {
    const onOpen = vi.fn();

    render(
      <ConversationItem
        item={{
          id: 'group-1',
          type: 'group',
          name: 'Product Team',
          initials: 'PT',
          groupInitials: ['A', 'B'],
          groupGradients: [['#111', '#222'], ['#333', '#444']],
          status: 'online',
          preview: 'Planning sync',
          time: 'Tue',
          unread: 0,
          role: 'Team',
          email: 'team@example.com',
          location: '@team',
          isMuted: false,
        }}
        isActive
        onOpen={onOpen}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /product team/i }));

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(onOpen).toHaveBeenCalledWith('group-1');
  });
});
