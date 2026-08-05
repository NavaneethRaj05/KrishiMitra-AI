import { Router } from 'express';
import SyncQueue from '../models/SyncQueue.model.js';
import Thread from '../models/Thread.model.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);

/** Receive a batch of offline-queued actions from the client */
router.post('/flush', async (req, res, next) => {
  try {
    const { actions = [] } = req.body;
    const results = await Promise.allSettled(
      actions.map((action) =>
        SyncQueue.create({ ...action, farmer: req.farmer.id, status: 'pending' })
      )
    );
    const saved = results.filter((r) => r.status === 'fulfilled').length;
    res.json({ success: true, data: { saved, total: actions.length } });
  } catch (err) {
    next(err);
  }
});

/** Batch upsert threads with messages from device */
router.post('/threads/batch', async (req, res, next) => {
  try {
    const { threads = [] } = req.body;
    const results = [];

    for (const threadData of threads) {
      const { client_id, title, intent, season, messages = [], is_bookmarked } = threadData;

      // Upsert by clientId
      let existingThread = await Thread.findOne({ clientId: client_id, farmer: req.farmer.id });

      if (existingThread) {
        // Merge messages: add any new messages that don't exist by timestamp
        const existingTimestamps = new Set(
          existingThread.messages.map(m => m.createdAt?.toISOString())
        );

        const newMessages = messages.filter(m => !existingTimestamps.has(m.created_at));
        if (newMessages.length > 0) {
          existingThread.messages.push(...newMessages.map(m => ({
            role: m.role,
            content: m.content,
            citations: m.citations || '[]',
            followUps: m.follow_ups || '[]',
            intent: m.intent,
            imageUri: m.image_uri,
            offlineFallback: m.offline_fallback || false,
          })));
          existingThread.syncedAt = new Date();
          if (is_bookmarked !== undefined) existingThread.isBookmarked = is_bookmarked;
          await existingThread.save();
        }
        results.push({ client_id, action: 'updated', server_id: existingThread._id });
      } else {
        // Create new
        const newThread = await Thread.create({
          farmer: req.farmer.id,
          clientId: client_id,
          title: title || 'Untitled',
          intent: intent || 'general_agri',
          season: season || 'Kharif',
          isBookmarked: is_bookmarked || false,
          syncedAt: new Date(),
          messages: (messages || []).map(m => ({
            role: m.role,
            content: m.content,
            citations: m.citations || '[]',
            followUps: m.follow_ups || '[]',
            intent: m.intent,
            imageUri: m.image_uri,
            offlineFallback: m.offline_fallback || false,
          })),
        });
        results.push({ client_id, action: 'created', server_id: newThread._id });
      }
    }

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

/** Pull threads from server for device restore / new device login */
router.get('/threads', async (req, res, next) => {
  try {
    const { since } = req.query; // ISO timestamp — only fetch threads updated after this

    // Guard: req.farmer.id may be undefined when using x-internal-key without farmer_id
    const farmerId = req.farmer?.id
    if (!farmerId || farmerId === 'undefined') {
      return res.json({ success: true, data: [] });
    }

    const query = { farmer: farmerId };

    if (since) {
      query.updatedAt = { $gt: new Date(since) };
    }

    const threads = await Thread.find(query)
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, data: threads });
  } catch (err) {
    next(err);
  }
});

export default router;
