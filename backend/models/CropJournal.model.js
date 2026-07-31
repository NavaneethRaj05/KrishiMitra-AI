import mongoose from 'mongoose';

const CropJournalSchema = new mongoose.Schema({
  farmer:    { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
  entryType: {
    type: String,
    enum: ['rag_query', 'disease_detection', 'crop_recommendation'],
    required: true,
  },
  input:    { type: mongoose.Schema.Types.Mixed },  // query text or soil data
  output:   { type: mongoose.Schema.Types.Mixed },  // AI response or prediction
  sources:  [{ title: String, excerpt: String, score: Number }],
  imageUrl: String,
  language: { type: String, default: 'en' },
  location: { lat: Number, lng: Number },
}, { timestamps: true });

// Fast reverse-chronological queries per farmer
CropJournalSchema.index({ farmer: 1, createdAt: -1 });
CropJournalSchema.index({ entryType: 1 });

export default mongoose.model('CropJournal', CropJournalSchema);
