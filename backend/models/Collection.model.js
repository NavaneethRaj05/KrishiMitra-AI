import mongoose from 'mongoose';

const CollectionSchema = new mongoose.Schema({
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  queries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Query' }]
}, { timestamps: true });

export default mongoose.model('Collection', CollectionSchema);
