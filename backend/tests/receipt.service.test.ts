import { prisma } from '../src/lib/prisma.js';
import { markMessageDeliveredForUser } from '../src/services/receipt.service.js';
import { HttpError } from '../src/utils/httpError.js';
import { replaceMethod, restoreMethods } from './helpers/replaceMethod.js';

afterEach(() => {
  restoreMethods();
});

const user = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'User',
  username: 'user',
  initials: 'U',
  role: 'Member',
  status: 'online' as const,
  passwordHash: 'hash',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('receipt.service', () => {
  it('throws when the message is missing', async () => {
    replaceMethod(prisma.message, 'findFirst', async () => null as any);

    await expect(markMessageDeliveredForUser(user, 'msg-1')).rejects.toMatchObject({
      status: 404,
      message: 'Message not found',
    } satisfies Partial<HttpError>);
  });

  it('does not update messages sent by the current user', async () => {
    const message = {
      id: 'msg-1',
      senderUserId: user.id,
      status: '✓',
      reactions: [],
    };

    replaceMethod(prisma.message, 'findFirst', async () => message as any);

    await expect(markMessageDeliveredForUser(user, 'msg-1')).resolves.toBe(message);
  });

  it('does not update messages already marked delivered', async () => {
    const message = {
      id: 'msg-2',
      senderUserId: 'user-2',
      status: '✓✓',
      reactions: [],
    };

    replaceMethod(prisma.message, 'findFirst', async () => message as any);

    await expect(markMessageDeliveredForUser(user, 'msg-2')).resolves.toBe(message);
  });

  it('marks other-user messages as delivered', async () => {
    let updateArgs: any;

    replaceMethod(prisma.message, 'findFirst', async () => ({
      id: 'msg-3',
      senderUserId: 'user-2',
      status: '✓',
      reactions: [],
    } as any));
    replaceMethod(prisma.message, 'update', async (args: any) => {
      updateArgs = args;
      return {
        id: 'msg-3',
        senderUserId: 'user-2',
        status: '✓✓',
        reactions: [],
      } as any;
    });

    const updated = await markMessageDeliveredForUser(user, 'msg-3');

    expect(updated.status).toBe('✓✓');
    expect(updateArgs).toEqual({
      where: { id: 'msg-3' },
      data: { status: '✓✓' },
      include: { reactions: true },
    });
  });
});
