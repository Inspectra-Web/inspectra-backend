import { Router } from 'express';
import {
  createChatRoom,
  getGuestChatRooms,
  getGuestUser,
  getRealtorChatRooms,
} from '../controller/chatRoomController.js';
import { authenticateGuestUser, protect, restrictTo } from '../controller/authController.js';

const router = Router();

router.route('/realtor-chat').get(protect, restrictTo('realtor'), getRealtorChatRooms);
router.route('/guest/:token').get(authenticateGuestUser, getGuestChatRooms);
router.route('/create-chat').post(createChatRoom);
router.route('/guest/:guestId').get(getGuestUser);
export default router;
