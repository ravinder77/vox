import type { User } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { conversationAccessWhere } from '../utils/conversationAccess.js';
import { assert, HttpError } from '../utils/httpError.js';

export async function updateTypingForUser(user: User, conversationId: string, isTyping: boolean) {
  assert(typeof isTyping === 'boolean', 400, '`isTyping` must be a boolean');

  const conversation = await prisma.conversation.findFirst({
    where: conversationAccessWhere(user.id, conversationId),
  });

  if (!conversation) {
    throw new HttpError(404, 'Conversation not found');
  }

  return prisma.typingState.upsert({
    where: { conversationId },
    update: {
      isTyping,
      userId: user.id,
      name: user.name,
    },
    create: {
      conversationId,
      isTyping,
      userId: user.id,
      name: user.name,
    },
  });
}
