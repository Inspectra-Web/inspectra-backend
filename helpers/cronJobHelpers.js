import nodeCron from 'node-cron';
import { expireOldSubscriptions, expireUserPlans } from '../controller/subscriptionController.js';

export const startSubscriptionCron = () => {
  nodeCron.schedule('0 0 * * *', async () => {
    console.log('🕒 Running daily subscription expiration job...');
    try {
      await expireOldSubscriptions();
      await expireUserPlans();
    } catch (err) {
      console.error('❌ Error in subscription cron job:', err);
    }
  });
};
