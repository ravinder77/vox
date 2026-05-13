export default function Badge({ children }) {
  if (!children) {
    return null;
  }

  return <span className="unread-badge">{children}</span>;
}
