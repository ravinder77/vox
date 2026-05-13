import { jest } from '@jest/globals';
import { ConversationType } from '@prisma/client';
import * as conversationsController from '../src/controllers/conversations.controller.js';
import { prisma } from '../src/lib/prisma.js';
import { restoreMethods, replaceMethod } from './helpers/replaceMethod.js';
import { createMockResponse, flushAsyncHandler } from './helpers/controllerHarness.js';

const authUser = {
  id: 'user-1',
  email: 'alex@example.com',
  name: 'Alex Rivera',
  username: 'alex',
  initials: 'AR',
  role: 'Member',
  status: 'online',
};

const otherUser = {
  id: 'user-2',
  email: 'sam@example.com',
  name: 'Sam Carter',
  username: 'sam',
  initials: 'SC',
  role: 'Member',
  status: 'away',
};

function buildConversation(overrides: Record<string, any> = {}) {
  return {
    id: 'conv-1',
    type: ConversationType.direct,
    name: 'Sam Carter',
    initials: 'SC',
    gradient: ['#4fc3f7', '#6c63ff'],
    groupInitials: null,
    groupGradients: null,
    status: 'away',
    preview: 'Hello',
    time: '9:41 AM',
    unread: 2,
    role: 'Member',
    email: 'sam@example.com',
    location: '@sam',
    isMuted: false,
    createdAt: new Date('2026-04-08T09:00:00.000Z'),
    mediaItems: [],
    participants: [
      { userId: authUser.id, joinedAt: new Date('2026-04-08T08:00:00.000Z'), user: authUser },
      { userId: otherUser.id, joinedAt: new Date('2026-04-08T08:05:00.000Z'), user: otherUser },
    ],
    ...overrides,
  };
}

afterEach(() => {
  restoreMethods();
  jest.restoreAllMocks();
});

