import { Router } from 'express';
import {
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  signup,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireCsrf } from '../middleware/requireCsrf.js';

const router = Router();

router.post('/login', login);
router.post('/signup', signup);
router.post('/forgot-password', forgotPassword);
router.get('/me', requireAuth, getCurrentUser);
router.post('/logout', requireAuth, requireCsrf, logout);

export default router;
