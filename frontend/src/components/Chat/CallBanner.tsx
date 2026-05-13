export default function CallBanner({ activeConversation, callSeconds, isVisible, onEndCall }) {
  if (!isVisible) {
    return null;
  }

  const minutes = Math.floor(callSeconds / 60);
  const seconds = `${callSeconds % 60}`.padStart(2, '0');

  return (
    <div className="call-banner">
      <span>📞</span>
      <span>{activeConversation?.name}</span>
      <span className="call-timer">
        {minutes}:{seconds}
      </span>
      <button type="button" className="end-call-btn" onClick={onEndCall}>
        End Call
      </button>
    </div>
  );
}
