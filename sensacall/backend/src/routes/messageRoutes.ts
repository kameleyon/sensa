import { Router } from 'express';
import { messageController } from '../controllers/messageController';
import { authenticateToken } from '../middleware/auth';
import { checkDailyLimit } from '../middleware/usageTracker';
import { messageRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/send', [checkDailyLimit, messageRateLimiter], (req: any, res: any) => 
  messageController.sendMessage(req, res)
);
router.get('/conversation/:conversation_id', (req, res) => 
  messageController.getMessageHistory(req, res)
);
router.delete('/:id', (req, res) => 
  messageController.deleteMessage(req, res)
);

export default router;