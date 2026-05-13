import type { Server as HttpServer } from 'node:http';
import { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { createMessageForUser } from '../services/message.service.js';
import { markMessageDeliveredForUser } from '../services/receipt.service.js';
import { updateTypingForUser } from '../services/typing.service.js';
import { mapCall, mapConversationForUser, mapMessage, mapTypingState } from '../utils/chatMapper.js';
import { HttpError } from '../utils/httpError.js';
import { verifyAuthToken } from '../utils/auth.js';

const realtimeConversationInclude = {
  mediaItems: {
    orderBy: { position: 'asc' as const },
  },
  participants: {
    include: {
      user: true,
    },
    orderBy: {
      joinedAt: 'asc' as const,
    },
  },
} satisfies Prisma.ConversationInclude;

let io: Server | null = null;
const activeSocketIdsByUserId = new Map<string, Set<string>>();
const presenceBySocketId = new Map<string, 'online' | 'away'>();

function userRoom(userId: string) {
  return `user:${userId}`;
}

function rememberSocketConnection(userId: string, socketId: string): number {
  const socketIds = activeSocketIdsByUserId.get(userId) ?? new Set<string>();
  socketIds.add(socketId);
  activeSocketIdsByUserId.set(userId, socketIds);
  presenceBySocketId.set(socketId, 'online');
  return socketIds.size;
}

function forgetSocketConnection(userId: string, socketId: string): number {
  const socketIds = activeSocketIdsByUserId.get(userId);
  presenceBySocketId.delete(socketId);
  if (!socketIds) {
    return 0;
  }

  socketIds.delete(socketId);
  if (socketIds.size === 0) {
    activeSocketIdsByUserId.delete(userId);
    return 0;
  }

  return socketIds.size;
}

function setSocketPresence(socketId: string, status: 'online' | 'away') {
  presenceBySocketId.set(socketId, status);
}

function getEffectivePresenceForUser(userId: string): 'online' | 'away' | 'offline' {
  const socketIds = activeSocketIdsByUserId.get(userId);
  if (!socketIds || socketIds.size === 0) {
    return 'offline';
  }

  for (const socketId of socketIds) {
    if (presenceBySocketId.get(socketId) === 'online') {
      return 'online';
    }
  }

  return 'away';
}

function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};

  for (const token of (header || '').split(';')) {
    const trimmed = token.trim();
    if (!trimmed) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const name = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    cookies[name] = decodeURIComponent(value);
  }

  return cookies;
}

async function authenticateSocket(cookieHeader: string | undefined): Promise<User> {
  const cookies = parseCookies(cookieHeader);
  const token = cookies[env.cookieName];

  if (!token) {
    throw new Error('Authentication required');
  }

  const payload = verifyAuthToken(token) as { sub?: string };
  const userId = String(payload?.sub || '');

  if (!userId) {
    throw new Error('Invalid authentication token');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('Invalid authentication token');
  }

  return user;
}

async function emitPresenceForUser(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: {
          userId,
        },
      },
    },
    select: {
      id: true,
    },
  });

  await Promise.all(conversations.map((conversation) => emitConversationUpsert(conversation.id)));
}

async function updateUserPresence(userId: string, status: 'online' | 'away' | 'offline') {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });

  if (!existingUser || existingUser.status === status) {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status },
  });

  await emitPresenceForUser(userId);
}

function getIo() {
  if (!io) {
    throw new Error('Realtime server has not been initialized');
  }

  return io;
}

