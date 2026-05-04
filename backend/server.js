require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

const User = require('./models/User');
const ChatHistory = require('./models/ChatHistory');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ error: 'Username already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ username, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    res.json({ token, user: { username: user.username, points: user.points, badges: user.badges } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    if (user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });
    } else if (username !== 'guest') {
       return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    res.json({ token, user: { username: user.username, points: user.points, badges: user.badges } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/guest', async (req, res) => {
  try {
    let user = await User.findOne({ username: 'guest' });
    if (!user) {
      user = await User.create({ username: 'guest' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    res.json({ token, user: { username: user.username, points: user.points, badges: user.badges } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Protect all following /api routes
app.use('/api', authMiddleware);

// Routes
app.get('/api/progress', async (req, res) => {
  res.json({ points: req.user.points, badges: req.user.badges, settings: req.user.settings, stats: req.user.stats });
});

app.post('/api/progress', async (req, res) => {
  const { points, badges, settings, stats } = req.body;
  if (points !== undefined) req.user.points = points;
  if (badges !== undefined) req.user.badges = badges;
  if (settings !== undefined) req.user.settings = settings;
  if (stats !== undefined) req.user.stats = stats;
  await req.user.save();
  res.json({ success: true, user: req.user });
});

app.get('/api/history/:mode', async (req, res) => {
  const { mode } = req.params;
  const history = await ChatHistory.findOne({ userId: req.user._id, mode });
  res.json(history ? history.messages : []);
});

app.get('/api/history', async (req, res) => {
  const histories = await ChatHistory.find({ userId: req.user._id });
  res.json(histories);
});

app.post('/api/history/clear', async (req, res) => {
  await ChatHistory.deleteMany({ userId: req.user._id });
  res.json({ success: true });
});

app.post('/api/history/:mode', async (req, res) => {
  const { mode } = req.params;
  const { messages } = req.body;
  let history = await ChatHistory.findOne({ userId: req.user._id, mode });
  if (history) {
    history.messages = messages;
  } else {
    history = new ChatHistory({ userId: req.user._id, mode, messages });
  }
  await history.save();
  res.json({ success: true });
});

app.post('/api/chat', async (req, res) => {
  const { provider, model, messages, promptText, apiKey } = req.body;
  const GEMINI_API_KEY = apiKey;
  const MISTRAL_API_KEY = apiKey || process.env.MISTRAL_API_KEY;

  try {
    if (provider === 'gemini') {
      if (!GEMINI_API_KEY) throw new Error("No Gemini API key provided. Please configure it in settings.");
      
      const contents = messages.map(msg => ({
        role: msg.role,
        parts: msg.parts.map(part => ({ text: part.text }))
      }));
      if (promptText) {
          contents.push({ role: "user", parts: [{ text: promptText }] });
      }

      const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        contents,
        generationConfig: { temperature: 1, topP: 0.95, topK: 40, maxOutputTokens: 8192 }
      });
      res.json({ text: response.data.candidates[0].content.parts[0].text });
      
    } else if (provider === 'ollama') {
      const ollamaMessages = messages.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.parts[0].text
      }));
      if (promptText) {
          ollamaMessages.push({ role: 'user', content: promptText });
      }

      const response = await axios.post('http://localhost:11434/api/chat', {
        model: model || 'llama3',
        messages: ollamaMessages,
        stream: false
      });
      res.json({ text: response.data.message.content });

    } else if (provider === 'mistral') {
      if (!MISTRAL_API_KEY) throw new Error("No Mistral API key provided. Please configure it in settings.");

      const mistralMessages = messages.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.parts[0].text
      }));
      if (promptText) {
          mistralMessages.push({ role: 'user', content: promptText });
      }

      const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
        model: model || 'mistral-large-latest',
        messages: mistralMessages
      }, {
        headers: {
          'Authorization': `Bearer ${MISTRAL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      res.json({ text: response.data.choices[0].message.content });

    } else {
      res.status(400).json({ error: 'Invalid provider' });
    }
  } catch (error) {
    console.error('Chat API Error:', error.response ? error.response.data : error.message);
    let errorMessage = 'Chat API error';
    if (error.message.includes("No Gemini API key provided") || error.message.includes("No Mistral API key provided")) {
      errorMessage = error.message;
    } else if (error.response && error.response.data && error.response.data.error) {
      errorMessage = error.response.data.error.message || 'Chat API error';
    } else {
      errorMessage = error.message;
    }
    res.status(500).json({ error: errorMessage });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
