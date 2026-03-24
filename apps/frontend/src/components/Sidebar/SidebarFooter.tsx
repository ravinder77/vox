import IconButton from '../UI/IconButton';
import { getStatusClass, getStatusLabel } from '../../utils/chat';

export default function SidebarFooter({ currentUser, currentPresence, onLogout, onShowToast }) {
  return (
    <div className="sidebar-footer">
      <div className="user-avatar">
        {currentUser.initials}
        <span className={`status-dot ${getStatusClass(currentPresence)}`} />
      </div>
      <div className="user-info">
        <div className="user-name">{currentUser.name}</div>
        <div className="user-status">{getStatusLabel(currentPresence)}</div>
      </div>
      <IconButton title="Profile" onClick={() => onShowToast('Profile settings')}>
        👤
      </IconButton>
      <IconButton title="Sign out" onClick={onLogout}>
        ↩
      </IconButton>
    </div>
  );
}
