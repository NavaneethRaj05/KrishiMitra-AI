import Farmer from '../models/Farmer.model.js';

export const attachUserProfile = async (req, res, next) => {
  try {
    // req.farmer is set by the auth middleware (protect)
    const farmerId = req.farmer?.id;
    if (!farmerId) {
      // Allow unauthenticated requests in demo mode with a default profile
      req.userProfile = {
        name: 'Demo Farmer',
        preferredLanguage: 'english'
      };
      return next();
    }

    try {
      const farmer = await Farmer.findById(farmerId).select('name language location preferredCrops');
      if (farmer) {
        const languageMap = {
          'en': 'english',
          'kn': 'kannada',
          'hi': 'hindi',
          'ta': 'tamil',
          'te': 'telugu',
          'mr': 'marathi'
        };

        req.userProfile = {
          name: farmer.name,
          preferredLanguage: languageMap[farmer.language] || farmer.language || 'english',
          district: farmer.location?.district || 'Hassan',
          state: farmer.location?.state || 'Karnataka',
          country: farmer.location?.country || 'India',
          crop: (farmer.preferredCrops && farmer.preferredCrops[0]) || 'Tomato'
        };
        return next();
      }
    } catch (dbErr) {
      console.warn('⚠️ Could not fetch farmer from DB:', dbErr.message);
    }

    // Farmer not found in DB — use demo default instead of returning 404
    req.userProfile = {
      name: 'Farmer',
      preferredLanguage: 'english'
    };
    next();
  } catch (err) {
    // Never block the request — always fall through with defaults
    req.userProfile = {
      name: 'Farmer',
      preferredLanguage: 'english'
    };
    next();
  }
};
