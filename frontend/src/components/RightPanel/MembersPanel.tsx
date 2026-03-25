import Avatar from '../UI/Avatar';

export default function MembersPanel({
  conversation,
  isLoading,
  memberCandidates,
  memberSearchQuery,
  onAddParticipant,
  onMemberSearchChange,
}) {
  const participants = conversation.participants || [];
  const isGroupChat = conversation.type === 'group';

  return (
    <div className="info-section">
      <div className="section-label info-title">Members</div>
      <div className="member-summary">
        <span>{conversation.participantCount || participants.length} people in this chat</span>
        <span className="member-summary-tag">{isGroupChat ? 'Group chat' : 'Direct chat'}</span>
      </div>

      <div className="member-list">
        {participants.map((participant) => (
          <div key={participant.id} className="member-row">
            <Avatar
              initials={participant.initials}
              gradient={conversation.gradient ?? ['#4fc3f7', '#6c63ff']}
              status={participant.status}
              showStatus={false}
            />
            <div className="member-copy">
              <div className="member-name">{participant.name}</div>
              <div className="member-meta">
                @{participant.username} • {participant.role}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isGroupChat ? (
        <div className="member-picker">
          <input
            type="text"
            value={memberSearchQuery}
            placeholder="Search users by name, @username or email"
            onChange={(event) => onMemberSearchChange(event.target.value)}
          />
          <div className="member-candidate-list">
            {isLoading ? <div className="member-empty">Searching users…</div> : null}
            {!isLoading && !memberCandidates.length ? (
              <div className="member-empty">No users found. Create another account to invite more people.</div>
            ) : null}
            {!isLoading
              ? memberCandidates.map((user) => (
                  <div key={user.id} className="member-candidate">
                    <div className="member-copy">
                      <div className="member-name">{user.name}</div>
                      <div className="member-meta">
                        @{user.username} • {user.email}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="member-add-btn"
                      disabled={user.isMember}
                      onClick={() => onAddParticipant(user.id)}
                    >
                      {user.isMember ? 'Added' : 'Add'}
                    </button>
                  </div>
                ))
              : null}
          </div>
        </div>
      ) : (
        <div className="member-empty">Add people from any group chat. Direct chats only support two participants.</div>
      )}
    </div>
  );
}
