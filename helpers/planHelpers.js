import Subscription from '../model/subscriptionModel.js';
import User from '../model/userModel.js';

export const canCreateListing = async (userId, type = 'normal') => {
  const user = await User.findById(userId);

  if (!user) return { allowed: false, message: 'User not found' };

  if (user.role === 'admin') return { allowed: true };

  const subscription = await Subscription.findOne({
    user: userId,
    paymentStatus: 'successful',
  }).populate('plan');

  if (!subscription) return { allowed: false, message: 'No subscription found' };

  if (
    subscription?.hasLifeTimeAccess ||
    (subscription.subscriptionStatus === 'active' && subscription.subscriptionEndDate >= new Date())
  ) {
    const { listingsUsed, featuredListingUsed } = subscription.usage;
    const { maxListings, featuredListings } = subscription.plan.features;

    if (type === 'featured') {
      if (featuredListingUsed >= featuredListings)
        return { allowed: false, message: 'Featured Listing limit reached. Upgrade your plan.' };
    }

    if (listingsUsed >= maxListings)
      return { allowed: false, message: 'Listing limit reached. Upgrade your plan.' };

    return { allowed: true, subscription };
  }

  return { allowed: false, message: 'No active subscription found' };
};
