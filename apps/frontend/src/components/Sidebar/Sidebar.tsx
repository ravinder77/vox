import SearchBar from './SearchBar';
import NavTabs from './NavTabs';
import ConversationList from './ConversationList';
import SidebarFooter from './SidebarFooter';
import IconButton from '../UI/IconButton';
import NewChatPanel from './NewChatPanel';
import SettingsPanel from './SettingsPanel';

export default function Sidebar({
  activeConversation,
  activeTab,
  currentPresence,
  currentUser,
  filteredConversations,
  groupName,
  isCreatingConversation,
  isNewChatLoading,
  isNewChatOpen,
  isSettingsOpen,
  newChatMode,
  newChatSearchQuery,
  newChatUsers,
  onLogout,
  resetSidebarState,
  createDirectConversation,
  createGroupConversation,
  openConversation,
  setManualPresence,
  setGroupName,
  setNewChatMode,
  setNewChatSearchQuery,
  searchQuery,
  selectedNewGroupUserIds,
  setSearchQuery,
  setTab,
  showToast,
  toggleNewChat,
  toggleSettings,
  toggleNewGroupMember,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="logo">
          <div className="logo-icon">💬</div>
          <span className="logo-text">Vox</span>
        </div>
        <div className="header-actions">
          <IconButton title="New chat" onClick={toggleNewChat}>
            ✏️
          </IconButton>
          <IconButton title="Settings" onClick={toggleSettings}>
            ⚙️
          </IconButton>
        </div>
      </div>
      <NewChatPanel
        groupName={groupName}
        isCreatingConversation={isCreatingConversation}
        isLoading={isNewChatLoading}
        isOpen={isNewChatOpen}
        mode={newChatMode}
        onCreateDirect={createDirectConversation}
        onCreateGroup={createGroupConversation}
        onGroupNameChange={setGroupName}
        onModeChange={setNewChatMode}
        onSearchChange={setNewChatSearchQuery}
        onToggleUser={toggleNewGroupMember}
        searchQuery={newChatSearchQuery}
        selectedUserIds={selectedNewGroupUserIds}
        users={newChatUsers}
      />
      <SettingsPanel
        currentPresence={currentPresence}
        currentUser={currentUser}
        isOpen={isSettingsOpen}
        onClose={toggleSettings}
        onLogout={onLogout}
        onResetSidebar={resetSidebarState}
        onSetPresence={setManualPresence}
      />
      <SearchBar value={searchQuery} onChange={setSearchQuery} />
      <NavTabs activeTab={activeTab} onTabChange={setTab} />
      <ConversationList
        items={filteredConversations}
        activeConversationId={activeConversation?.id}
        onOpen={openConversation}
      />
      <SidebarFooter
        currentPresence={currentPresence}
        currentUser={currentUser}
        onLogout={onLogout}
        onShowToast={showToast}
      />
    </aside>
  );
}
