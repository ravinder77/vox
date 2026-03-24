import Avatar from '../UI/Avatar';
import Badge from '../UI/Badge';
import type { Conversation } from '../../types/app';
import { formatConversationListTime } from '../../utils/chat';

type GroupStackProps = {
  item: Conversation;
};

type ConversationItemProps = {
  key?: string;
  item: Conversation;
  isActive: boolean;
  onOpen: (conversationId: string) => void;
};

function GroupStack({ item }: GroupStackProps) {
  return (
    <div className="group-stack">
      {item.groupInitials.map((initial, index) => (
        <div
          key={initial}
          className={`g${index + 1}`}
          style={{
            background: `linear-gradient(135deg, ${item.groupGradients[index][0]}, ${item.groupGradients[index][1]})`,
          }}
        >
          {initial}
        </div>
      ))}
    </div>
  );
}

export default function ConversationItem({ item, isActive, onOpen }: ConversationItemProps) {
  return (
    <button type="button" className={`conv-item ${isActive ? 'active' : ''}`} onClick={() => onOpen(item.id)}>
      {item.type === 'group' ? (
        <GroupStack item={item} />
      ) : (
        <Avatar initials={item.initials} gradient={item.gradient} status={item.status} />
      )}
      <div className="conv-info">
        <div className="conv-name">{item.name}</div>
        <div className="conv-preview">{item.preview}</div>
      </div>
      <div className="conv-meta">
        <span className="conv-time">{formatConversationListTime(item.time)}</span>
        <Badge>{item.unread}</Badge>
      </div>
    </button>
  );
}
