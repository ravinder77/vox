import type { Response } from 'express';
import type { ApiRequest } from '../types/api.js';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { emitConversationUpsert, emitMessageCreated, emitMessageUpdated } from '../realtime/socket.js';
import { createMessageForUser } from '../services/message.service.js';
import { mapMessage } from '../utils/chatMapper.js';
import { conversationAccessWhere } from '../utils/conversationAccess.js';
import { assert, HttpError } from '../utils/httpError.js';

export const listMessages = asyncHandler(async function listMessages(req, res) {
  const typedReq = req as ApiRequest<{ conversationId: string }>;
  const typedRes = res as Response;
  const conversation = await prisma.conversation.findFirst({
    where: conversationAccessWhere(typedReq.authUser!.id, typedReq.params.conversationId),
  });

  if (!conversation) {
    throw new HttpError(404, 'Conversation not found');
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: typedReq.params.conversationId },
    include: { reactions: true },
    orderBy: { createdAt: 'asc' },
  });

  typedRes.json({
    success: true,
    data: messages.map((message) => mapMessage(message, typedReq.authUser)),
  });
});

export const createMessage = asyncHandler(async function createMessage(req, res) {
  const typedReq = req as ApiRequest<
    { conversationId: string },
    any,
    Record<string, string | undefined>
  >;
  const typedRes = res as Response;
  const message = await createMessageForUser(typedReq.authUser!, {
    conversationId: typedReq.params.conversationId,
    kind: typedReq.body.kind as 'text' | 'image' | 'file' | undefined,
    text: typedReq.body.text,
    image: typedReq.body.image,
    caption: typedReq.body.caption,
    fileName: typedReq.body.fileName,
    fileSize: typedReq.body.fileSize,
    replyToMessageId: typedReq.body.replyToMessageId,
  });

  await Promise.all([
    emitConversationUpsert(typedReq.params.conversationId),
    emitMessageCreated(message.id),
  ]);

  typedRes.status(201).json({
    success: true,
    message: 'Message sent',
    data: mapMessage(message, typedReq.authUser),
  });
});

export const addReaction = asyncHandler(async function addReaction(req, res) {
  const typedReq = req as ApiRequest<
    { conversationId: string; messageId: string },
    any,
    { emoji?: string }
  >;
  const typedRes = res as Response;
  const emoji = typedReq.body.emoji?.trim();

  assert(emoji, 400, 'Emoji is required');

  const message = await prisma.message.findFirst({
    where: {
      id: typedReq.params.messageId,
      conversationId: typedReq.params.conversationId,
      conversation: conversationAccessWhere(typedReq.authUser!.id, typedReq.params.conversationId),
    },
  });

  if (!message) {
    throw new HttpError(404, 'Conversation or message not found');
  }

  await prisma.messageReaction.upsert({
    where: {
      messageId_emoji: {
        messageId: typedReq.params.messageId,
        emoji,
      },
    },
    update: {
      count: {
        increment: 1,
      },
    },
    create: {
      messageId: typedReq.params.messageId,
      emoji,
      count: 1,
    },
  });

  const updatedMessage = await prisma.message.findUnique({
    where: { id: typedReq.params.messageId },
    include: { reactions: true },
  });

  if (updatedMessage) {
    await emitMessageUpdated(updatedMessage.id);
  }

  typedRes.json({
    success: true,
    message: 'Reaction added',
    data: mapMessage(updatedMessage, typedReq.authUser),
  });
});

export const removeReaction = asyncHandler(async function removeReaction(req, res) {
  const typedReq = req as ApiRequest<
    { conversationId: string; messageId: string },
    any,
    any,
    { emoji?: string }
  >;
  const typedRes = res as Response;
  const emoji = (typedReq.query.emoji || '').trim();

  assert(emoji, 400, 'Query param `emoji` is required');

  const message = await prisma.message.findFirst({
    where: {
      id: typedReq.params.messageId,
      conversationId: typedReq.params.conversationId,
      conversation: conversationAccessWhere(typedReq.authUser!.id, typedReq.params.conversationId),
    },
    include: { reactions: true },
  });

  if (!message) {
    throw new HttpError(404, 'Conversation or message not found');
  }

  const reaction = message.reactions.find((item) => item.emoji === emoji);

  if (reaction) {
    if (reaction.count <= 1) {
      await prisma.messageReaction.delete({
        where: { id: reaction.id },
      });
    } else {
      await prisma.messageReaction.update({
        where: { id: reaction.id },
        data: {
          count: {
            decrement: 1,
          },
        },
      });
    }
  }

  const updatedMessage = await prisma.message.findUnique({
    where: { id: typedReq.params.messageId },
    include: { reactions: true },
  });

  if (updatedMessage) {
    await emitMessageUpdated(updatedMessage.id);
  }

  typedRes.json({
    success: true,
    message: 'Reaction removed',
    data: mapMessage(updatedMessage, typedReq.authUser),
  });
});
