import { prisma } from '../src/lib/prisma.js';
import { createMessageForUser } from '../src/services/message.service.js';
import { updateTypingForUser } from '../src/services/typing.service.js';
import {
  mapCall,
  mapConversationForUser,
  mapMessage,
  mapTypingState,
  mapUser,
} from '../src/utils/chatMapper.js';
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

describe('message.service extra coverage', () => {
  it('rejects invalid message kinds', async () => {
    await expect(
      createMessageForUser(user, {
        conversationId: 'conv-1',
        kind: 'video' as any,
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: '`kind` must be text, image, or file',
    } satisfies Partial<HttpError>);
  });

  it('rejects image messages without a URL', async () => {
    await expect(
      createMessageForUser(user, {
        conversationId: 'conv-1',
        kind: 'image',
        image: '   ',
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Image URL is required',
    } satisfies Partial<HttpError>);
  });

  it('rejects file messages without name and size', async () => {
    await expect(
      createMessageForUser(user, {
        conversationId: 'conv-1',
        kind: 'file',
        fileName: '',
        fileSize: '',
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'File name is required',
    } satisfies Partial<HttpError>);
  });

  it('rejects messages for missing conversations', async () => {
    replaceMethod(prisma.conversation, 'findFirst', async () => null as any);

    await expect(
      createMessageForUser(user, {
        conversationId: 'conv-404',
        kind: 'text',
        text: 'Hello',
      }),
    ).rejects.toMatchObject({
      status: 404,
      message: 'Conversation not found',
    } satisfies Partial<HttpError>);
  });

  it('rejects reply targets outside the conversation', async () => {
    replaceMethod(prisma.conversation, 'findFirst', async () => ({ id: 'conv-1' } as any));
    replaceMethod(prisma.message, 'findFirst', async () => null as any);

    await expect(
      createMessageForUser(user, {
        conversationId: 'conv-1',
        kind: 'text',
        text: 'Reply',
        replyToMessageId: 'missing-message',
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Reply target was not found in this conversation',
    } satisfies Partial<HttpError>);
  });

  it('uses file names for conversation previews', async () => {
    let updateArgs: any;

    replaceMethod(prisma.conversation, 'findFirst', async () => ({ id: 'conv-1' } as any));
    replaceMethod(prisma.conversationMedia, 'count', async () => 0);
    replaceMethod(prisma.message, 'create', async () => ({
      id: 'msg-file',
      conversationId: 'conv-1',
      kind: 'file',
      sender: 'self',
      senderUserId: user.id,
      senderName: user.name,
      senderInitials: user.initials,
      text: null,
      image: null,
      caption: null,
      fileName: 'roadmap.pdf',
      fileSize: '2 MB',
      replyTo: null,
      time: '11:00 AM',
      status: '✓',
      reactions: [],
    } as any));
    replaceMethod(prisma.conversation, 'update', async (args: any) => {
      updateArgs = args;
      return {} as any;
    });

    await createMessageForUser(user, {
      conversationId: 'conv-1',
      kind: 'file',
      fileName: ' roadmap.pdf ',
      fileSize: ' 2 MB ',
    });

    expect(updateArgs.data.preview).toBe('roadmap.pdf');
  });
});

describe('typing and mapping helpers', () => {
  it('throws when typing is updated for a missing conversation', async () => {
    replaceMethod(prisma.conversation, 'findFirst', async () => null as any);

    await expect(updateTypingForUser(user, 'conv-404', false)).rejects.toMatchObject({
      status: 404,
      message: 'Conversation not found',
    } satisfies Partial<HttpError>);
  });

  it('maps nullable users, typing states, and calls', () => {
    expect(mapUser(null)).toBeNull();
    expect(mapTypingState(null)).toEqual({
      isTyping: false,
      userId: null,
      name: null,
      updatedAt: null,
    });
    expect(mapCall({
      isActive: true,
      startedAt: new Date('2026-03-24T06:30:00.000Z'),
      endedAt: null,
      startedById: 'user-2',
      mode: 'voice',
    })).toEqual({
      isActive: true,
      startedAt: '2026-03-24T06:30:00.000Z',
      endedAt: null,
      startedBy: 'user-2',
      mode: 'voice',
    });
  });

  it('falls back to conversation values when no direct-chat peer is found', () => {
    const mapped = mapConversationForUser({
      id: 'conv-1',
      type: 'direct',
      name: 'Fallback',
      initials: 'FB',
      gradient: ['#111', '#222'],
      groupInitials: null,
      groupGradients: null,
      status: 'offline',
      preview: 'Preview',
      time: 'now',
      unread: 0,
      role: 'Member',
      email: 'fallback@example.com',
      location: 'fallback',
      mediaItems: [],
      isMuted: false,
      participants: [],
    }, 'user-1');

    expect(mapped.name).toBe('Fallback');
    expect(mapped.location).toBe('fallback');
    expect(mapped.gradient).toEqual(['#111', '#222']);
  });

  it('derives sender from senderName when sender ids are unavailable', () => {
    expect(
      mapMessage(
        {
          id: 'msg-1',
          kind: 'text',
          sender: 'other',
          senderUserId: null,
          senderName: 'Self User',
          senderInitials: 'SU',
          text: 'Hello',
          image: null,
          caption: null,
          fileName: null,
          fileSize: null,
          time: '1:00 PM',
          status: '✓',
          replyTo: null,
          reactions: [],
        },
        { name: 'Self User' },
      ).sender,
    ).toBe('self');
  });
});
