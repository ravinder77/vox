import { useEffect, useRef } from 'react';
import DateDivider from './DateDivider';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import type { Conversation, Message, User } from '../../types/app';

type MessageListProps = {
  key?: string;
  activeConversation: Conversation;
  currentUser: User;
  messages: Message[];
  isTyping: boolean;
  onReply: (message: Message) => void;
  onShowToast: (message: string) => void;
};

export default function MessageList({
  activeConversation,
  currentUser,
  messages,
  isTyping,
  onReply,
  onShowToast,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const messagePreviewById = Object.fromEntries(
    messages.map((message) => [
      message.id,
      message.text || message.caption || message.fileName || 'Message',
    ]),
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [isTyping, messages]);

  return (
    <div className="messages">
      <DateDivider label="Today" />
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          activeConversation={activeConversation}
          currentUser={currentUser}
          message={message}
          replyPreview={message.replyToMessageId ? messagePreviewById[message.replyToMessageId] : ''}
          onReply={onReply}
          onShowToast={onShowToast}
        />
      ))}
      {isTyping ? <TypingIndicator activeConversation={activeConversation} /> : null}
      <div ref={endRef} />
    </div>
  );
}
