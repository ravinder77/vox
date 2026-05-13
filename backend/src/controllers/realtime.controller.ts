import type { Response } from 'express';
import type { ApiRequest } from '../types/api.js';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { emitCallUpdate, emitTypingUpdate } from '../realtime/socket.js';
import { updateTypingForUser } from '../services/typing.service.js';
import { mapCall, mapTypingState } from '../utils/chatMapper.js';
import { conversationAccessWhere } from '../utils/conversationAccess.js';
import { assert, HttpError } from '../utils/httpError.js';

export const updateTyping = asyncHandler(async function updateTyping(req, res) {
  const typedReq = req as ApiRequest<{ conversationId: string }, any, { isTyping?: boolean }>;
  const typedRes = res as Response;
  const { isTyping } = typedReq.body;
  const state = await updateTypingForUser(
    typedReq.authUser!,
    typedReq.params.conversationId,
    isTyping as boolean,
  );

  await emitTypingUpdate(typedReq.params.conversationId);

  typedRes.json({
    success: true,
    message: state.isTyping ? 'Typing started' : 'Typing stopped',
    data: mapTypingState(state),
  });
});

export const getTyping = asyncHandler(async function getTyping(req, res) {
  const typedReq = req as ApiRequest<{ conversationId: string }>;
  const typedRes = res as Response;
  const conversation = await prisma.conversation.findFirst({
    where: conversationAccessWhere(typedReq.authUser!.id, typedReq.params.conversationId),
  });

  if (!conversation) {
    throw new HttpError(404, 'Conversation not found');
  }

  const state = await prisma.typingState.findUnique({
    where: { conversationId: typedReq.params.conversationId },
  });

  typedRes.json({
    success: true,
    data: mapTypingState(state),
  });
});

export const startCall = asyncHandler(async function startCall(req, res) {
  const typedReq = req as ApiRequest<{ conversationId: string }, any, { mode?: 'voice' | 'video' }>;
  const typedRes = res as Response;
  const { mode } = typedReq.body;

  assert(!mode || ['voice', 'video'].includes(mode), 400, '`mode` must be voice or video');

  const conversation = await prisma.conversation.findFirst({
    where: conversationAccessWhere(typedReq.authUser!.id, typedReq.params.conversationId),
  });

  if (!conversation) {
    throw new HttpError(404, 'Conversation not found');
  }

  const call = await prisma.conversationCall.upsert({
    where: { conversationId: typedReq.params.conversationId },
    update: {
      isActive: true,
      startedAt: new Date(),
      endedAt: null,
      startedById: typedReq.authUser!.id,
      mode: mode || 'voice',
    },
    create: {
      conversationId: typedReq.params.conversationId,
      isActive: true,
      startedAt: new Date(),
      startedById: typedReq.authUser!.id,
      mode: mode || 'voice',
    },
  });

  await emitCallUpdate(typedReq.params.conversationId);

  typedRes.status(201).json({
    success: true,
    message: 'Call connected',
    data: mapCall(call),
  });
});

export const endCall = asyncHandler(async function endCall(req, res) {
  const typedReq = req as ApiRequest<{ conversationId: string }>;
  const typedRes = res as Response;
  const conversation = await prisma.conversation.findFirst({
    where: conversationAccessWhere(typedReq.authUser!.id, typedReq.params.conversationId),
  });

  if (!conversation) {
    throw new HttpError(404, 'Conversation not found');
  }

  const call = await prisma.conversationCall.upsert({
    where: { conversationId: typedReq.params.conversationId },
    update: {
      isActive: false,
      endedAt: new Date(),
    },
    create: {
      conversationId: typedReq.params.conversationId,
      isActive: false,
      endedAt: new Date(),
    },
  });

  await emitCallUpdate(typedReq.params.conversationId);

  typedRes.json({
    success: true,
    message: 'Call ended',
    data: mapCall(call),
  });
});

export const getCall = asyncHandler(async function getCall(req, res) {
  const typedReq = req as ApiRequest<{ conversationId: string }>;
  const typedRes = res as Response;
  const conversation = await prisma.conversation.findFirst({
    where: conversationAccessWhere(typedReq.authUser!.id, typedReq.params.conversationId),
  });

  if (!conversation) {
    throw new HttpError(404, 'Conversation not found');
  }

  const call = await prisma.conversationCall.findUnique({
    where: { conversationId: typedReq.params.conversationId },
  });

  typedRes.json({
    success: true,
    data: mapCall(call),
  });
});
