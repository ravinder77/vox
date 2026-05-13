import { jest } from '@jest/globals';
import * as realtimeController from '../src/controllers/realtime.controller.js';
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

afterEach(() => {
  restoreMethods();
  jest.restoreAllMocks();
});

describe('realtime controller', () => {
  it('updates typing state and emits realtime updates', async () => {
    replaceMethod(prisma.conversation, 'findFirst', async () => ({ id: 'conv-1' }) as any);
    replaceMethod(
      prisma.typingState,
      'upsert',
      async () =>
        ({
          conversationId: 'conv-1',
          isTyping: true,
          userId: authUser.id,
          name: authUser.name,
          updatedAt: new Date('2026-04-08T09:45:00.000Z'),
        }) as any,
    );

    const res = createMockResponse();
    const next = jest.fn();

    realtimeController.updateTyping(
      { authUser, params: { conversationId: 'conv-1' }, body: { isTyping: true } } as any,
      res,
      next,
    );
    await flushAsyncHandler();

    expect(next).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({
      success: true,
      message: 'Typing started',
      data: { isTyping: true, userId: authUser.id },
    });
  });

  it('gets typing state for an accessible conversation', async () => {
    replaceMethod(prisma.conversation, 'findFirst', async () => ({ id: 'conv-1' }) as any);
    replaceMethod(
      prisma.typingState,
      'findUnique',
      async () =>
        ({
          conversationId: 'conv-1',
          isTyping: false,
          userId: authUser.id,
          name: authUser.name,
          updatedAt: new Date('2026-04-08T09:45:00.000Z'),
        }) as any,
    );

    const res = createMockResponse();
    const next = jest.fn();

    realtimeController.getTyping(
      { authUser, params: { conversationId: 'conv-1' } } as any,
      res,
      next,
    );
    await flushAsyncHandler();

    expect(next).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({
      success: true,
      data: { isTyping: false, userId: authUser.id },
    });
  });

  it('starts and ends calls and emits call updates', async () => {
    replaceMethod(prisma.conversation, 'findFirst', async () => ({ id: 'conv-1' }) as any);
    replaceMethod(
      prisma.conversationCall,
      'upsert',
      async (args: any) =>
        ({
          conversationId: 'conv-1',
          isActive: args.update?.isActive ?? args.create?.isActive,
          startedAt: new Date('2026-04-08T09:50:00.000Z'),
          endedAt: args.update?.endedAt ?? null,
          startedById: authUser.id,
          mode: args.update?.mode ?? args.create?.mode ?? 'voice',
        }) as any,
    );

    const startRes = createMockResponse();
    const startNext = jest.fn();

    realtimeController.startCall(
      { authUser, params: { conversationId: 'conv-1' }, body: { mode: 'video' } } as any,
      startRes,
      startNext,
    );
    await flushAsyncHandler();

    expect(startNext).not.toHaveBeenCalled();
    expect(startRes.status).toHaveBeenCalledWith(201);
    expect(startRes.body).toMatchObject({
      success: true,
      message: 'Call connected',
      data: { isActive: true, mode: 'video' },
    });

    const endRes = createMockResponse();
    const endNext = jest.fn();

    realtimeController.endCall(
      { authUser, params: { conversationId: 'conv-1' } } as any,
      endRes,
      endNext,
    );
    await flushAsyncHandler();

    expect(endNext).not.toHaveBeenCalled();
    expect(endRes.body).toMatchObject({
      success: true,
      message: 'Call ended',
      data: { isActive: false },
    });
  });

  it('rejects invalid call modes', async () => {
    const res = createMockResponse();
    const next = jest.fn();

    realtimeController.startCall(
      { authUser, params: { conversationId: 'conv-1' }, body: { mode: 'screen' } } as any,
      res,
      next,
    );
    await flushAsyncHandler();

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 400,
      message: '`mode` must be voice or video',
    }));
  });

  it('gets the current call state and surfaces missing conversations', async () => {
    replaceMethod(prisma.conversation, 'findFirst', async () => ({ id: 'conv-1' }) as any);
    replaceMethod(
      prisma.conversationCall,
      'findUnique',
      async () =>
        ({
          conversationId: 'conv-1',
          isActive: true,
          startedAt: new Date('2026-04-08T10:00:00.000Z'),
          endedAt: null,
          startedById: authUser.id,
          mode: 'voice',
        }) as any,
    );

    const res = createMockResponse();
    const next = jest.fn();

    realtimeController.getCall(
      { authUser, params: { conversationId: 'conv-1' } } as any,
      res,
      next,
    );
    await flushAsyncHandler();

    expect(next).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({
      success: true,
      data: { isActive: true, mode: 'voice' },
    });

    replaceMethod(prisma.conversation, 'findFirst', async () => null as any);
    const missingRes = createMockResponse();
    const missingNext = jest.fn();

    realtimeController.getCall(
      { authUser, params: { conversationId: 'missing' } } as any,
      missingRes,
      missingNext,
    );
    await flushAsyncHandler();

    expect(missingNext).toHaveBeenCalledWith(expect.objectContaining({
      status: 404,
      message: 'Conversation not found',
    }));
  });
});
