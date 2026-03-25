export default function ReactionBar({ reactions = [] }) {
  if (!reactions.length) {
    return null;
  }

  return (
    <div className="reactions">
      {reactions.map((reaction) => (
        <div key={reaction.emoji} className="reaction-pill">
          {reaction.emoji} <span>{reaction.count}</span>
        </div>
      ))}
    </div>
  );
}
