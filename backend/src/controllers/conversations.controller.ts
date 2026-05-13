import type { Response } from 'express';
import { ConversationType, Prisma } from '@prisma/client';
import type { ApiRequest } from '../types/api.js';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { emitConversationRead, emitConversationUpsert } from '../realtime/socket.js';
import {
  mapCall,
  mapConversation,
  mapConversationForUser,
  mapMessage,
  mapTypingState,
  mapUser,
} from '../utils/chatMapper.js';
import { conversationAccessWhere } from '../utils/conversationAccess.js';
import { assert, HttpError } from '../utils/httpError.js';

const conversationInclude = {
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

const conversationCardGradients = [
  ['#4fc3f7', '#6c63ff'],
  ['#66bb6a', '#26a69a'],
  ['#ef5350', '#e91e8c'],
  ['#26c6da', '#42a5f5'],
  ['#ffa726', '#ff7043'],
  ['#7e57c2', '#5c6bc0'],
];

function buildInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'VC'
  );
}

function gradientForText(value: string) {
  const seed = Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return conversationCardGradients[seed % conversationCardGradients.length];
}

function groupAvatarData(name: string) {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  const first = tokens[0]?.[0]?.toUpperCase() || 'G';
  const second = tokens[1]?.[0]?.toUpperCase() || tokens[0]?.[1]?.toUpperCase() || 'C';
  const index = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return {
    initials: buildInitials(name),
    groupInitials: [first, second],
    groupGradients: [
      conversationCardGradients[index % conversationCardGradients.length],
      conversationCardGradients[(index + 2) % conversationCardGradients.length],
    ],
  };
}

function sortConversationsByLastMessage<T extends { id: string; createdAt: Date }>(
  conversations: T[],
  messageCreatedAtByConversationId: Map<string, Date>,
) {
  return conversations.slice().sort((left, right) => {
    const leftActivity = messageCreatedAtByConversationId.get(left.id) ?? left.createdAt;
    const rightActivity = messageCreatedAtByConversationId.get(right.id) ?? right.createdAt;
    return rightActivity.getTime() - leftActivity.getTime();
  });
}

