import Avatar from '../UI/Avatar';
import IconButton from '../UI/IconButton';
import { getStatusClass, getStatusLabel } from '../../utils/chat';

export default function ChatHeader({ activeConversation, onShowToast, onStartCall }) {
  const isDirectConversation = activeConversation.type === 'direct';

  return (
    <div className="chat-header">
      <Avatar
        initials={activeConversation.initials}
        gradient={activeConversation.gradient ?? ['#4fc3f7', '#6c63ff']}
        status={activeConversation.status}
        showStatus={isDirectConversation}
        size="lg"
      />
      <div className="header-info">
        <div className="header-name">{activeConversation.name}</div>
        <div className={`header-sub ${isDirectConversation ? getStatusClass(activeConversation.status) : ''}`.trim()}>
          {isDirectConversation
            ? getStatusLabel(activeConversation.status)
            : `${activeConversation.participantCount || activeConversation.participants?.length || 0} participants`}
        </div>
      </div>
      <div className="header-actions">
        <IconButton title="Voice call" onClick={onStartCall}>
          📞
        </IconButton>
        <IconButton title="Video call" onClick={() => onShowToast('Starting video call…')}>
          📹
        </IconButton>
        <IconButton title="Search" onClick={() => onShowToast('Search in conversation')}>
          🔍
        </IconButton>
        <IconButton title="Pin" onClick={() => onShowToast('Pinned messages')}>
          📌
        </IconButton>
        <IconButton title="More" onClick={() => onShowToast('More options')}>
          ⋯
        </IconButton>
      </div>
    </div>
  );
}
