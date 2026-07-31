import mongoose from 'mongoose';

const SyncQueueSchema = new mongoose.Schema({
  farmer:    { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer' },
  method:    { type: String, enum: ['post', 'put', 'patch', 'delete'], required: true },
  endpoint:  { type: String, required: true },
  data:      mongoose.Schema.Types.Mixed,
  status:    { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending' },
  attempts:  { type: Number, default: 0 },
  clientId:  String,  // UUID generated on client
}, { timestamps: true });

export default mongoose.model('SyncQueue', SyncQueueSchema);
