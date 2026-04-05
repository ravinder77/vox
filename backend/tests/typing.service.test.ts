import { updateTypingForUser } from '../src/services/typing.service.js';
import { prisma } from '../src/lib/prisma.js';
import { HttpError } from '../src/utils/httpError.js';
import { replaceMethod, restoreMethods } from './helpers/replaceMethod.js';

afterEach(() => {
  restoreMethods();
});

const user = {
  id: 'user-2',
  email: 'other@example.com',
  name: 'Other User',
  username: 'other',
  initials: 'OU',
  role: 'Designer',
  status: 'online' as const,
  passwordHash: 'hash',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('typing.service', () => {
  it('rejects non-boolean typing values', async () => {
    await expect(
      updateTypingForUser(user, 'conv-1', 'yes' as unknown as boolean),
    ).rejects.toMatchObject({
      status: 400,
      message: '`isTyping` must be a boolean',
    } satisfies Partial<HttpError>);
  });

  it('writes the active typing state for the user', async () => {
    let upsertArgs: any;

    replaceMethod(prisma.conversation, 'findFirst', async () => ({ id: 'conv-1' } as any));
    replaceMethod(prisma.typingState, 'upsert', async (args: any) => {
      upsertArgs = args;
      return {
        conversationId: 'conv-1',
        isTyping: true,
        userId: user.id,
        name: user.name,
      } as any;
    });

    const typingState = await updateTypingForUser(user, 'conv-1', true);

    expect(typingState.userId).toBe(user.id);
    expect(upsertArgs).toEqual({
      where: { conversationId: 'conv-1' },
      update: {
        isTyping: true,
        userId: user.id,
        name: user.name,
      },
      create: {
        conversationId: 'conv-1',
        isTyping: true,
        userId: user.id,
        name: user.name,
      },
    });
  });
});
