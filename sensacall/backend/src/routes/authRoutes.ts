import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes
router.post('/register', authRateLimiter, (req, res) => authController.register(req, res));
router.post('/login', authRateLimiter, (req, res) => authController.login(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.post('/refresh', (req, res) => authController.refreshToken(req, res));

export default router;