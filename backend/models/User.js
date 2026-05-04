const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    // Not strictly required so the legacy 'guest' account doesn't break
  },
  points: {
    type: Number,
    default: 0
  },
  badges: {
    type: [String],
    default: []
  },
  settings: {
    aiProvider: { type: String, default: 'gemini' },
    ollamaModel: { type: String, default: 'llama3' }
  },
  stats: {
    general: { type: Number, default: 0 },
    math: { type: Number, default: 0 },
    science: { type: Number, default: 0 },
    story: { type: Number, default: 0 }
  }
});

module.exports = mongoose.model('User', userSchema);
