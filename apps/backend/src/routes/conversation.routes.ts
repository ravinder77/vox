import { Router } from 'express';
import {
  addParticipant,
  createConversation,
  getBootstrap,
  getConversation,
  getMedia,
  listConversations,
  listUsers,
  markConversationRead,
  updateNotifications,
} from '../controllers/conversations.controller.js';
import {
  addReaction,
  createMessage,
  listMessages,
  removeReaction,
} from '../controllers/messages.controller.js';
import {
  endCall,
  getCall,
  getTyping,
  startCall,
  updateTyping,
} from '../controllers/realtime.controller.js';

const router = Router();

router.get('/bootstrap', getBootstrap);
router.get('/users', listUsers);
router.get('/conversations', listConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:conversationId', getConversation);
router.post('/conversations/:conversationId/read', markConversationRead);
router.patch('/conversations/:conversationId/notifications', updateNotifications);
router.get('/conversations/:conversationId/media', getMedia);
router.post('/conversations/:conversationId/participants', addParticipant);

router.get('/conversations/:conversationId/messages', listMessages);
router.post('/conversations/:conversationId/messages', createMessage);
router.post('/conversations/:conversationId/messages/:messageId/reactions', addReaction);
router.delete('/conversations/:conversationId/messages/:messageId/reactions', removeReaction);

router.post('/conversations/:conversationId/typing', updateTyping);
router.get('/conversations/:conversationId/typing', getTyping);

router.post('/conversations/:conversationId/call/start', startCall);
router.post('/conversations/:conversationId/call/end', endCall);
router.get('/conversations/:conversationId/call', getCall);

export default router;