export const getBootstrap = asyncHandler(async function getBootstrap(req, res) {
  const typedReq = req as ApiRequest;
  const typedRes = res as Response;
  const conversationWhere = conversationAccessWhere(typedReq.authUser!.id);
  const [conversations, messages, typingStates, calls] = await Promise.all([
    prisma.conversation.findMany({
      where: conversationWhere,
      include: conversationInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.message.findMany({
      where: {
        conversation: conversationWhere,
      },
      include: { reactions: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.typingState.findMany({
      where: {
        conversation: conversationWhere,
      },
    }),
    prisma.conversationCall.findMany({
      where: {
        conversation: conversationWhere,
      },
    }),
  ]);

  const messagesByConversation: Record<string, ReturnType<typeof mapMessage>[]> = {};
  const latestMessageCreatedAtByConversationId = new Map<string, Date>();
  for (const message of messages) {
    messagesByConversation[message.conversationId] ||= [];
    messagesByConversation[message.conversationId].push(mapMessage(message, typedReq.authUser));
    latestMessageCreatedAtByConversationId.set(message.conversationId, message.createdAt);
  }

  const typingByConversation = Object.fromEntries(
    typingStates.map((state) => [state.conversationId, mapTypingState(state)]),
  );
  const callsByConversation = Object.fromEntries(
    calls.map((call) => [call.conversationId, mapCall(call)]),
  );

  typedRes.json({
    success: true,
    data: {
      currentUser: typedReq.authUser
        ? {
            id: typedReq.authUser.id,
            email: typedReq.authUser.email,
            name: typedReq.authUser.name,
            username: typedReq.authUser.username,
            initials: typedReq.authUser.initials,
            role: typedReq.authUser.role,
            status: typedReq.authUser.status,
          }
        : null,
      conversations: sortConversationsByLastMessage(
        conversations,
        latestMessageCreatedAtByConversationId,
      ).map((conversation) =>
        mapConversationForUser(conversation, typedReq.authUser!.id),
      ),
      messagesByConversation,
      typingByConversation,
      callsByConversation,
    },
  });
});

export const listConversations = asyncHandler(async function listConversations(req, res) {
  const typedReq = req as ApiRequest<any, any, any, Record<string, string | undefined>>;
  const typedRes = res as Response;
  const { tab = 'all', search = '' } = typedReq.query;
  const conversationType =
    tab === 'direct' || tab === 'group' ? (tab as ConversationType) : undefined;

  const conversationWhere: Prisma.ConversationWhereInput = {
    ...conversationAccessWhere(typedReq.authUser!.id),
    ...(conversationType ? { type: conversationType } : {}),
    ...(search
      ? {
          name: {
            contains: String(search).trim(),
            mode: 'insensitive' as const,
          },
        }
      : {}),
  };

  const [conversations, orderedMessages] = await Promise.all([
    prisma.conversation.findMany({
      where: conversationWhere,
      include: conversationInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.message.findMany({
      where: {
        conversation: conversationWhere,
      },
      select: {
        conversationId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const latestMessageCreatedAtByConversationId = new Map<string, Date>();
  for (const message of orderedMessages) {
    if (!latestMessageCreatedAtByConversationId.has(message.conversationId)) {
      latestMessageCreatedAtByConversationId.set(message.conversationId, message.createdAt);
    }
  }

  typedRes.json({
    success: true,
    data: sortConversationsByLastMessage(
      conversations,
      latestMessageCreatedAtByConversationId,
    ).map((conversation) => mapConversationForUser(conversation, typedReq.authUser!.id)),
  });
});

export const getConversation = asyncHandler(async function getConversation(req, res) {
  const typedReq = req as ApiRequest<{ conversationId: string }>;
  const typedRes = res as Response;
  const conversation = await prisma.conversation.findFirst({
    where: conversationAccessWhere(typedReq.authUser!.id, typedReq.params.conversationId),
    include: conversationInclude,
  });

  if (!conversation) {
    throw new HttpError(404, 'Conversation not found');
  }

  typedRes.json({
    success: true,
    data: mapConversationForUser(conversation, typedReq.authUser!.id),
  });
});

export const markConversationRead = asyncHandler(async function markConversationRead(req, res) {
  const typedReq = req as ApiRequest<{ conversationId: string }>;
  const typedRes = res as Response;
  const existing = await prisma.conversation.findFirst({
    where: conversationAccessWhere(typedReq.authUser!.id, typedReq.params.conversationId),
  });

  if (!existing) {
    throw new HttpError(404, 'Conversation not found');
  }

  await prisma.message.updateMany({
    where: {
      conversationId: typedReq.params.conversationId,
      senderUserId: {
        not: typedReq.authUser!.id,
      },
      status: {
        not: null,
      },
    },
    data: {
      status: '✓✓',
    },
  });

  const conversation = await prisma.conversation.update({
    where: { id: typedReq.params.conversationId },
    data: { unread: 0 },
    include: conversationInclude,
  });

  await Promise.all([
    emitConversationUpsert(typedReq.params.conversationId),
    emitConversationRead(typedReq.params.conversationId, typedReq.authUser!.id),
  ]);

  typedRes.json({
    success: true,
    message: `Marked ${conversation.name} as read`,
    data: mapConversationForUser(conversation, typedReq.authUser!.id),
  });
});

export const updateNotifications = asyncHandler(async function updateNotifications(req, res) {
  const typedReq = req as ApiRequest<{ conversationId: string }, any, { isMuted?: boolean }>;
  const typedRes = res as Response;
  if (typeof typedReq.body.isMuted !== 'boolean') {
    throw new HttpError(400, '`isMuted` must be a boolean');
  }

  const existing = await prisma.conversation.findFirst({
    where: conversationAccessWhere(typedReq.authUser!.id, typedReq.params.conversationId),
  });

  if (!existing) {
    throw new HttpError(404, 'Conversation not found');
  }

  const conversation = await prisma.conversation.update({
    where: { id: typedReq.params.conversationId },
    data: { isMuted: typedReq.body.isMuted },
    include: conversationInclude,
  });

  await emitConversationUpsert(typedReq.params.conversationId);

  typedRes.json({
    success: true,
    message: conversation.isMuted ? 'Conversation muted' : 'Notifications enabled',
    data: mapConversationForUser(conversation, typedReq.authUser!.id),
  });
});

export const getMedia = asyncHandler(async function getMedia(req, res) {
  const typedReq = req as ApiRequest<{ conversationId: string }>;
  const typedRes = res as Response;
  const conversation = await prisma.conversation.findFirst({
    where: conversationAccessWhere(typedReq.authUser!.id, typedReq.params.conversationId),
    include: conversationInclude,
  });

  if (!conversation) {
    throw new HttpError(404, 'Conversation not found');
  }

  typedRes.json({
    success: true,
    data: mapConversationForUser(conversation, typedReq.authUser!.id).media,
  });
});

export const listUsers = asyncHandler(async function listUsers(req, res) {
  const typedReq = req as ApiRequest<any, any, any, { search?: string; conversationId?: string }>;
  const typedRes = res as Response;
  const rawSearch = (typedReq.query.search || '').trim();
  const search = rawSearch.replace(/^@+/, '');
  const conversationId = (typedReq.query.conversationId || '').trim();

  let participantUserIds = new Set<string>();
  if (conversationId) {
    const conversation = await prisma.conversation.findFirst({
      where: conversationAccessWhere(typedReq.authUser!.id, conversationId),
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      throw new HttpError(404, 'Conversation not found');
    }

    participantUserIds = new Set(conversation.participants.map((participant) => participant.userId));
  }

  const users = await prisma.user.findMany({
    where: {
      id: {
        not: typedReq.authUser!.id,
      },
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                username: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    },
    orderBy: {
      name: 'asc',
    },
    take: 12,
  });

  typedRes.json({
    success: true,
    data: users.map((user) => ({
      ...mapUser(user),
      isMember: participantUserIds.has(user.id),
    })),
  });
});

export const addParticipant = asyncHandler(async function addParticipant(req, res) {
  const typedReq = req as ApiRequest<{ conversationId: string }, any, { userId?: string }>;
  const typedRes = res as Response;
  const userId = (typedReq.body.userId || '').trim();

  assert(userId, 400, '`userId` is required');

  const conversation = await prisma.conversation.findFirst({
    where: conversationAccessWhere(typedReq.authUser!.id, typedReq.params.conversationId),
    include: {
      participants: true,
    },
  });

  if (!conversation) {
    throw new HttpError(404, 'Conversation not found');
  }

  assert(conversation.type === ConversationType.group, 400, 'Users can only be added to group chats');

  const existingParticipant = conversation.participants.find((participant) => participant.userId === userId);
  if (existingParticipant) {
    throw new HttpError(409, 'User is already in this chat');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  await prisma.conversationParticipant.create({
    data: {
      conversationId: conversation.id,
      userId,
    },
  });

  const participantCount = await prisma.conversationParticipant.count({
    where: {
      conversationId: conversation.id,
    },
  });

  const updatedConversation = await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      role: `${participantCount} participants`,
    },
    include: conversationInclude,
  });

  await emitConversationUpsert(updatedConversation.id);

  typedRes.status(201).json({
    success: true,
    message: `${user.name} added to ${updatedConversation.name}`,
    data: mapConversationForUser(updatedConversation, typedReq.authUser!.id),
  });
});

export const createConversation = asyncHandler(async function createConversation(req, res) {
  const typedReq = req as ApiRequest<
    any,
    any,
    { type?: 'direct' | 'group'; userId?: string; participantIds?: string[]; name?: string }
  >;
  const typedRes = res as Response;
  const type = typedReq.body.type;

  assert(type === 'direct' || type === 'group', 400, '`type` must be direct or group');

  if (type === 'direct') {
    const targetUserId = (typedReq.body.userId || '').trim();
    assert(targetUserId, 400, '`userId` is required for direct chats');
    assert(targetUserId !== typedReq.authUser!.id, 400, 'Cannot create a direct chat with yourself');

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new HttpError(404, 'User not found');
    }

    const directCandidates = await prisma.conversation.findMany({
      where: {
        type: ConversationType.direct,
        participants: {
          some: {
            userId: typedReq.authUser!.id,
          },
        },
      },
      include: conversationInclude,
      orderBy: {
        createdAt: 'asc',
      },
    });

    const existingConversation = directCandidates.find((conversation) => {
      const participantIds = conversation.participants.map((participant) => participant.userId).sort();
      return (
        participantIds.length === 2 &&
        participantIds[0] === [typedReq.authUser!.id, targetUserId].sort()[0] &&
        participantIds[1] === [typedReq.authUser!.id, targetUserId].sort()[1]
      );
    });

    if (existingConversation) {
      typedRes.json({
        success: true,
        message: `Opened chat with ${targetUser.name}`,
        data: mapConversationForUser(existingConversation, typedReq.authUser!.id),
      });
      return;
    }

    const conversation = await prisma.conversation.create({
      data: {
        id: `conv-${crypto.randomUUID()}`,
        type: ConversationType.direct,
        name: targetUser.name,
        initials: targetUser.initials || buildInitials(targetUser.name),
        gradient: gradientForText(targetUser.name),
        groupInitials: Prisma.JsonNull,
        groupGradients: Prisma.JsonNull,
        status: targetUser.status,
        preview: 'No messages yet',
        time: 'now',
        unread: 0,
        role: targetUser.role,
        email: targetUser.email,
        location: `@${targetUser.username}`,
        isMuted: false,
        participants: {
          create: [{ userId: typedReq.authUser!.id }, { userId: targetUserId }],
        },
      },
      include: conversationInclude,
    });

    await emitConversationUpsert(conversation.id);

    typedRes.status(201).json({
      success: true,
      message: `Started chat with ${targetUser.name}`,
      data: mapConversationForUser(conversation, typedReq.authUser!.id),
    });
    return;
  }

  const name = (typedReq.body.name || '').trim();
  const participantIds = Array.from(
    new Set([...(typedReq.body.participantIds || []).map((id) => String(id).trim()).filter(Boolean)]),
  ).filter((id) => id !== typedReq.authUser!.id);

  assert(name.length >= 2, 400, 'Group name must be at least 2 characters');
  assert(participantIds.length >= 1, 400, 'Choose at least one user for the group');

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: participantIds,
      },
    },
  });

  assert(users.length === participantIds.length, 400, 'One or more selected users were not found');

  const groupData = groupAvatarData(name);
  const conversation = await prisma.conversation.create({
    data: {
      id: `conv-${crypto.randomUUID()}`,
      type: ConversationType.group,
      name,
      initials: groupData.initials,
      gradient: gradientForText(name),
      groupInitials: groupData.groupInitials,
      groupGradients: groupData.groupGradients,
      status: 'online',
      preview: 'Group created',
      time: 'now',
      unread: 0,
      role: `${participantIds.length + 1} participants`,
      email: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@vox.chat`,
      location: 'Workspace',
      isMuted: false,
      participants: {
        create: [typedReq.authUser!.id, ...participantIds].map((userId) => ({ userId })),
      },
    },
    include: conversationInclude,
  });

  await emitConversationUpsert(conversation.id);

  typedRes.status(201).json({
    success: true,
    message: `${conversation.name} created`,
    data: mapConversationForUser(conversation, typedReq.authUser!.id),
  });
});
