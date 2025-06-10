import Subscription from '../model/subscriptionModel.js';

export const subscriptionStats = () => {
  return Subscription.aggregate([
    {
      $facet: {
        totalRevenue: [
          { $match: { paymentStatus: 'successful' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ],

        subscriptionsByPlan: [
          { $group: { _id: '$planName', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],

        subscriptionsByInterval: [{ $group: { _id: '$interval', count: { $sum: 1 } } }],

        subscriptionsByStatus: [{ $group: { _id: '$subscriptionStatus', count: { $sum: 1 } } }],

        monthlyRevenue: [
          {
            $match: {
              paymentStatus: 'successful',
              subscriptionStartDate: {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1),
              },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: '$subscriptionStartDate' },
                month: { $month: '$subscriptionStartDate' },
              },
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ],
      },
    },
  ]);
};
