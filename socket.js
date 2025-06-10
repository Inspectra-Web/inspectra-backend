import { Server } from 'socket.io';
import Message from './model/messageModel.js';
import { saveMessage } from './helpers/sendMessageHelper.js';
import { envConfig } from './configuration/environmentConfig.js';

export const initSocket = httpServer => {
  const io = new Server(httpServer, {
    cors: { origin: envConfig.CLIENT_URL, credentials: true },
  });

  const onlineUsers = new Map();

  io.on('connection', socket => {
    console.log('🟢 Socket is connected to: ', socket.id);

    // Join Chat Room
    socket.on('join_room', ({ chatroomId, userId }) => {
      console.log(`${userId} Joined room: ${chatroomId}`);
      socket.join(chatroomId);
    });

    // Send a message
    socket.on('new_message', async (messageData, callback) => {
      try {
        console.log('New message received: ', messageData);
        const savedMessage = await saveMessage(messageData);
        // Emit to the users in the chatroom
        socket.to(messageData.chatroom).emit('receive_message', savedMessage);
        if (callback) callback(savedMessage);
      } catch (error) {
        console.error('Error saving message: ', error);
        if (callback) callback({ error: error.message });
      }
    });

    // Mark as message
    socket.on('mark_as_seen', async ({ chatroomId, userId }) => {
      try {
        await Message.updateMany(
          {
            chatroom: chatroomId,
            sender: { $ne: userId },
            seen: false,
          },
          { $set: { seen: true } }
        );

        socket.to(chatroomId).emit('messages_seen', { chatroomId, seenBy: userId });
      } catch (error) {
        console.error('Error Marking Messages as Seen: ', error);
      }
    });

    // Online Users
    socket.on('user_online', userId => {
      console.log(userId);
      onlineUsers.set(userId, socket.id);
      io.emit('update_online_users', Array.from(onlineUsers.keys()));
    });

    // Typing Notification
    socket.on('typing', ({ chatroomId, user }) => socket.to(chatroomId).emit('typing', { user }));

    // Stop typing notification
    socket.on('stop_typing', ({ chatroomId, user }) =>
      socket.to(chatroomId).emit('stop_typing', { user })
    );

    socket.on('disconnect', () => {
      onlineUsers.forEach((value, key) => {
        if (value === socket.id) {
          onlineUsers.delete(key);
          io.emit('update_online_users', Array.from(onlineUsers.keys()));
        }
      });
      console.log('Socket disconnected: ', socket.id);
    });
  });
};
