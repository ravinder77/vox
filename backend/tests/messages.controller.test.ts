import { jest } from '@jest/globals';
import * as messagesController from '../src/controllers/messages.controller.js';
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

const mappedMessage = {
  id: 'msg-1',
  conversationId: 'conv-1',
  kind: 'text',
  senderUserId: authUser.id,
  senderName: authUser.name,
  senderInitials: authUser.initials,
  text: 'Hello',
  image: null,
  caption: null,
  fileName: null,
  fileSize: null,
  time: '9:41 AM',
  status: '✓',
  replyTo: null,
  reactions: [],
};

afterEach(() => {
  restoreMethods();
  jest.restoreAllMocks();
});

describe('messages controller', () => {
  it('lists messages for an accessible conversation', async () => {
    replaceMethod(prisma.conversation, 'findFirst', async () => ({ id: 'conv-1' }) as any);
    replaceMethod(prisma.message, 'findMany', async () => [mappedMessage] as any);

    const res = createMockResponse();
    const next = jest.fn();

    messagesController.listMessages(
      { authUser, params: { conversationId: 'conv-1' } } as any,
      res,
      next,
    );
    await flushAsyncHandler();

    expect(next).not.toHaveBeenCalled();
    expect(res.body).toEqual({
      success: true,
      data: [expect.objectContaining({ id: 'msg-1', sender: 'self' })],
    });
  });

  it('rejects listing messages for a missing conversation', async () => {
    replaceMethod(prisma.conversation, 'findFirst', async () => null as any);

    const res = createMockResponse();
    const next = jest.fn();

    messagesController.listMessages(
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

  it('creates a message and emits conversation and message updates', async () => {
    replaceMethod(prisma.conversation, 'findFirst', async () => ({ id: 'conv-1' }) as any);
    replaceMethod(prisma.conversationMedia, 'count', async () => 0 as any);
    replaceMethod(prisma.message, 'create', async () => mappedMessage as any);
    replaceMethod(prisma.conversation, 'update', async () => ({}) as any);

    const res = createMockResponse();
    const next = jest.fn();

    messagesController.createMessage(
      {
        authUser,
        params: { conversationId: 'conv-1' },
        body: { kind: 'text', text: 'Hello' },
      } as any,
      res,
      next,
    );
    await flushAsyncHandler();

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Message sent',
      data: { id: 'msg-1' },
    });
  });

  it('adds a reaction and emits an update when the message exists', async () => {
    replaceMethod(prisma.message, 'findFirst', async () => ({ id: 'msg-1' }) as any);
    replaceMethod(prisma.messageReaction, 'upsert', async () => ({}) as any);
    replaceMethod(
      prisma.message,
      'findUnique',
      async () => ({ ...mappedMessage, reactions: [{ emoji: '🔥', count: 1 }] }) as any,
    );

    const res = createMockResponse();
    const next = jest.fn();

    messagesController.addReaction(
      {
        authUser,
        params: { conversationId: 'conv-1', messageId: 'msg-1' },
        body: { emoji: ' 🔥 ' },
      } as any,
      res,
      next,
    );
    await flushAsyncHandler();

    expect(next).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({
      success: true,
      message: 'Reaction added',
      data: { reactions: [{ emoji: '🔥', count: 1 }] },
    });
  });

  it('rejects adding a reaction without an emoji', async () => {
    const res = createMockResponse();
    const next = jest.fn();

    messagesController.addReaction(
      {
        authUser,
        params: { conversationId: 'conv-1', messageId: 'msg-1' },
        body: {},
      } as any,
      res,
      next,
    );
    await flushAsyncHandler();

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 400,
      message: 'Emoji is required',
    }));
  });

  it('removes a reaction by deleting or decrementing counts', async () => {
    replaceMethod(
      prisma.message,
      'findFirst',
      async () =>
        ({
          id: 'msg-1',
          reactions: [{ id: 'reaction-1', emoji: '🔥', count: 1 }],
        }) as any,
    );
    replaceMethod(prisma.messageReaction, 'delete', async () => ({}) as any);
    replaceMethod(
      prisma.message,
      'findUnique',
      async () => ({ ...mappedMessage, reactions: [] }) as any,
    );

    const res = createMockResponse();
    const next = jest.fn();

    messagesController.removeReaction(
      {
        authUser,
        params: { conversationId: 'conv-1', messageId: 'msg-1' },
        query: { emoji: '🔥' },
      } as any,
      res,
      next,
    );
    await flushAsyncHandler();

    expect(next).not.toHaveBeenCalled();
    expect(res.body.message).toBe('Reaction removed');

    replaceMethod(
      prisma.message,
      'findFirst',
      async () =>
        ({
          id: 'msg-1',
          reactions: [{ id: 'reaction-2', emoji: '🔥', count: 3 }],
        }) as any,
    );
    replaceMethod(prisma.messageReaction, 'update', async () => ({}) as any);

    const resTwo = createMockResponse();
    const nextTwo = jest.fn();

    messagesController.removeReaction(
      {
        authUser,
        params: { conversationId: 'conv-1', messageId: 'msg-1' },
        query: { emoji: '🔥' },
      } as any,
      resTwo,
      nextTwo,
    );
    await flushAsyncHandler();

    expect(nextTwo).not.toHaveBeenCalled();
    expect(resTwo.body.message).toBe('Reaction removed');
  });

  it('rejects reaction removal without an emoji query param', async () => {
    const res = createMockResponse();
    const next = jest.fn();

    messagesController.removeReaction(
      {
        authUser,
        params: { conversationId: 'conv-1', messageId: 'msg-1' },
        query: {},
      } as any,
      res,
      next,
    );
    await flushAsyncHandler();

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 400,
      message: 'Query param `emoji` is required',
    }));
  });
});