describe('conversations controller', () => {
  it('returns bootstrap data grouped by conversation', async () => {
    replaceMethod(prisma.conversation, 'findMany', async () => [
      buildConversation(),
      buildConversation({
        id: 'conv-2',
        type: ConversationType.group,
        name: 'Design Team',
        createdAt: new Date('2026-04-08T07:00:00.000Z'),
        groupInitials: ['D', 'T'],
        groupGradients: [['#66bb6a', '#26a69a'], ['#26c6da', '#42a5f5']],
      }),
    ] as any);
    replaceMethod(prisma.message, 'findMany', async () => [
      {
        id: 'msg-1',
        conversationId: 'conv-1',
        kind: 'text',
        senderUserId: otherUser.id,
        senderName: otherUser.name,
        senderInitials: otherUser.initials,
        text: 'Latest',
        time: '9:45 AM',
        status: '✓',
        replyTo: null,
        reactions: [],
        createdAt: new Date('2026-04-08T09:45:00.000Z'),
      },
    ] as any);
    replaceMethod(prisma.typingState, 'findMany', async () => [
      {
        conversationId: 'conv-1',
        isTyping: true,
        userId: otherUser.id,
        name: otherUser.name,
        updatedAt: new Date('2026-04-08T09:46:00.000Z'),
      },
    ] as any);
    replaceMethod(prisma.conversationCall, 'findMany', async () => [
      {
        conversationId: 'conv-2',
        isActive: true,
        startedAt: new Date('2026-04-08T09:30:00.000Z'),
        endedAt: null,
        startedById: authUser.id,
        mode: 'video',
      },
    ] as any);

    const res = createMockResponse();
    const next = jest.fn();

    conversationsController.getBootstrap({ authUser } as any, res, next);
    await flushAsyncHandler();

    expect(next).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({
      success: true,
      data: {
        currentUser: expect.objectContaining({ id: authUser.id }),
        messagesByConversation: {
          'conv-1': [expect.objectContaining({ id: 'msg-1' })],
        },
        typingByConversation: {
          'conv-1': expect.objectContaining({ isTyping: true }),
        },
        callsByConversation: {
          'conv-2': expect.objectContaining({ isActive: true, mode: 'video' }),
        },
      },
    });
    expect(res.body.data.conversations[0]).toMatchObject({ id: 'conv-1' });
  });

  it('lists conversations filtered by search and type', async () => {
    replaceMethod(prisma.conversation, 'findMany', async (args: any) => {
      expect(args.where.type).toBe(ConversationType.direct);
      expect(args.where.name).toEqual({ contains: 'sam', mode: 'insensitive' });
      return [buildConversation()] as any;
    });
    replaceMethod(prisma.message, 'findMany', async () => [
      { conversationId: 'conv-1', createdAt: new Date('2026-04-08T10:00:00.000Z') },
    ] as any);

    const res = createMockResponse();
    const next = jest.fn();

    conversationsController.listConversations(
      { authUser, query: { tab: 'direct', search: ' sam ' } } as any,
      res,
      next,
    );
    await flushAsyncHandler();

    expect(next).not.toHaveBeenCalled();
    expect(res.body.data).toEqual([expect.objectContaining({ id: 'conv-1' })]);
  });

  it('returns a 404 when a conversation is missing', async () => {
    replaceMethod(prisma.conversation, 'findFirst', async () => null as any);

    const res = createMockResponse();
    const next = jest.fn();

    conversationsController.getConversation(
      { authUser, params: { conversationId: 'missing' } } as any,
      res,
      next,
    );
    await flushAsyncHandler();

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 404,
      message: 'Conversation not found',
    }));
  });

  it('marks a conversation as read and emits updates', async () => {
    replaceMethod(prisma.conversation, 'findFirst', async () => buildConversation() as any);
    replaceMethod(prisma.message, 'updateMany', async () => ({ count: 2 }) as any);
    replaceMethod(prisma.conversation, 'update', async () => buildConversation({ unread: 0 }) as any);

    const res = createMockResponse();
    const next = jest.fn();

    conversationsController.markConversationRead(
      { authUser, params: { conversationId: 'conv-1' } } as any,
      res,
      next,
    );
    await flushAsyncHandler();

    expect(next).not.toHaveBeenCalled();
    expect(res.body.message).toBe('Marked Sam Carter as read');
  });

  it('updates notification preferences', async () => {
    replaceMethod(prisma.conversation, 'findFirst', async () => buildConversation() as any);
    replaceMethod(
      prisma.conversation,
      'update',
      async () => buildConversation({ isMuted: true }) as any,
    );

    const res = createMockResponse();
    const next = jest.fn();

    conversationsController.updateNotifications(
      { authUser, params: { conversationId: 'conv-1' }, body: { isMuted: true } } as any,
      res,
      next,
    );
    await flushAsyncHandler();

    expect(next).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({
      success: true,
      message: 'Conversation muted',
      data: { isMuted: true },
    });
  });

  it('rejects notification updates with a non-boolean flag', async () => {
    const res = createMockResponse();
    const next = jest.fn();

    conversationsController.updateNotifications(
      { authUser, params: { conversationId: 'conv-1' }, body: { isMuted: 'yes' } } as any,
      res,
      next,
    );
    await flushAsyncHandler();

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 400,
      message: '`isMuted` must be a boolean',
    }));
  });

  it('returns media for an accessible conversation', async () => {
    replaceMethod(
      prisma.conversation,
      'findFirst',
      async () =>
        buildConversation({
          mediaItems: [
            { position: 2, url: 'https://cdn.example.com/second.png' },
            { position: 1, url: 'https://cdn.example.com/first.png' },
          ],
        }) as any,
    );

    const res = createMockResponse();
    const next = jest.fn();

    conversationsController.getMedia(
      { authUser, params: { conversationId: 'conv-1' } } as any,
      res,
      next,
    );
    await flushAsyncHandler();

    expect(next).not.toHaveBeenCalled();
    expect(res.body.data).toEqual([
      'https://cdn.example.com/first.png',
      'https://cdn.example.com/second.png',
    ]);
  });

  it('lists users and flags existing members', async () => {
    replaceMethod(
      prisma.conversation,
      'findFirst',
      async () => ({ participants: [{ userId: authUser.id }, { userId: otherUser.id }] }) as any,
    );
    replaceMethod(prisma.user, 'findMany', async () => [otherUser] as any);

    const res = createMockResponse();
    const next = jest.fn();

    conversationsController.listUsers(
      { authUser, query: { search: '@sam', conversationId: 'conv-1' } } as any,
      res,
      next,
    );
    await flushAsyncHandler();

    expect(next).not.toHaveBeenCalled();
    expect(res.body.data).toEqual([
      expect.objectContaining({ id: otherUser.id, isMember: true }),
    ]);
  });

  it('adds a participant to a group conversation', async () => {
    replaceMethod(
      prisma.conversation,
      'findFirst',
      async () =>
        buildConversation({
          type: ConversationType.group,
          name: 'Design Team',
          participants: [{ userId: authUser.id }, { userId: 'user-3' }],
        }) as any,
    );
    replaceMethod(prisma.user, 'findUnique', async () => otherUser as any);
    replaceMethod(prisma.conversationParticipant, 'create', async () => ({}) as any);
    replaceMethod(prisma.conversationParticipant, 'count', async () => 3 as any);
    replaceMethod(
      prisma.conversation,
      'update',
      async () =>
        buildConversation({
          type: ConversationType.group,
          name: 'Design Team',
          role: '3 participants',
          participants: [
            { userId: authUser.id, user: authUser },
            { userId: 'user-3', user: { ...otherUser, id: 'user-3', username: 'lee' } },
            { userId: otherUser.id, user: otherUser },
          ],
        }) as any,
    );

    const res = createMockResponse();
    const next = jest.fn();

    conversationsController.addParticipant(
      { authUser, params: { conversationId: 'conv-1' }, body: { userId: otherUser.id } } as any,
      res,
      next,
    );
    await flushAsyncHandler();

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body.message).toBe('Sam Carter added to Design Team');
  });

  it('creates or reuses direct and group conversations', async () => {
    replaceMethod(prisma.user, 'findUnique', async () => otherUser as any);
    replaceMethod(prisma.conversation, 'findMany', async () => [] as any);
    replaceMethod(prisma.conversation, 'create', async (args: any) => {
      if (args.data.type === ConversationType.direct) {
        return buildConversation() as any;
      }

      return buildConversation({
        id: 'conv-2',
        type: ConversationType.group,
        name: 'Product Squad',
        groupInitials: ['P', 'S'],
        groupGradients: [['#ef5350', '#e91e8c'], ['#7e57c2', '#5c6bc0']],
        role: '3 participants',
        email: 'product.squad@vox.chat',
        location: 'Workspace',
      }) as any;
    });
    replaceMethod(prisma.user, 'findMany', async () => [otherUser] as any);

    const directRes = createMockResponse();
    const directNext = jest.fn();

    conversationsController.createConversation(
      { authUser, body: { type: 'direct', userId: otherUser.id } } as any,
      directRes,
      directNext,
    );
    await flushAsyncHandler();

    expect(directNext).not.toHaveBeenCalled();
    expect(directRes.status).toHaveBeenCalledWith(201);
    expect(directRes.body.message).toBe('Started chat with Sam Carter');

    const existingRes = createMockResponse();
    const existingNext = jest.fn();
    replaceMethod(prisma.conversation, 'findMany', async () => [buildConversation()] as any);

    conversationsController.createConversation(
      { authUser, body: { type: 'direct', userId: otherUser.id } } as any,
      existingRes,
      existingNext,
    );
    await flushAsyncHandler();

    expect(existingNext).not.toHaveBeenCalled();
    expect(existingRes.body.message).toBe('Opened chat with Sam Carter');

    const groupRes = createMockResponse();
    const groupNext = jest.fn();

    conversationsController.createConversation(
      {
        authUser,
        body: { type: 'group', name: 'Product Squad', participantIds: [otherUser.id] },
      } as any,
      groupRes,
      groupNext,
    );
    await flushAsyncHandler();

    expect(groupNext).not.toHaveBeenCalled();
    expect(groupRes.status).toHaveBeenCalledWith(201);
    expect(groupRes.body.message).toBe('Product Squad created');
  });
});
