import mongoose from 'mongoose';

const QuerySchema = new mongoose.Schema({
  farmer:   { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer' },
  question: { type: String, required: true },
  answer:   String,
  language: { type: String, default: 'en' },
  sources:  [{ title: String, score: Number }],
  model:    String,
}, { timestamps: true });

export default mongoose.model('Query', QuerySchema);
