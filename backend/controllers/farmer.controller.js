import Farmer from '../models/Farmer.model.js';
import CropJournal from '../models/CropJournal.model.js';

export const getProfile = async (req, res, next) => {
  try {
    const farmer = await Farmer.findById(req.farmer.id);
    res.json({ success: true, data: farmer });
  } catch (err) { next(err); }
};

export const updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'location', 'language', 'farmSize', 'preferredCrops', 'soilType', 'irrigationType', 'landAcres', 'sowingDates', 'avatar'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    // Handle nested location updates
    if (req.body.block) {
      updates['location.block'] = req.body.block;
    }

    const farmer = await Farmer.findByIdAndUpdate(req.farmer.id, updates, {
      new: true, runValidators: true,
    });
    res.json({ success: true, data: farmer });
  } catch (err) { next(err); }
};

export const onboard = async (req, res, next) => {
  try {
    const { name, location, language, farmSize, preferredCrops, soilType, irrigationType, landAcres, sowingDates } = req.body;

    const updates = {
      ...(name && { name }),
      ...(location && { location }),
      ...(language && { language }),
      ...(farmSize && { farmSize }),
      ...(preferredCrops && { preferredCrops }),
      ...(soilType && { soilType }),
      ...(irrigationType && { irrigationType }),
      ...(landAcres && { landAcres }),
      ...(sowingDates && { sowingDates }),
      onboardedAt: new Date(),
    };

    const farmer = await Farmer.findByIdAndUpdate(req.farmer.id, updates, {
      new: true, runValidators: true, upsert: false,
    });

    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    res.json({ success: true, data: farmer, onboarded: true });
  } catch (err) { next(err); }
};

export const getJournal = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page  || '1');
    const limit = parseInt(req.query.limit || '20');
    const skip  = (page - 1) * limit;

    const query = { farmer: req.farmer.id };
    if (req.query.type) {
      if (req.query.type === 'rag' || req.query.type === 'queries') {
        query.entryType = 'rag_query';
      } else if (req.query.type === 'disease' || req.query.type === 'diseases') {
        query.entryType = 'disease_detection';
      } else if (req.query.type === 'crop' || req.query.type === 'crops') {
        query.entryType = 'crop_recommendation';
      } else if (req.query.type !== 'all') {
        query.entryType = req.query.type;
      }
    }

    const entries = await CropJournal.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await CropJournal.countDocuments(query);
    res.json({ success: true, data: entries, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

export const addJournalEntry = async (req, res, next) => {
  try {
    const entry = await CropJournal.create({ ...req.body, farmer: req.farmer.id });
    res.status(201).json({ success: true, data: entry });
  } catch (err) { next(err); }
};

/* ── Push subscription storage ── */
export const savePushSubscription = async (req, res, next) => {
  try {
    await Farmer.findByIdAndUpdate(req.farmer.id, {
      pushSubscription: req.body,
    });
    res.json({ success: true, message: 'Push subscription saved' });
  } catch (err) { next(err); }
};

export const deletePushSubscription = async (req, res, next) => {
  try {
    await Farmer.findByIdAndUpdate(req.farmer.id, {
      $unset: { pushSubscription: 1 },
    });
    res.json({ success: true, message: 'Push subscription removed' });
  } catch (err) { next(err); }
};
