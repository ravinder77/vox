import Toggle from '../UI/Toggle';

export default function NotificationToggle({ isMuted, onToggleMuted }) {
  return (
    <div className="info-section">
      <div className="panel-row">
        <div className="section-label info-title">Notifications</div>
        <button type="button" className="plain-icon-btn" onClick={onToggleMuted}>
          {isMuted ? '🔕' : '🔔'}
        </button>
      </div>
      <div className="panel-row">
        <span className="notification-copy">Mute this conversation</span>
        <Toggle checked={isMuted} onClick={onToggleMuted} />
      </div>
    </div>
  );
}
