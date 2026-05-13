import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RightPanel from './RightPanel';
import { createMockConversation, createMockUser } from '../../test/factory';

const groupConversation = createMockConversation({
  type: 'group',
  name: 'Product Team',
  media: ['/1.png', '/2.png'],
  participantCount: 2,
  participants: [
    createMockUser({ id: '1', name: 'Alex', username: 'alex' }),
    createMockUser({ id: '2', name: 'Sam', username: 'sam', initials: 'S' }),
  ],
});

describe('RightPanel', () => {
  it('renders panel sections and interactions for a group conversation', () => {
    const onShowToast = vi.fn();
    const onAddParticipant = vi.fn();
    const onMemberSearchChange = vi.fn();
    const onToggleMuted = vi.fn();

    render(
      <RightPanel
        activeConversation={groupConversation}
        isMemberSearchLoading={false}
        isMuted={false}
        localTimeLabel="09:30 AM PST"
        memberCandidates={[
          { id: '3', name: 'Jordan', username: 'jordan', email: 'jordan@example.com', isMember: false },
          { id: '4', name: 'Alex', username: 'alex', email: 'alex@example.com', isMember: true },
        ]}
        memberSearchQuery=""
        onAddParticipant={onAddParticipant}
        onShowToast={onShowToast}
        onMemberSearchChange={onMemberSearchChange}
        onToggleMuted={onToggleMuted}
      />,
    );

    expect(screen.getByText('Contact Info')).toBeInTheDocument();
    expect(screen.getByText('Product Team')).toBeInTheDocument();
    expect(screen.getByText('09:30 AM PST')).toBeInTheDocument();
    expect(screen.getByText('Group conversation')).toBeInTheDocument();
    expect(screen.getByText(/2 people in this chat/i)).toBeInTheDocument();
    expect(screen.getAllByAltText('Shared item')).toHaveLength(2);

    fireEvent.click(screen.getByTitle('Edit contact'));
    fireEvent.click(screen.getByRole('button', { name: /📞 call/i }));
    fireEvent.click(screen.getByRole('button', { name: /📹 video/i }));
    fireEvent.click(screen.getByRole('button', { name: /👥 members/i }));
    fireEvent.change(screen.getByPlaceholderText(/search users by name/i), {
      target: { value: 'jor' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: /\+12/i }));
    fireEvent.click(screen.getByRole('button', { name: '🔔' }));
    fireEvent.click(screen.getByRole('button', { pressed: false }));

    expect(onShowToast).toHaveBeenCalledWith('Edit contact');
    expect(onShowToast).toHaveBeenCalledWith('Voice call');
    expect(onShowToast).toHaveBeenCalledWith('Video call');
    expect(onShowToast).toHaveBeenCalledWith('Scroll down to manage members');
    expect(onShowToast).toHaveBeenCalledWith('View all media');
    expect(onMemberSearchChange).toHaveBeenCalledWith('jor');
    expect(onAddParticipant).toHaveBeenCalledWith('3');
    expect(onToggleMuted).toHaveBeenCalledTimes(2);
  });

  it('shows direct-chat specific helper content and empty states', () => {
    render(
      <RightPanel
        activeConversation={createMockConversation({
          type: 'direct',
          media: [],
          participants: [createMockUser()],
          participantCount: 1,
        })}
        isMemberSearchLoading={false}
        isMuted
        localTimeLabel="10:15 AM PST"
        memberCandidates={[]}
        memberSearchQuery=""
        onAddParticipant={vi.fn()}
        onShowToast={vi.fn()}
        onMemberSearchChange={vi.fn()}
        onToggleMuted={vi.fn()}
      />,
    );

    expect(screen.getByText('Direct conversation')).toBeInTheDocument();
    expect(screen.getByText(/open one of the existing group chats/i)).toBeInTheDocument();
    expect(screen.getByText(/no shared media yet/i)).toBeInTheDocument();
  });

  it('shows loading and empty member-search states for groups', () => {
    const { rerender } = render(
      <RightPanel
        activeConversation={groupConversation}
        isMemberSearchLoading
        isMuted={false}
        localTimeLabel="09:30 AM PST"
        memberCandidates={[]}
        memberSearchQuery=""
        onAddParticipant={vi.fn()}
        onShowToast={vi.fn()}
        onMemberSearchChange={vi.fn()}
        onToggleMuted={vi.fn()}
      />,
    );

    expect(screen.getByText(/searching users/i)).toBeInTheDocument();

    rerender(
      <RightPanel
        activeConversation={groupConversation}
        isMemberSearchLoading={false}
        isMuted={false}
        localTimeLabel="09:30 AM PST"
        memberCandidates={[]}
        memberSearchQuery=""
        onAddParticipant={vi.fn()}
        onShowToast={vi.fn()}
        onMemberSearchChange={vi.fn()}
        onToggleMuted={vi.fn()}
      />,
    );

    expect(screen.getByText(/no users found/i)).toBeInTheDocument();
  });
});
