import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/profile', (req, res) => userController.getProfile(req, res));
router.patch('/profile', (req, res) => userController.updateProfile(req, res));
router.get('/preferences', (req, res) => userController.getPreferences(req, res));
router.patch('/preferences', (req, res) => userController.updatePreferences(req, res));
router.get('/usage', (req, res) => userController.getUsageStats(req, res));
router.get('/subscription-history', (req, res) => userController.getSubscriptionHistory(req, res));

export default router;