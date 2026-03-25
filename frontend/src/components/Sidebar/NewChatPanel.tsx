export default function NewChatPanel({
  groupName,
  isCreatingConversation,
  isLoading,
  isOpen,
  mode,
  onCreateDirect,
  onCreateGroup,
  onGroupNameChange,
  onModeChange,
  onSearchChange,
  onToggleUser,
  searchQuery,
  selectedUserIds,
  users,
}) {
  if (!isOpen) {
    return null;
  }

  const selectedCount = selectedUserIds.length;

  return (
    <div className="new-chat-panel">
      <div className="new-chat-tabs">
        <button
          type="button"
          className={`new-chat-tab ${mode === 'direct' ? 'active' : ''}`}
          onClick={() => onModeChange('direct')}
        >
          Direct
        </button>
        <button
          type="button"
          className={`new-chat-tab ${mode === 'group' ? 'active' : ''}`}
          onClick={() => onModeChange('group')}
        >
          Group
        </button>
      </div>

      {mode === 'group' ? (
        <input
          type="text"
          className="new-chat-input"
          value={groupName}
          placeholder="Group name"
          onChange={(event) => onGroupNameChange(event.target.value)}
        />
      ) : null}

      <input
        type="text"
        className="new-chat-input"
        value={searchQuery}
        placeholder="Search users by name, @username or email"
        onChange={(event) => onSearchChange(event.target.value)}
      />

      <div className="new-chat-results">
        {isLoading ? <div className="new-chat-empty">Searching users…</div> : null}
        {!isLoading && !users.length ? <div className="new-chat-empty">No users found yet.</div> : null}
        {!isLoading
          ? users.map((user) => {
              const isSelected = selectedUserIds.includes(user.id);

              return (
                <div key={user.id} className={`new-chat-user ${isSelected ? 'selected' : ''}`}>
                  <button
                    type="button"
                    className="new-chat-user-main"
                    onClick={() =>
                      mode === 'direct' ? onCreateDirect(user.id) : onToggleUser(user.id)
                    }
                  >
                    <div className="new-chat-user-name">{user.name}</div>
                    <div className="new-chat-user-meta">
                      @{user.username} • {user.email}
                    </div>
                  </button>
                  {mode === 'group' ? (
                    <button
                      type="button"
                      className={`new-chat-select-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => onToggleUser(user.id)}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </button>
                  ) : null}
                </div>
              );
            })
          : null}
      </div>

      {mode === 'group' ? (
        <button
          type="button"
          className="new-chat-submit"
          disabled={isCreatingConversation || !groupName.trim() || selectedCount === 0}
          onClick={onCreateGroup}
        >
          {isCreatingConversation ? 'Creating…' : `Create group (${selectedCount})`}
        </button>
      ) : null}
    </div>
  );
}
