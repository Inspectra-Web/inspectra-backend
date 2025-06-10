import { Router } from 'express';
import {
  getMessagesForChatRoom,
  markMessagesAsSeen,
  sendMessage,
} from '../controller/messageController.js';

const router = Router();

router.route('/').post(sendMessage);
router.route('/chat-room-messages/:chatroomId').get(getMessagesForChatRoom);
router.route('/mark-as-seen').patch(markMessagesAsSeen);

export default router;
