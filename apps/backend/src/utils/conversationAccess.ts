export function conversationAccessWhere(userId: string, conversationId?: string) {
  return {
    ...(conversationId ? { id: conversationId } : {}),
    participants: {
      some: {
        userId,
      },
    },
  };
}
