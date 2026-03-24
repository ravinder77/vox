import { getStatusClass } from '../../utils/chat';

export default function Avatar({
  initials,
  gradient,
  status,
  size = 'md',
  showStatus = true,
  className = '',
}) {
  return (
    <div className={`avatar avatar-${size} ${className}`}>
      <div
        className="avatar-fallback"
        style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
      >
        {initials}
      </div>
      {showStatus ? <span className={`status-dot ${getStatusClass(status)}`} /> : null}
    </div>
  );
}
