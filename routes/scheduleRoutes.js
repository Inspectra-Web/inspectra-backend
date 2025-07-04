import { Router } from 'express';
import {
  getInspectionSchedules,
  getInspectionSchedulesForClient,
  getInspectionSchedulesForRealtor,
  sendInspectionSchedule,
} from '../controller/scheduleController.js';
import { protect, restrictTo } from '../controller/authController.js';

const router = Router();

router.route('/schedule-inspection').post(protect, sendInspectionSchedule);
router.route('/realtor-schedule-list').get(protect, getInspectionSchedulesForRealtor);
router.route('/client-schedule-list').get(protect, getInspectionSchedulesForClient);
router.route('/inspections').get(protect, restrictTo('admin'), getInspectionSchedules);

export default router;
