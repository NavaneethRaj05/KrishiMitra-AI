import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const FarmerSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  phone:    { type: String, unique: true, sparse: true },
  email:    { type: String, unique: true, sparse: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  location: {
    village:  String,
    district: { type: String },
    state:    { type: String },
    country:  { type: String, default: '' },
    block:    String,
    lat:      Number,
    lng:      Number,
  },
  language:       { type: String, enum: ['en', 'kn', 'hi', 'ta', 'te'], default: 'en' },
  farmSize:       Number,   // acres
  preferredCrops: [String],
  soilType:       { type: String, default: 'Black Soil' },
  irrigationType: { type: String, default: 'Rainfed' },
  landAcres:      { type: Number, default: 2.0 },
  sowingDates:    { type: Map, of: String },  // { "paddy": "2026-05-01", ... }
  onboardedAt:    Date,
  avatar:         { type: String, default: '👨‍🌾' },
}, { timestamps: true });

// Hash password before save
FarmerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

FarmerSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Never return password in JSON
FarmerSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model('Farmer', FarmerSchema);
