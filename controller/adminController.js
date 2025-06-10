import { inquiryStats, propertyStats, scheduleStats } from '../helpers/propertyHelpers.js';
import { realtorStats } from '../helpers/realtorHelpers.js';
import { subscriptionStats } from '../helpers/subscriptionHelpers.js';
import catchAsync from '../utils/catchAsync.js';

export const getStatistics = catchAsync(async (req, res, next) => {
  const [
    propertyStatistics,
    realtorStatistics,
    inquiryStatistics,
    scheduleStatistics,
    subscriptionStatistics,
  ] = await Promise.all([
    propertyStats(),
    realtorStats(),
    inquiryStats(),
    scheduleStats(),
    subscriptionStats(),
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      propertyStats: propertyStatistics[0],
      realtorStats: realtorStatistics[0],
      inquiryStats: inquiryStatistics[0],
      scheduleStats: scheduleStatistics[0],
      subscriptionStats: subscriptionStatistics[0],
    },
  });
});
