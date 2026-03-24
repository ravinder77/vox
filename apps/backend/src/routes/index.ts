import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireCsrf } from '../middleware/requireCsrf.js';
import authRoutes from './auth.routes.js';
import conversationRoutes from './conversation.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/', requireAuth, requireCsrf, conversationRoutes);

export default router;
