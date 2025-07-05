import Profile from '../model/profileModel.js';

export const realtorStats = () => {
  return Profile.aggregate([
    { $match: { role: 'realtor' } },
    {
      $facet: {
        totalRealtors: [{ $count: 'count' }],
        verifiedRealtors: [{ $match: { verified: true } }, { $count: 'count' }],
        notVerifiedRealtors: [{ $match: { verified: false } }, { $count: 'count' }],
        maleRealtors: [{ $match: { gender: 'male' } }, { $count: 'count' }],
        femaleRealtors: [{ $match: { gender: 'female' } }, { $count: 'count' }],
      },
    },
    {
      $project: {
        totalRealtors: { $ifNull: [{ $arrayElemAt: ['$totalRealtors.count', 0] }, 0] },
        verifiedRealtors: { $ifNull: [{ $arrayElemAt: ['$verifiedRealtors.count', 0] }, 0] },
        notVerifiedRealtors: { $ifNull: [{ $arrayElemAt: ['$notVerifiedRealtors.count', 0] }, 0] },
        maleRealtors: { $ifNull: [{ $arrayElemAt: ['$maleRealtors.count', 0] }, 0] },
        femaleRealtors: { $ifNull: [{ $arrayElemAt: ['$femaleRealtors.count', 0] }, 0] },
      },
    },
  ]);
};
