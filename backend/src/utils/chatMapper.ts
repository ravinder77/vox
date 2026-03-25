export function mapUser(user: any) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username,
    initials: user.initials,
    role: user.role,
    status: user.status,
  };
}

export function mapConversation(conversation: any) {
  const participants = (conversation.participants || [])
    .map((participant: any) => mapUser(participant.user))
    .filter(Boolean);

  return {
    id: conversation.id,
    type: conversation.type,
    name: conversation.name,
    initials: conversation.initials,
    gradient: conversation.gradient,
    groupInitials: conversation.groupInitials,
    groupGradients: conversation.groupGradients,
    status: conversation.status,
    preview: conversation.preview,
    time: conversation.time,
    unread: conversation.unread,
    role: conversation.role,
    email: conversation.email,
    location: conversation.location,
    media: (conversation.mediaItems || [])
      .slice()
      .sort((a: any, b: any) => a.position - b.position)
      .map((item: any) => item.url),
    isMuted: conversation.isMuted,
    participants,
    participantCount: participants.length,
  };
}

export function mapConversationForUser(conversation: any, currentUserId?: string | null) {
  const participants = (conversation.participants || [])
    .map((participant: any) => mapUser(participant.user))
    .filter(Boolean);

  const otherParticipant =
    conversation.type === 'direct'
      ? participants.find((participant: any) => participant.id !== currentUserId) || participants[0] || null
      : null;
  const fallbackGradient = conversation.gradient || ['#4fc3f7', '#6c63ff'];

  return {
    id: conversation.id,
    type: conversation.type,
    name: otherParticipant?.name || conversation.name,
    initials: otherParticipant?.initials || conversation.initials,
    gradient: fallbackGradient,
    groupInitials: conversation.groupInitials,
    groupGradients: conversation.groupGradients,
    status: otherParticipant?.status || conversation.status,
    preview: conversation.preview,
    time: conversation.time,
    unread: conversation.unread,
    role: otherParticipant?.role || conversation.role,
    email: otherParticipant?.email || conversation.email,
    location: otherParticipant ? `@${otherParticipant.username}` : conversation.location,
    media: (conversation.mediaItems || [])
      .slice()
      .sort((a: any, b: any) => a.position - b.position)
      .map((item: any) => item.url),
    isMuted: conversation.isMuted,
    participants,
    participantCount: participants.length,
  };
}

export function mapMessage(message: any, currentUser?: any) {
  const currentUserId = typeof currentUser === 'string' ? currentUser : currentUser?.id || null;
  const currentUserName = typeof currentUser === 'string' ? null : currentUser?.name || null;
  let derivedSender = message.sender;

  if (message.senderUserId && currentUserId) {
    derivedSender = message.senderUserId === currentUserId ? 'self' : 'other';
  } else if (message.senderName && currentUserName) {
    derivedSender = message.senderName === currentUserName ? 'self' : 'other';
  }

  return {
    id: message.id,
    kind: message.kind,
    sender: derivedSender,
    senderUserId: message.senderUserId || null,
    senderName: message.senderName || null,
    senderInitials: message.senderInitials || null,
    text: message.text,
    image: message.image,
    caption: message.caption,
    fileName: message.fileName,
    fileSize: message.fileSize,
    time: message.time,
    status: message.status,
    replyToMessageId: message.replyTo,
    reactions: (message.reactions || []).map((reaction: any) => ({
      emoji: reaction.emoji,
      count: reaction.count,
    })),
  };
}

export function mapTypingState(typingState: any) {
  return {
    isTyping: Boolean(typingState?.isTyping),
    userId: typingState?.userId || null,
    name: typingState?.name || null,
    updatedAt: typingState?.updatedAt?.toISOString?.() || null,
  };
}

export function mapCall(call: any) {
  return {
    isActive: Boolean(call?.isActive),
    startedAt: call?.startedAt?.toISOString?.() || null,
    endedAt: call?.endedAt?.toISOString?.() || null,
    startedBy: call?.startedById || null,
    mode: call?.mode || null,
  };
}
