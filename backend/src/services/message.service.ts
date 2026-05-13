import crypto from 'node:crypto';
import type { User } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { conversationAccessWhere } from '../utils/conversationAccess.js';
import { assert, HttpError } from '../utils/httpError.js';

export type CreateMessageInput = {
  conversationId: string;
  kind?: 'text' | 'image' | 'file';
  text?: string;
  image?: string;
  caption?: string;
  fileName?: string;
  fileSize?: string;
  replyToMessageId?: string | null;
};

function formatNow(): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date());
}

async function messageMediaPositionSeed(conversationId: string): Promise<number> {
  const count = await prisma.conversationMedia.count({
    where: { conversationId },
  });

  return count;
}

export async function createMessageForUser(user: User, input: CreateMessageInput) {
  const { conversationId, kind, text, image, caption, fileName, fileSize, replyToMessageId } = input;

  assert(
    kind !== undefined && ['text', 'image', 'file'].includes(kind),
    400,
    '`kind` must be text, image, or file',
  );

  if (kind === 'text') {
    assert((text || '').trim(), 400, 'Text message content is required');
  }

  if (kind === 'image') {
    assert((image || '').trim(), 400, 'Image URL is required');
  }

  if (kind === 'file') {
    assert((fileName || '').trim(), 400, 'File name is required');
    assert((fileSize || '').trim(), 400, 'File size is required');
  }

  const conversation = await prisma.conversation.findFirst({
    where: conversationAccessWhere(user.id, conversationId),
  });

  if (!conversation) {
    throw new HttpError(404, 'Conversation not found');
  }

  let replyTo = null;
  if (replyToMessageId) {
    const replyMessage = await prisma.message.findFirst({
      where: {
        id: String(replyToMessageId),
        conversationId,
        conversation: conversationAccessWhere(user.id, conversationId),
      },
    });

    if (!replyMessage) {
      throw new HttpError(400, 'Reply target was not found in this conversation');
    }

    replyTo = replyMessage.id;
  }

  const mediaCount = await messageMediaPositionSeed(conversation.id);

  const message = await prisma.message.create({
    data: {
      id: `msg-${crypto.randomUUID()}`,
      conversationId,
      kind,
      sender: 'self',
      senderUserId: user.id,
      senderName: user.name,
      senderInitials: user.initials,
      text: text?.trim() || null,
      image: image?.trim() || null,
      caption: caption?.trim() || null,
      fileName: fileName?.trim() || null,
      fileSize: fileSize?.trim() || null,
      replyTo,
      time: formatNow(),
      status: '✓',
    },
    include: { reactions: true },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      preview: message.text || message.caption || message.fileName || 'Shared a message',
      time: message.time,
    },
  });

  if (message.kind === 'image' && message.image) {
    await prisma.conversationMedia.create({
      data: {
        conversationId,
        url: message.image,
        position: mediaCount,
      },
    });
  }

  return message;
}
