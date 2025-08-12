import { Router } from 'express';
import { conversationController } from '../controllers/conversationController';
import { authenticateToken } from '../middleware/auth';
import { checkDailyLimit } from '../middleware/usageTracker';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/', checkDailyLimit, (req, res) => conversationController.createConversation(req, res));
router.get('/', (req, res) => conversationController.listConversations(req, res));
router.get('/:id', (req, res) => conversationController.getConversation(req, res));
router.patch('/:id/archive', (req, res) => conversationController.archiveConversation(req, res));
router.delete('/:id', (req, res) => conversationController.deleteConversation(req, res));

export default router;