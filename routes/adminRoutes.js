import { Router } from 'express';
import { getStatistics } from '../controller/adminController.js';
import { protect } from '../controller/authController.js';

const adminRoute = Router();

adminRoute.route('/stats').get(protect, getStatistics);

export default adminRoute;
