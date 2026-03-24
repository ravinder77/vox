const emojis = ['😊', '🎉', '🔥', '👍', '❤️', '😂', '🚀', '✅', '📌', '💡', '🎨', '⚡', '👏', '🙌', '😍', '🤔'];

export default function EmojiPicker({ isOpen, onAdd }) {
  return (
    <div className={`emoji-picker ${isOpen ? 'show' : ''}`}>
      {emojis.map((emoji) => (
        <button key={emoji} type="button" className="emoji-btn" onClick={() => onAdd(emoji)}>
          {emoji}
        </button>
      ))}
    </div>
  );
}
