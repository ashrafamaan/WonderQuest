const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mode: {
    type: String,
    required: true,
    enum: ['general', 'math', 'science', 'story']
  },
  messages: [{
    role: { type: String, required: true }, // 'user' or 'model'
    parts: [{ text: String }]
  }]
});

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
