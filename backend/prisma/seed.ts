import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });
const primaryUserPassphrase = process.env.SEED_PRIMARY_USER_PASSPHRASE || 'LocalDemoLogin01';
const demoUserPassphrase = process.env.SEED_DEMO_USER_PASSPHRASE || 'LocalDemoLogin02';

const users = [
  {
    id: '1',
    email: 'you@vox.io',
    passphrase: primaryUserPassphrase,
    name: 'Alex Rivera',
    username: 'alex_r',
    initials: 'AR',
    role: 'Product Lead',
    status: 'online',
  },
  {
    id: '2',
    email: 'demo@vox.io',
    passphrase: demoUserPassphrase,
    name: 'Demo User',
    username: 'demo_user',
    initials: 'DU',
    role: 'Demo Workspace',
    status: 'online',
  },
];

const conversations = [
  {
    id: 'aria',
    participantIds: ['1', '2'],
    type: 'direct',
    name: 'Aria Chen',
    initials: 'AC',
    gradient: ['#4fc3f7', '#6c63ff'],
    status: 'online',
    preview: "haha yeah let's do it 🎉",
    time: '2m',
    unread: 0,
    role: 'Senior Designer',
    email: 'aria@studio.io',
    location: 'San Francisco, CA',
    media: [
      'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=100&h=100&fit=crop',
    ],
    isMuted: false,
  },
  {
    id: 'design-team',
    participantIds: ['1', '2'],
    type: 'group',
    name: 'Design Team',
    initials: 'DT',
    groupInitials: ['D', 'T'],
    groupGradients: [
      ['#f06292', '#ff8a65'],
      ['#6c63ff', '#4fc3f7'],
    ],
    status: 'online',
    preview: 'Mia: check the new mockups',
    time: '15m',
    unread: 3,
    role: '8 participants',
    email: 'design@vox.team',
    location: 'Distributed',
    media: [],
    isMuted: false,
  },
  {
    id: 'soren',
    participantIds: ['1', '2'],
    type: 'direct',
    name: 'Soren Voss',
    initials: 'SV',
    gradient: ['#66bb6a', '#26a69a'],
    status: 'away',
    preview: 'You: sounds good 👌',
    time: '1h',
    unread: 0,
    role: 'Engineering Manager',
    email: 'soren@vox.team',
    location: 'Berlin, DE',
    media: [],
    isMuted: false,
  },
  {
    id: 'product-hub',
    participantIds: ['1', '2'],
    type: 'group',
    name: 'Product Hub',
    initials: 'PH',
    groupInitials: ['P', 'H'],
    groupGradients: [
      ['#ffa726', '#ff7043'],
      ['#ab47bc', '#7e57c2'],
    ],
    status: 'online',
    preview: 'Sprint planning at 3pm',
    time: '2h',
    unread: 7,
    role: '12 participants',
    email: 'product@vox.team',
    location: 'New York, NY',
    media: [],
    isMuted: true,
  },
  {
    id: 'nina',
    participantIds: ['1', '2'],
    type: 'direct',
    name: 'Nina Okafor',
    initials: 'NO',
    gradient: ['#ef5350', '#e91e8c'],
    status: 'offline',
    preview: 'Can you review this?',
    time: 'Tue',
    unread: 0,
    role: 'Growth Strategist',
    email: 'nina@vox.team',
    location: 'Lagos, NG',
    media: [],
    isMuted: false,
  },
  {
    id: 'kenji',
    participantIds: ['1', '2'],
    type: 'direct',
    name: 'Kenji Park',
    initials: 'KP',
    gradient: ['#26c6da', '#42a5f5'],
    status: 'online',
    preview: 'The API is now live ✅',
    time: 'Mon',
    unread: 0,
    role: 'Platform Engineer',
    email: 'kenji@vox.team',
    location: 'Seoul, KR',
    media: [],
    isMuted: false,
  },
  {
    id: 'dev-ops',
    participantIds: ['1', '2'],
    type: 'group',
    name: 'Dev Ops',
    initials: 'DO',
    groupInitials: ['D', 'O'],
    groupGradients: [
      ['#7e57c2', '#5c6bc0'],
      ['#26a69a', '#42a5f5'],
    ],
    status: 'away',
    preview: 'Deployment scheduled',
    time: 'Sun',
    unread: 0,
    role: '6 participants',
    email: 'ops@vox.team',
    location: 'Austin, TX',
    media: [],
    isMuted: false,
  },
];

