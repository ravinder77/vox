import IconButton from '../UI/IconButton';

export default function ProfileCard({ conversation, onShowToast }) {
  const isDirectConversation = conversation.type === 'direct';
  const profileSubtitle =
    conversation.type === 'group'
      ? `${conversation.participantCount || conversation.participants?.length || 0} participants`
      : conversation.role;

  return (
    <div className="profile-card">
      <div
        className="profile-avatar"
        style={{ background: `linear-gradient(135deg, ${(conversation.gradient ?? ['#4fc3f7', '#6c63ff'])[0]}, ${(conversation.gradient ?? ['#4fc3f7', '#6c63ff'])[1]})` }}
      >
        {conversation.initials}
        {isDirectConversation ? <span className={`status-dot ${conversation.status}`} /> : null}
      </div>
      <div className="profile-name">{conversation.name}</div>
      <div className="profile-role">{profileSubtitle}</div>
      <div className="profile-actions">
        <button type="button" className="profile-btn" onClick={() => onShowToast('Voice call')}>
          📞 Call
        </button>
        <button type="button" className="profile-btn" onClick={() => onShowToast('Video call')}>
          📹 Video
        </button>
        <button type="button" className="profile-btn" onClick={() => onShowToast('Scroll down to manage members')}>
          👥 Members
        </button>
      </div>
    </div>
  );
}
