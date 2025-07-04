import { Router } from 'express';
import {
  createChatRoom,
  getClientChatRooms,
  getGuestUser,
  getRealtorChatRooms,
} from '../controller/chatRoomController.js';
import { protect, restrictTo } from '../controller/authController.js';

const router = Router();

router.route('/realtor-chat').get(protect, restrictTo('realtor', 'admin'), getRealtorChatRooms);
router.route('/client-chat').get(protect, getClientChatRooms);
router.route('/create-chat').post(createChatRoom);
router.route('/guest/:guestId').get(getGuestUser);
export default router;
