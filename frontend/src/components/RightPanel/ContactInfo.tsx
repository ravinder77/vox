export default function ContactInfo({ conversation, localTimeLabel }) {
  return (
    <div className="info-section">
      <div className="section-label info-title">Info</div>
      <div className="info-row">
        <div className="info-icon">📧</div>
        <div>
          <div className="info-label">Email</div>
          <div className="info-value">{conversation.email}</div>
        </div>
      </div>
      <div className="info-row">
        <div className="info-icon">📍</div>
        <div>
          <div className="info-label">Location</div>
          <div className="info-value">{conversation.location}</div>
        </div>
      </div>
      <div className="info-row">
        <div className="info-icon">🕐</div>
        <div>
          <div className="info-label">Local time</div>
          <div className="info-value">{localTimeLabel}</div>
        </div>
      </div>
      <div className="info-row">
        <div className="info-icon">{conversation.type === 'group' ? '👥' : '💬'}</div>
        <div>
          <div className="info-label">Chat type</div>
          <div className="info-value">{conversation.type === 'group' ? 'Group conversation' : 'Direct conversation'}</div>
        </div>
      </div>
    </div>
  );
}
