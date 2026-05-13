import type { Conversation } from '../types/app';

export function syncConversationList(items: Conversation[], nextConversation: Conversation) {
  const existingIndex = items.findIndex((item) => item.id === nextConversation.id);
  if (existingIndex === -1) {
    return [nextConversation, ...items];
  }

  const nextItems = items.slice();
  nextItems[existingIndex] = nextConversation;
  return nextItems;
}

export function bumpConversationList(items: Conversation[], nextConversation: Conversation) {
  const remaining = items.filter((item) => item.id !== nextConversation.id);
  return [nextConversation, ...remaining];
}
