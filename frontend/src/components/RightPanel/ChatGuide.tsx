export default function ChatGuide({ conversation }) {
  return (
    <div className="info-section">
      <div className="section-label info-title">How To Chat</div>
      <div className="guide-list">
        <div className="guide-step">
          <span className="guide-index">1</span>
          <div>
            <div className="guide-title">Open a conversation</div>
            <div className="guide-copy">Pick any chat from the left sidebar to load its messages.</div>
          </div>
        </div>
        <div className="guide-step">
          <span className="guide-index">2</span>
          <div>
            <div className="guide-title">Write and send</div>
            <div className="guide-copy">Type in the composer and press Enter or use the send button.</div>
          </div>
        </div>
        <div className="guide-step">
          <span className="guide-index">3</span>
          <div>
            <div className="guide-title">Reply, react, and call</div>
            <div className="guide-copy">Hover messages to reply, add emoji reactions, or start a call from the header.</div>
          </div>
        </div>
        <div className="guide-step">
          <span className="guide-index">4</span>
          <div>
            <div className="guide-title">Add users when needed</div>
            <div className="guide-copy">
              {conversation.type === 'group'
                ? 'Use the member search above to add more people into this group chat.'
                : 'Open one of the existing group chats to invite more users.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
