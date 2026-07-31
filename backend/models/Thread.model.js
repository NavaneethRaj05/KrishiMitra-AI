import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  role:       { type: String, enum: ['user', 'assistant'], required: true },
  content:    { type: String, required: true },
  citations:  { type: String, default: '[]' },  // JSON stringified
  followUps:  { type: String, default: '[]' },  // JSON stringified
  intent:     String,
  imageUri:   String,
  offlineFallback: { type: Boolean, default: false },
}, { timestamps: true });

const ThreadSchema = new mongoose.Schema({
  farmer:       { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },
  clientId:     { type: String, index: true },  // WatermelonDB id from device
  title:        { type: String, required: true, maxlength: 120 },
  intent:       { type: String, default: 'general_agri' },
  season:       { type: String, default: 'Kharif' },
  messages:     [MessageSchema],
  messageCount: { type: Number, default: 0 },
  isBookmarked: { type: Boolean, default: false },
  syncedAt:     Date,
}, { timestamps: true });

// Auto-update messageCount
ThreadSchema.pre('save', function (next) {
  this.messageCount = this.messages ? this.messages.length : 0;
  next();
});

export default mongoose.model('Thread', ThreadSchema);
