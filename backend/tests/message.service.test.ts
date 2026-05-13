import { createMessageForUser } from '../src/services/message.service.js';
import { prisma } from '../src/lib/prisma.js';
import { HttpError } from '../src/utils/httpError.js';
import { replaceMethod, restoreMethods } from './helpers/replaceMethod.js';

afterEach(() => {
  restoreMethods();
});

const user = {
  id: 'user-1',
  email: 'self@example.com',
  name: 'Self User',
  username: 'self',
  initials: 'SU',
  role: 'Engineer',
  status: 'online' as const,
  passwordHash: 'hash',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('message.service', () => {
  it('rejects empty text messages', async () => {
    await expect(
      createMessageForUser(user, {
        conversationId: 'conv-1',
        kind: 'text',
        text: '   ',
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Text message content is required',
    } satisfies Partial<HttpError>);
  });

  it('trims content and updates conversation preview/time', async () => {
    let createArgs: any;
    let updateArgs: any;

    replaceMethod(prisma.conversation, 'findFirst', async () => ({ id: 'conv-1' } as any));
    replaceMethod(prisma.conversationMedia, 'count', async () => 0);
    replaceMethod(prisma.message, 'create', async (args: any) => {
      createArgs = args;
      return {
        id: 'msg-1',
        conversationId: 'conv-1',
        kind: 'text',
        sender: 'self',
        senderUserId: user.id,
        senderName: user.name,
        senderInitials: user.initials,
        text: 'Hello there',
        image: null,
        caption: null,
        fileName: null,
        fileSize: null,
        replyTo: null,
        time: '9:41 AM',
        status: '✓',
        reactions: [],
      } as any;
    });
    replaceMethod(prisma.conversation, 'update', async (args: any) => {
      updateArgs = args;
      return {} as any;
    });

    const message = await createMessageForUser(user, {
      conversationId: 'conv-1',
      kind: 'text',
      text: '  Hello there  ',
    });

    expect(message.text).toBe('Hello there');
    expect(createArgs.data.text).toBe('Hello there');
    expect(createArgs.data.status).toBe('✓');
    expect(updateArgs.data.preview).toBe('Hello there');
    expect(updateArgs.data.time).toBe('9:41 AM');
  });

  it('creates conversation media for image messages', async () => {
    let mediaCreateArgs: any;

    replaceMethod(prisma.conversation, 'findFirst', async () => ({ id: 'conv-1' } as any));
    replaceMethod(prisma.conversationMedia, 'count', async () => 4);
    replaceMethod(prisma.message, 'create', async () => ({
      id: 'msg-2',
      conversationId: 'conv-1',
      kind: 'image',
      sender: 'self',
      senderUserId: user.id,
      senderName: user.name,
      senderInitials: user.initials,
      text: null,
      image: 'https://cdn.example.com/image.png',
      caption: 'Screenshot',
      fileName: null,
      fileSize: null,
      replyTo: null,
      time: '10:15 AM',
      status: '✓',
      reactions: [],
    } as any));
    replaceMethod(prisma.conversation, 'update', async () => ({} as any));
    replaceMethod(prisma.conversationMedia, 'create', async (args: any) => {
      mediaCreateArgs = args;
      return {} as any;
    });

    await createMessageForUser(user, {
      conversationId: 'conv-1',
      kind: 'image',
      image: 'https://cdn.example.com/image.png',
      caption: 'Screenshot',
    });

    expect(mediaCreateArgs).toEqual({
      data: {
        conversationId: 'conv-1',
        url: 'https://cdn.example.com/image.png',
        position: 4,
      },
    });
  });
});
