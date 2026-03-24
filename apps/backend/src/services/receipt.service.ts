import type { User } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { conversationAccessWhere } from '../utils/conversationAccess.js';
import { HttpError } from '../utils/httpError.js';

export async function markMessageDeliveredForUser(user: User, messageId: string) {
  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      conversation: conversationAccessWhere(user.id),
    },
    include: {
      reactions: true,
    },
  });

  if (!message) {
    throw new HttpError(404, 'Message not found');
  }

  if (!message.senderUserId || message.senderUserId === user.id) {
    return message;
  }

  if (message.status === '✓✓') {
    return message;
  }

  return prisma.message.update({
    where: { id: message.id },
    data: {
      status: '✓✓',
    },
    include: {
      reactions: true,
    },
  });
}
