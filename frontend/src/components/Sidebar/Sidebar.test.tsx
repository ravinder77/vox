import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';

const currentUser = {
  id: '1',
  email: 'alex@example.com',
  name: 'Alex Rivera',
  username: 'alex_r',
  initials: 'AR',
  role: 'Product Lead',
  status: 'online' as const,
};

const conversations = [
  {
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
  },
];

describe('Sidebar', () => {
  it('invokes the settings toggle when the settings button is clicked', () => {
    const toggleSettings = vi.fn();

    render(
      <Sidebar
        activeConversation={conversations[0]}
        activeTab="all"
        currentPresence="online"
        currentUser={currentUser}
        filteredConversations={conversations}
        groupName=""
        isCreatingConversation={false}
        isNewChatLoading={false}
        isNewChatOpen={false}
        isSettingsOpen={false}
        newChatMode="direct"
        newChatSearchQuery=""
        newChatUsers={[]}
        onLogout={vi.fn()}
        resetSidebarState={vi.fn()}
        createDirectConversation={vi.fn()}
        createGroupConversation={vi.fn()}
        openConversation={vi.fn()}
        setManualPresence={vi.fn()}
        setGroupName={vi.fn()}
        setNewChatMode={vi.fn()}
        setNewChatSearchQuery={vi.fn()}
        searchQuery=""
        selectedNewGroupUserIds={[]}
        setSearchQuery={vi.fn()}
        setTab={vi.fn()}
        showToast={vi.fn()}
        toggleNewChat={vi.fn()}
        toggleSettings={toggleSettings}
        toggleNewGroupMember={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTitle('Settings'));

    expect(toggleSettings).toHaveBeenCalledTimes(1);
  });
});
