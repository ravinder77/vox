import IconButton from '../UI/IconButton';

export default function ReplyBanner({ replyContext, onClose }) {
  return (
    <div className={`reply-banner ${replyContext ? 'show' : ''}`}>
      <div className="reply-line" />
      <div className="reply-content">
        <div className="reply-to">Replying to {replyContext?.author ?? ''}</div>
        <div className="reply-text">{replyContext?.text ?? ''}</div>
      </div>
      <IconButton title="Close reply" className="reply-close-btn" onClick={onClose}>
        ✕
      </IconButton>
    </div>
  );
}
