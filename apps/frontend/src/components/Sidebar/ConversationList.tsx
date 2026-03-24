import ConversationItem from './ConversationItem';
import type { Conversation } from '../../types/app';

type ConversationListProps = {
  key?: string;
  items: Conversation[];
  activeConversationId?: string;
  onOpen: (conversationId: string) => void;
};

export default function ConversationList({ items, activeConversationId, onOpen }: ConversationListProps) {
  const recent = items.slice(0, 6);
  const older = items.slice(6);

  return (
    <div className="conv-list">
      <div className="section-label">Recent</div>
      {recent.map((item) => (
        <ConversationItem
          key={item.id}
          item={item}
          isActive={item.id === activeConversationId}
          onOpen={onOpen}
        />
      ))}
      {older.length ? <div className="section-label">Older</div> : null}
      {older.map((item) => (
        <ConversationItem
          key={item.id}
          item={item}
          isActive={item.id === activeConversationId}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
