import { getStatusLabel } from '../../utils/chat';
import { useEffect } from 'react';

export default function SettingsPanel({
  currentPresence,
  currentUser,
  isOpen,
  onClose,
  onLogout,
  onResetSidebar,
  onSetPresence,
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="settings-modal-backdrop" onClick={onClose}>
      <div className="settings-modal" onClick={(event) => event.stopPropagation()}>
        <div className="settings-panel-header">
          <div>
            <div className="settings-panel-title">Settings</div>
            <div className="settings-panel-subtitle">Manage your session and sidebar preferences</div>
          </div>
          <button type="button" className="settings-close-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="settings-card">
          <div className="settings-label">Signed in as</div>
          <div className="settings-user-name">{currentUser.name}</div>
          <div className="settings-user-meta">
            @{currentUser.username} • {currentUser.email}
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-label">Presence</div>
          <div className="settings-presence-status">Current status: {getStatusLabel(currentPresence)}</div>
          <div className="settings-presence-actions">
            <button
              type="button"
              className={`settings-action-btn ${currentPresence === 'online' ? 'active' : ''}`}
              onClick={() => onSetPresence('online')}
            >
              Appear online
            </button>
            <button
              type="button"
              className={`settings-action-btn ${currentPresence === 'away' ? 'active' : ''}`}
              onClick={() => onSetPresence('away')}
            >
              Set away
            </button>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-label">Sidebar</div>
          <button type="button" className="settings-wide-btn" onClick={onResetSidebar}>
            Reset filters and close panels
          </button>
        </div>

        <div className="settings-card danger">
          <div className="settings-label">Session</div>
          <button type="button" className="settings-wide-btn danger" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
