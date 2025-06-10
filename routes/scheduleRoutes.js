import { Router } from 'express';
import {
  getInspectionSchedules,
  getInspectionSchedulesForRealtor,
  sendInspectionSchedule,
} from '../controller/scheduleController.js';
import { protect, restrictTo } from '../controller/authController.js';

const router = Router();

router.route('/schedule-inspection').post(sendInspectionSchedule);
router.route('/realtor-schedule-list').get(protect, getInspectionSchedulesForRealtor);
router.route('/inspections').get(protect, restrictTo('admin'), getInspectionSchedules);

export default router;