export function initializeRealtime(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: env.clientOrigin,
      credentials: true,
    },
    transports: ['websocket'],
  });

  io.use(async (socket, next) => {
    try {
      socket.data.user = await authenticateSocket(socket.handshake.headers.cookie);
      next();
    } catch (error) {
      const parsedCookies = parseCookies(socket.handshake.headers.cookie);
      console.warn('[realtime] socket authentication failed', {
        message: error instanceof Error ? error.message : 'Authentication failed',
        origin: socket.handshake.headers.origin,
        address: socket.handshake.address,
        cookieNames: Object.keys(parsedCookies),
        hasAuthTokenCookie: Boolean(parsedCookies[env.cookieName]),
      });
      next(error instanceof Error ? error : new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as User;
    console.info('[realtime] socket connected', {
      socketId: socket.id,
      userId: user.id,
      transport: socket.conn.transport.name,
    });
    const activeSocketCount = rememberSocketConnection(user.id, socket.id);
    socket.join(userRoom(user.id));
    socket.emit('realtime:ready', { userId: user.id });

    updateUserPresence(user.id, getEffectivePresenceForUser(user.id)).catch((error) => {
      console.error('[realtime] failed to sync user presence on connect', {
        userId: user.id,
        message: error instanceof Error ? error.message : String(error),
      });
    });

    socket.on('message:send', async (payload, acknowledge) => {
      try {
        const message = await createMessageForUser(user, {
          conversationId: String(payload?.conversationId || ''),
          kind: payload?.kind,
          text: payload?.text,
          image: payload?.image,
          caption: payload?.caption,
          fileName: payload?.fileName,
          fileSize: payload?.fileSize,
          replyToMessageId: payload?.replyToMessageId || null,
        });

        await Promise.all([
          emitConversationUpsert(message.conversationId),
          emitMessageCreated(message.id),
        ]);

        acknowledge?.({
          success: true,
          data: mapMessage(message, user),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to send message';
        const status = error instanceof HttpError ? error.status : 500;
        acknowledge?.({
          success: false,
          status,
          message,
        });
      }
    });

    socket.on('typing:set', async (payload, acknowledge) => {
      try {
        const state = await updateTypingForUser(
          user,
          String(payload?.conversationId || ''),
          payload?.isTyping,
        );

        await emitTypingUpdate(String(payload?.conversationId || ''));

        acknowledge?.({
          success: true,
          data: mapTypingState(state),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to update typing state';
        const status = error instanceof HttpError ? error.status : 500;
        acknowledge?.({
          success: false,
          status,
          message,
        });
      }
    });

    socket.on('message:received', async (payload, acknowledge) => {
      try {
        const message = await markMessageDeliveredForUser(
          user,
          String(payload?.messageId || ''),
        );

        await emitMessageUpdated(message.id);

        acknowledge?.({
          success: true,
          data: {
            messageId: message.id,
            status: message.status,
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to mark message as delivered';
        const status = error instanceof HttpError ? error.status : 500;
        acknowledge?.({
          success: false,
          status,
          message,
        });
      }
    });

    socket.on('presence:set', async (payload, acknowledge) => {
      try {
        const status = payload?.status;

        if (status !== 'online' && status !== 'away') {
          throw new HttpError(400, '`status` must be online or away');
        }

        setSocketPresence(socket.id, status);
        await updateUserPresence(user.id, getEffectivePresenceForUser(user.id));
        acknowledge?.({
          success: true,
          data: { status },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to update presence';
        const status = error instanceof HttpError ? error.status : 500;
        acknowledge?.({
          success: false,
          status,
          message,
        });
      }
    });

    socket.on('disconnect', (reason) => {
      const remainingSocketCount = forgetSocketConnection(user.id, socket.id);
      console.info('[realtime] socket disconnected', {
        socketId: socket.id,
        userId: user.id,
        reason,
        remainingSocketCount,
      });

      if (remainingSocketCount === 0) {
        updateUserPresence(user.id, 'offline').catch((error) => {
          console.error('[realtime] failed to mark user offline', {
            userId: user.id,
            message: error instanceof Error ? error.message : String(error),
          });
        });
        return;
      }

      updateUserPresence(user.id, getEffectivePresenceForUser(user.id)).catch((error) => {
        console.error('[realtime] failed to sync user presence on disconnect', {
          userId: user.id,
          message: error instanceof Error ? error.message : String(error),
        });
      });
    });
  });

  return io;
}

async function findConversation(conversationId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: realtimeConversationInclude,
  });
}

export async function emitConversationUpsert(conversationId: string) {
  if (!io) {
    return;
  }

  const conversation = await findConversation(conversationId);
  if (!conversation) {
    return;
  }

  const server = getIo();
  for (const participant of conversation.participants) {
    server.to(userRoom(participant.userId)).emit('conversation:upsert', {
      conversation: mapConversationForUser(conversation, participant.userId),
    });
  }
}

export async function emitMessageCreated(messageId: string) {
  if (!io) {
    return;
  }

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      reactions: true,
      conversation: {
        include: realtimeConversationInclude,
      },
    },
  });

  if (!message?.conversation) {
    return;
  }

  const server = getIo();
  for (const participant of message.conversation.participants) {
    server.to(userRoom(participant.userId)).emit('message:created', {
      conversationId: message.conversationId,
      conversation: mapConversationForUser(message.conversation, participant.userId),
      message: mapMessage(message, participant.userId),
    });
  }
}

export async function emitMessageUpdated(messageId: string) {
  if (!io) {
    return;
  }

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      reactions: true,
      conversation: {
        include: realtimeConversationInclude,
      },
    },
  });

  if (!message?.conversation) {
    return;
  }

  const server = getIo();
  for (const participant of message.conversation.participants) {
    server.to(userRoom(participant.userId)).emit('message:updated', {
      conversationId: message.conversationId,
      message: mapMessage(message, participant.userId),
    });
  }
}

export async function emitTypingUpdate(conversationId: string) {
  if (!io) {
    return;
  }

  const [conversation, typingState] = await Promise.all([
    findConversation(conversationId),
    prisma.typingState.findUnique({
      where: { conversationId },
    }),
  ]);

  if (!conversation) {
    return;
  }

  const payload = {
    conversationId,
    typing: mapTypingState(typingState),
  };
  const server = getIo();

  for (const participant of conversation.participants) {
    server.to(userRoom(participant.userId)).emit('typing:update', payload);
  }
}

export async function emitCallUpdate(conversationId: string) {
  if (!io) {
    return;
  }

  const [conversation, call] = await Promise.all([
    findConversation(conversationId),
    prisma.conversationCall.findUnique({
      where: { conversationId },
    }),
  ]);

  if (!conversation) {
    return;
  }

  const payload = {
    conversationId,
    call: mapCall(call),
  };
  const server = getIo();

  for (const participant of conversation.participants) {
    server.to(userRoom(participant.userId)).emit('call:update', payload);
  }
}

export async function emitConversationRead(conversationId: string, readByUserId: string) {
  if (!io) {
    return;
  }

  const conversation = await findConversation(conversationId);
  if (!conversation) {
    return;
  }

  const server = getIo();
  for (const participant of conversation.participants) {
    server.to(userRoom(participant.userId)).emit('conversation:messagesRead', {
      conversationId,
      readByUserId,
      conversation: mapConversationForUser(conversation, participant.userId),
    });
  }
}
