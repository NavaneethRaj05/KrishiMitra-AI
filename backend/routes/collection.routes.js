import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import Collection from '../models/Collection.model.js';
import Query from '../models/Query.model.js';

const router = Router();

router.use(protect); // protect all collections endpoints

const DEFAULT_COLLECTIONS = [
  { name: 'Rice Farming', description: 'Everything about rice cultivation, pest management, and watering.' },
  { name: 'Tomato Diseases', description: 'Identifying, treating, and preventing blight, mold, and spot in tomato crops.' },
  { name: 'Organic Farming', description: 'Biofertilizers, organic pest control, and sustainable practices.' },
  { name: 'Government Schemes', description: 'Information regarding subsidies, loans, and agricultural policies.' }
];

// GET: Retrieve all collections for the logged-in farmer
router.get('/', async (req, res, next) => {
  try {
    let collections = await Collection.find({ farmer: req.farmer.id }).populate('queries');
    
    // Auto-seed default collections if none exist for this farmer
    if (collections.length === 0) {
      const seeded = DEFAULT_COLLECTIONS.map(c => ({
        ...c,
        farmer: req.farmer.id,
        queries: []
      }));
      await Collection.insertMany(seeded);
      collections = await Collection.find({ farmer: req.farmer.id }).populate('queries');
    }
    
    res.json({ success: true, data: collections });
  } catch (err) {
    next(err);
  }
});

// POST: Create a new custom collection
router.post('/', async (req, res, next) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Collection name is required' });
  }
  try {
    const col = await Collection.create({
      farmer: req.farmer.id,
      name,
      description,
      queries: []
    });
    res.json({ success: true, data: col });
  } catch (err) {
    next(err);
  }
});

// POST: Add a new query or existing query to a collection
router.post('/:id/query', async (req, res, next) => {
  const { queryId, question, answer, sources, model } = req.body;
  
  try {
    const collection = await Collection.findOne({ _id: req.params.id, farmer: req.farmer.id });
    if (!collection) {
      return res.status(404).json({ success: false, error: 'Collection not found' });
    }

    let targetQueryId = queryId;

    // If query details are passed instead of queryId, create a new query record first
    if (!targetQueryId && question) {
      const newQuery = await Query.create({
        farmer: req.farmer.id,
        question,
        answer,
        sources,
        model: model || 'llama3.1'
      });
      targetQueryId = newQuery._id;
    }

    if (!targetQueryId) {
      return res.status(400).json({ success: false, error: 'Query ID or query data is required' });
    }

    // Add query to collection if not already present
    if (!collection.queries.includes(targetQueryId)) {
      collection.queries.push(targetQueryId);
      await collection.save();
    }

    const updatedCol = await Collection.findById(collection._id).populate('queries');
    res.json({ success: true, data: updatedCol });
  } catch (err) {
    next(err);
  }
});

export default router;
