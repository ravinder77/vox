import MessageActions from './MessageActions';
import ReactionBar from './ReactionBar';
import type { Conversation, Message, User } from '../../types/app';

type MessageBubbleProps = {
  key?: string;
  activeConversation: Conversation;
  currentUser: User;
  message: Message;
  replyPreview: string;
  onReply: (message: Message) => void;
  onShowToast: (message: string) => void;
};

export default function MessageBubble({
  activeConversation,
  currentUser,
  message,
  replyPreview,
  onReply,
  onShowToast,
}: Readonly<MessageBubbleProps>) {
  const isOwn = message.senderUserId ? message.senderUserId === currentUser.id : message.sender === 'self';
  const avatarText = isOwn
    ? currentUser.initials
    : message.senderInitials || activeConversation.initials;
  const authorLabel = isOwn
    ? currentUser.name || 'You'
    : message.senderName || activeConversation.name;
  const roleLabel = isOwn ? 'You' : activeConversation.type === 'group' ? 'Member' : 'Contact';
  const previewText =
    message.text || message.caption || message.fileName || `${authorLabel}: shared a message`;

  return (
    <div className={`msg-row ${isOwn ? 'own' : ''}`}>
      <div className={`msg-avatar ${isOwn ? 'self' : ''}`}>{avatarText}</div>
      <div className="msg-bubble-wrap">
        <div className={`msg-author ${isOwn ? 'own' : ''}`}>
          <span className="msg-author-name">{authorLabel}</span>
          <span className="msg-author-role">{roleLabel}</span>
        </div>
        {message.kind === 'text' ? (
          <div className="msg-bubble">
            <MessageActions
              message={message}
              previewText={previewText.slice(0, 40)}
              onReply={onReply}
              onShowToast={onShowToast}
              isOwn={isOwn}
            />
            {replyPreview ? <div className="reply-chip">{replyPreview}</div> : null}
            {message.text}
          </div>
        ) : null}

        {message.kind === 'image' ? (
          <div className="msg-img">
            <img src={message.image} alt="Shared media" />
          </div>
        ) : null}

        {message.kind === 'file' ? (
          <div className="msg-file">
            <div className="file-icon">📄</div>
            <div className="file-info">
              <div className="file-name">{message.fileName}</div>
              <div className="file-size">{message.fileSize}</div>
            </div>
            <button type="button" className="icon-btn" onClick={() => onShowToast('Downloading file…')}>
              ⬇
            </button>
          </div>
        ) : null}

        <div className="msg-footer">
          <span className="msg-time">{message.time}</span>
          {isOwn && message.status ? <span className="msg-status">{message.status}</span> : null}
        </div>
        <ReactionBar reactions={message.reactions} />
      </div>
    </div>
  );
}
