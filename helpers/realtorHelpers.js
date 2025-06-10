import Profile from '../model/profileModel.js';

export const realtorStats = () => {
  return Profile.aggregate([
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
        totalRealtors: { $arrayElemAt: ['$totalRealtors.count', 0] },
        verifiedRealtors: { $arrayElemAt: ['$verifiedRealtors.count', 0] },
        notVerifiedRealtors: { $arrayElemAt: ['$notVerifiedRealtors.count', 0] },
        maleRealtors: { $arrayElemAt: ['$maleRealtors.count', 0] },
        femaleRealtors: { $arrayElemAt: ['$femaleRealtors.count', 0] },
      },
    },
  ]);
};
