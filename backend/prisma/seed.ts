import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';

const password = process.env.SEED_PASSWORD || 'Password123!';

const users = [
  {
    id: 'user-demo-ravi',
    email: 'ravi@example.com',
    name: 'Ravi Sharma',
    username: 'ravi',
    initials: 'RS',
    role: 'Product Lead',
    status: 'online' as const,
  },
  {
    id: 'user-demo-anika',
    email: 'anika@example.com',
    name: 'Anika Rao',
    username: 'anika',
    initials: 'AR',
    role: 'Designer',
    status: 'away' as const,
  },
  {
    id: 'user-demo-dev',
    email: 'dev@example.com',
    name: 'Dev Patel',
    username: 'dev',
    initials: 'DP',
    role: 'Engineer',
    status: 'offline' as const,
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(password, 10);

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        name: user.name,
        username: user.username,
        initials: user.initials,
        role: user.role,
        status: user.status,
      },
      create: {
        ...user,
        passwordHash,
      },
    });
  }

  await prisma.conversation.upsert({
    where: { id: 'conv-demo-direct' },
    update: {
      preview: 'Can you review the latest build?',
      time: '10:42',
      unread: 1,
    },
    create: {
      id: 'conv-demo-direct',
      type: 'direct',
      name: 'Anika Rao',
      initials: 'AR',
      gradient: ['#4fc3f7', '#6c63ff'],
      status: 'away',
      preview: 'Can you review the latest build?',
      time: '10:42',
      unread: 1,
      role: 'Designer',
      email: 'anika@example.com',
      location: '@anika',
    },
  });

  await prisma.conversation.upsert({
    where: { id: 'conv-demo-team' },
    update: {
      preview: 'Deployment checklist is ready.',
      time: '09:15',
      unread: 0,
    },
    create: {
      id: 'conv-demo-team',
      type: 'group',
      name: 'Launch Team',
      initials: 'LT',
      gradient: ['#66bb6a', '#26a69a'],
      groupInitials: ['L', 'T'],
      groupGradients: [
        ['#66bb6a', '#26a69a'],
        ['#4fc3f7', '#6c63ff'],
      ],
      status: 'online',
      preview: 'Deployment checklist is ready.',
      time: '09:15',
      unread: 0,
      role: 'Project group',
      email: 'launch-team@example.com',
      location: '3 members',
    },
  });

  const memberships = [
    ['conv-demo-direct', 'user-demo-ravi'],
    ['conv-demo-direct', 'user-demo-anika'],
    ['conv-demo-team', 'user-demo-ravi'],
    ['conv-demo-team', 'user-demo-anika'],
    ['conv-demo-team', 'user-demo-dev'],
  ] as const;

  for (const [conversationId, userId] of memberships) {
    await prisma.conversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      update: {},
      create: {
        conversationId,
        userId,
      },
    });
  }

  await prisma.message.upsert({
    where: { id: 'msg-demo-direct-1' },
    update: {},
    create: {
      id: 'msg-demo-direct-1',
      conversationId: 'conv-demo-direct',
      kind: 'text',
      sender: 'other',
      senderUserId: 'user-demo-anika',
      senderName: 'Anika Rao',
      senderInitials: 'AR',
      text: 'Can you review the latest build?',
      time: '10:42',
      status: 'sent',
    },
  });

  await prisma.message.upsert({
    where: { id: 'msg-demo-team-1' },
    update: {},
    create: {
      id: 'msg-demo-team-1',
      conversationId: 'conv-demo-team',
      kind: 'text',
      sender: 'self',
      senderUserId: 'user-demo-ravi',
      senderName: 'Ravi Sharma',
      senderInitials: 'RS',
      text: 'Deployment checklist is ready.',
      time: '09:15',
      status: 'sent',
    },
  });

  await prisma.conversationMedia.upsert({
    where: { id: 'media-demo-team-1' },
    update: {
      url: 'https://images.unsplash.com/photo-1551434678-e076c223a692',
      position: 0,
    },
    create: {
      id: 'media-demo-team-1',
      conversationId: 'conv-demo-team',
      url: 'https://images.unsplash.com/photo-1551434678-e076c223a692',
      position: 0,
    },
  });

  await prisma.typingState.upsert({
    where: { conversationId: 'conv-demo-direct' },
    update: {
      isTyping: false,
      userId: 'user-demo-anika',
      name: 'Anika',
    },
    create: {
      conversationId: 'conv-demo-direct',
      isTyping: false,
      userId: 'user-demo-anika',
      name: 'Anika',
    },
  });

  await prisma.conversationCall.upsert({
    where: { conversationId: 'conv-demo-team' },
    update: {
      isActive: false,
      startedById: null,
      mode: null,
    },
    create: {
      conversationId: 'conv-demo-team',
      isActive: false,
    },
  });

  console.log(`Seeded ${users.length} demo users. Password: ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