const messages = {
  aria: [
    {
      id: 'm1',
      kind: 'text',
      sender: 'other',
      senderUserId: 'aria',
      senderName: 'Aria Chen',
      senderInitials: 'AC',
      text: 'Hey, did you see the new design mockups that Mia shared earlier?',
      time: '10:32 AM',
      reactions: [{ emoji: '👀', count: 2 }],
    },
    {
      id: 'm2',
      kind: 'text',
      sender: 'self',
      senderUserId: '1',
      senderName: 'Alex Rivera',
      senderInitials: 'AR',
      text: 'Yeah just checked them out, they look absolutely 🔥 The color palette is on point',
      time: '10:34 AM',
      status: '✓✓',
    },
    {
      id: 'm3',
      kind: 'image',
      sender: 'other',
      senderUserId: 'aria',
      senderName: 'Aria Chen',
      senderInitials: 'AC',
      image: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&h=200&fit=crop',
      time: '10:35 AM',
    },
    {
      id: 'm4',
      kind: 'file',
      sender: 'other',
      senderUserId: 'aria',
      senderName: 'Aria Chen',
      senderInitials: 'AC',
      fileName: 'Brand Guidelines v3.pdf',
      fileSize: '2.4 MB • PDF',
      time: '10:36 AM',
    },
    {
      id: 'm5',
      kind: 'text',
      sender: 'self',
      senderUserId: '1',
      senderName: 'Alex Rivera',
      senderInitials: 'AR',
      text: 'Downloading the PDF now. Should we schedule a review call for Thursday?',
      time: '10:38 AM',
      status: '✓✓',
      reactions: [
        { emoji: '👍', count: 1 },
        { emoji: '🎉', count: 1 },
      ],
    },
    {
      id: 'm6',
      kind: 'text',
      sender: 'other',
      senderUserId: 'aria',
      senderName: 'Aria Chen',
      senderInitials: 'AC',
      text: "Thursday works! I'll send a calendar invite 📅",
      time: '10:40 AM',
    },
    {
      id: 'm7',
      kind: 'text',
      sender: 'self',
      senderUserId: '1',
      senderName: 'Alex Rivera',
      senderInitials: 'AR',
      text: "haha yeah let's do it 🎉",
      time: '10:41 AM',
      status: '✓✓',
    },
  ],
  'design-team': [],
  soren: [],
  'product-hub': [],
  nina: [],
  kenji: [],
  'dev-ops': [],
};

async function main() {
  await prisma.messageReaction.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationMedia.deleteMany();
  await prisma.typingState.deleteMany();
  await prisma.conversationCall.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.user.deleteMany();

  for (const user of users) {
    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        passwordHash: await bcrypt.hash(user.passphrase, 10),
        name: user.name,
        username: user.username,
        initials: user.initials,
        role: user.role,
        status: user.status,
      },
    });
  }

  for (const conversation of conversations) {
    await prisma.conversation.create({
      data: {
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        initials: conversation.initials,
        gradient: conversation.gradient ?? null,
        groupInitials: conversation.groupInitials ?? null,
        groupGradients: conversation.groupGradients ?? null,
        status: conversation.status,
        preview: conversation.preview,
        time: conversation.time,
        unread: conversation.unread,
        role: conversation.role,
        email: conversation.email,
        location: conversation.location,
        isMuted: conversation.isMuted,
        participants: {
          create: conversation.participantIds.map((userId) => ({
            userId,
          })),
        },
        mediaItems: {
          create: conversation.media.map((url, index) => ({
            url,
            position: index,
          })),
        },
      },
    });

    for (const message of messages[conversation.id] || []) {
      await prisma.message.create({
        data: {
          id: message.id,
          conversationId: conversation.id,
          kind: message.kind,
          sender: message.sender,
          senderUserId: message.senderUserId ?? null,
          senderName: message.senderName ?? null,
          senderInitials: message.senderInitials ?? null,
          text: message.text ?? null,
          image: message.image ?? null,
          caption: message.caption ?? null,
          fileName: message.fileName ?? null,
          fileSize: message.fileSize ?? null,
          time: message.time,
          status: message.status ?? null,
          replyTo: message.replyTo ?? null,
          reactions: {
            create: (message.reactions || []).map((reaction) => ({
              emoji: reaction.emoji,
              count: reaction.count,
            })),
          },
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
