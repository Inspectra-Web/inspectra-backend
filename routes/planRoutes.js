import { Router } from 'express';
import { createPlan, getPlans } from '../controller/planController.js';

const router = Router();

router.route('/create-plan').post(createPlan);
router.route('/').get(getPlans);
export default router;
