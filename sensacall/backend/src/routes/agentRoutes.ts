import { Router } from 'express';
import { agentController } from '../controllers/agentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', (req, res) => agentController.listAgents(req, res));
router.get('/recommended', (req, res) => agentController.getRecommendedAgents(req, res));
router.get('/:id', (req, res) => agentController.getAgent(req, res));

export default router;