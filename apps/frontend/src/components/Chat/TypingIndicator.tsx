export default function TypingIndicator({ activeConversation }) {
  return (
    <div className="typing-row">
      <div className="msg-avatar">{activeConversation.initials}</div>
      <div className="msg-bubble-wrap">
        <div className="msg-author">
          <span className="msg-author-name">{activeConversation.name}</span>
          <span className="msg-author-role">Typing…</span>
        </div>
        <div className="typing-bubble">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  );
}
