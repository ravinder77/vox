export default function MessageActions({ message, previewText, onReply, onShowToast, isOwn }) {
  return (
    <div className="msg-actions">
      <button type="button" className="msg-action-btn" onClick={() => onReply(message)}>
        ↩ Reply
      </button>
      <button type="button" className="msg-action-btn" onClick={() => onShowToast(`React to: ${previewText}`)}>
        😊
      </button>
      {!isOwn ? (
        <button type="button" className="msg-action-btn" onClick={() => onShowToast('Copied')}>
          📋
        </button>
      ) : null}
    </div>
  );
}
