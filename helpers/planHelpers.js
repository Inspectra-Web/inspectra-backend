import Subscription from '../model/subscriptionModel.js';
import User from '../model/userModel.js';

export const canCreateListing = async (userId, type = 'normal') => {
  const user = await User.findById(userId);

  if (!user) return { allowed: false, message: 'User not found' };

  if (user.role === 'admin') return { allowed: true };

  const subscription = await Subscription.findOne({
    user: userId,
    subscriptionStatus: 'active',
    paymentStatus: 'successful',
    subscriptionEndDate: { $gte: new Date() },
  }).populate('plan');

  if (!subscription) return { allowed: false, message: 'No active subscription found' };

  if (subscription.hasLifeTimeAccess) return { allowed: true, subscription };

  const { listingsUsed, featuredListingUsed } = subscription.usage;
  const { maxListings, featuredListings } = subscription.plan.features;

  if (type === 'featured') {
    if (featuredListingUsed >= featuredListings)
      return { allowed: false, message: 'Featured Listing limit reached. Upgrade your plan.' };
  }

  if (listingsUsed >= maxListings)
    return { allowed: false, message: 'Listing limit reached. Upgrade your plan.' };

  return { allowed: true, subscription };
};
