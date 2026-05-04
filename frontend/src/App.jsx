import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { marked } from 'marked';
import { SettingsModal, DashboardModal, HistoryModal } from './components/Modals';
import { AuthScreen } from './components/AuthScreen';
import * as api from './api';

const MODES = {
  general: "You are an educational chatbot for children aged 5 to 12 years. Every response must be a maximum of 2 short lines, using very simple words and emojis. Keep a friendly, patient tone. End with a fun question.",
  math: "You are a fun Math Tutor for kids. Ask them simple math puzzles or answer their math questions in a playful way. Max 2 short lines. Use emojis. If the child gets a math question right, append the exact text '||CORRECT||' secretly at the very end of your response.",
  science: "You are a Science Explorer for kids. Explain science simply and ask fun science trivia. Max 2 short lines. Use emojis. If the child answers a trivia question correctly, append the exact text '||CORRECT||' secretly at the very end of your response.",
  story: "You are a Storyteller. Tell an interactive story where the child makes choices. Keep each part to 2 short lines and use lots of fun emojis. End each response by asking what the child wants to do next."
};

function App() {
  const [points, setPoints] = useState(0);
  const [badges, setBadges] = useState([]);
  const [stats, setStats] = useState({ general: 0, math: 0, science: 0, story: 0 });
  const [settings, setSettings] = useState({ 
    aiProvider: 'mistral', 
    ollamaModel: 'llama3', 
    geminiKey: '',
    ttsProvider: 'browser',
    elevenLabsKey: '',
    elevenLabsVoice: '21m00Tcm4TlvDq8ikWAM',
    browserVoiceURI: '',
    mistralKey: '',
    mistralModel: 'mistral-large-latest'
  });
  const [browserVoices, setBrowserVoices] = useState([]);
  const [currentMode, setCurrentMode] = useState('general');
  const [chatHistory, setChatHistory] = useState([]);
  const [input, setInput] = useState('');
  const [answerText, setAnswerText] = useState("Welcome! Let's learn something new today. 😊");
  const [isTyping, setIsTyping] = useState(false);
  const [avatarState, setAvatarState] = useState('idle');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const talkIntervalRef = useRef(null);
  const recognitionRef = useRef(null);
  
  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [allHistories, setAllHistories] = useState({ general: [], math: [], science: [], story: [] });

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const openHistoryModal = async () => {
    try {
      const data = await api.getAllHistory();
      const historiesMap = { general: [], math: [], science: [], story: [] };
      data.forEach(h => { historiesMap[h.mode] = h.messages || []; });
      setAllHistories(historiesMap);
      setIsHistoryOpen(true);
    } catch (e) {
      console.error('Error loading history:', e);
    }
  };

  useEffect(() => {
    // Load Dark Mode
    const savedDark = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDark);
    if (savedDark) document.body.classList.add('dark-mode');

    // Load Browser Voices
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const naturalVoices = voices.filter(v => 
        (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Aria') || v.lang.startsWith('en')) && v.lang.startsWith('en')
      );
      setBrowserVoices(naturalVoices);
    };
    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Check auth and load initial progress
    const token = localStorage.getItem('token');
    if (token) {
      api.getProgress().then(data => {
        if (data) {
          setPoints(data.points || 0);
          setBadges(data.badges || []);
          if (data.settings) setSettings(data.settings);
          if (data.stats) setStats(data.stats);
          setIsAuthenticated(true);
          handleModeChange('general');
        }
      }).catch(err => {
        console.error('Session expired or invalid', err);
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      });
    }
  }, []);

  const toggleDarkMode = () => {
    const newDark = !isDarkMode;
    setIsDarkMode(newDark);
    localStorage.setItem('darkMode', newDark);
    if (newDark) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
  };

  const toggleTts = () => {
    const newTts = !ttsEnabled;
    setTtsEnabled(newTts);
    if (!newTts) window.speechSynthesis.cancel();
  };

  const speakText = async (text, mode) => {
    if (!ttsEnabled) return;
    
    let cleanText = text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
    cleanText = cleanText.replace(/[*#_]/g, '');

    const startAnimation = () => {
        setAvatarState('talking');
        let frame = 1;
        talkIntervalRef.current = setInterval(() => {
            const av = document.getElementById('avatar');
            if(av) av.src = `/talking${frame}.png`;
            frame = frame >= 2 ? 1 : frame + 1;
        }, 250);
    };

    const stopAnimationAndListen = () => {
        if (talkIntervalRef.current) clearInterval(talkIntervalRef.current);
        setAvatarState('idle');
        
        setTimeout(() => {
            if (ttsEnabled && !isRecording) {
                toggleMic();
            }
        }, 1000);
    };

    if (settings.ttsProvider === 'elevenlabs' && settings.elevenLabsKey) {
        try {
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${settings.elevenLabsVoice || '21m00Tcm4TlvDq8ikWAM'}`, {
                method: 'POST',
                headers: {
                    'xi-api-key': settings.elevenLabsKey.trim(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: cleanText,
                    model_id: "eleven_multilingual_v2",
                    voice_settings: { stability: 0.5, similarity_boost: 0.5 }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error("ElevenLabs Error Response:", errText);
                throw new Error(`ElevenLabs API error: ${response.status} - ${errText}`);
            }
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            
            audio.onplay = startAnimation;
            audio.onended = () => {
                stopAnimationAndListen();
                URL.revokeObjectURL(url);
            };
            
            audio.play().catch(e => {
                console.error("Audio playback failed", e);
                throw new Error("Audio playback failed");
            });
            return;
        } catch (e) {
            console.error("ElevenLabs failed, falling back to browser TTS", e);
            alert("ElevenLabs Error: " + e.message);
        }
    }

    // Browser Fallback / Default
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const availableVoices = window.speechSynthesis.getVoices();
    
    if (availableVoices.length > 0) {
        let bestVoice;
        if (settings.browserVoiceURI) {
            bestVoice = availableVoices.find(v => v.voiceURI === settings.browserVoiceURI);
        }
        if (!bestVoice) {
            bestVoice = availableVoices.find(v => v.name.includes('Natural') && v.lang.includes('en')) ||
                        availableVoices.find(v => v.name.includes('Google US English')) ||
                        availableVoices.find(v => v.name.includes('Aria')) ||
                        availableVoices.find(v => v.lang === 'en-US');
        }
        if (bestVoice) utterance.voice = bestVoice;
    }
    
    utterance.pitch = 1.1; 
    utterance.rate = 0.95; 
    
    utterance.onstart = startAnimation;
    utterance.onend = stopAnimationAndListen;
    
    window.speechSynthesis.speak(utterance);
  };

  const handleModeChange = async (mode) => {
    setCurrentMode(mode);
    try {
      const history = await api.getHistory(mode);
      if (history && history.length > 0) {
        setChatHistory(history);
        generateSmartGreeting(history);
      } else {
        const initialHistory = [
          { role: "user", parts: [{ text: MODES[mode] }] },
          { role: "model", parts: [{ text: "Got it! I'm ready! 😊" }] }
        ];
        setChatHistory(initialHistory);
        setAnswerText("Mode switched! Let's go! 🚀");
        setAvatarState('idle');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const generateSmartGreeting = async (history) => {
    setIsTyping(true);
    setAnswerText('');
    setAvatarState('thinking');

    try {
      const promptText = "The user just returned. Based on our chat history above, greet them back in 1-2 short lines using simple words and emojis. Ask if they want to continue our previous topic.";
      
      const apiKeyToUse = settings.aiProvider === 'mistral' ? null : settings.geminiKey;
      const modelToUse = settings.aiProvider === 'mistral' ? settings.mistralModel : settings.ollamaModel;
      const res = await api.sendChatMessage(settings.aiProvider, modelToUse, history, promptText, apiKeyToUse);
      
      setAvatarState('idle');
      typeWriterEffect(res.text);
      speakText(res.text, currentMode);
    } catch (error) {
      setIsTyping(false);
      setAvatarState('idle');
      setAnswerText("Welcome back! Let's continue learning! 🚀");
    }
  };

  const typeWriterEffect = (text) => {
    setIsTyping(false);
    let i = 0;
    let currentText = '';
    
    const interval = setInterval(() => {
      if (i < text.length) {
        currentText += text.charAt(i);
        setAnswerText(marked.parse(currentText));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 15);
  };

  const handleSend = async (overrideMsg = null) => {
    const msg = typeof overrideMsg === 'string' ? overrideMsg.trim() : input.trim();
    if (!msg) return;
    setInput('');
    setIsTyping(true);
    setAvatarState('thinking');
    setAnswerText('');

    const newHistory = [...chatHistory, { role: "user", parts: [{ text: msg }] }];
    setChatHistory(newHistory);

    try {
      const apiKeyToUse = settings.aiProvider === 'mistral' ? null : settings.geminiKey;
      const modelToUse = settings.aiProvider === 'mistral' ? settings.mistralModel : settings.ollamaModel;
      const res = await api.sendChatMessage(settings.aiProvider, modelToUse, newHistory, null, apiKeyToUse);
      let botResponse = res.text;

      // Handle correct logic and update stats
      let newPoints = points + 5; // Base points for asking
      let updatedBotResponse = botResponse;

      if (botResponse.includes('||CORRECT||')) {
        newPoints += 20; // Bonus points for correct answer
        updatedBotResponse = botResponse.replace('||CORRECT||', '').trim();
      }
      
      const newStats = { ...stats, [currentMode]: stats[currentMode] + 1 };
      
      // Check badges
      const newBadges = [...badges];
      const checkCondition = (key, condition) => {
          if (!newBadges.includes(key) && condition(newStats, newPoints)) {
              newBadges.push(key);
          }
      };
      
      checkCondition('first_question', (s, p) => (s.general + s.math + s.science + s.story) >= 1);
      checkCondition('math_wizard', (s, p) => s.math >= 5);
      checkCondition('science_explorer', (s, p) => s.science >= 5);
      checkCondition('story_teller', (s, p) => s.story >= 5);
      checkCondition('point_master', (s, p) => p >= 100);

      setPoints(newPoints);
      setStats(newStats);
      setBadges(newBadges);
      
      api.updateProgress({ points: newPoints, stats: newStats, badges: newBadges });

      const finalHistory = [...newHistory, { role: "model", parts: [{ text: updatedBotResponse }] }];
      setChatHistory(finalHistory);
      api.saveHistory(currentMode, finalHistory);

      setAvatarState('idle');
      typeWriterEffect(updatedBotResponse);
      speakText(updatedBotResponse, currentMode);
    } catch (error) {
      setIsTyping(false);
      setAvatarState('idle');
      setAnswerText(`Oops! Error: ${error.message}`);
    }
  };

  const clearMemory = async () => {
    if (window.confirm("Are you sure you want to clear the chat memory? This will make the bot forget all previous conversations.")) {
      await api.clearHistory();
      setIsSettingsOpen(false);
      handleModeChange(currentMode);
      alert("Memory cleared! 🧠✨");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setChatHistory([]);
  };

  const getAvatarSrc = () => {
    if (avatarState === 'thinking') return '/thinking.png';
    if (avatarState === 'talking') return '/talking1.png';
    return '/idle.png';
  };

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = true;

        rec.onstart = () => {
            setIsRecording(true);
            setInput('');
        };

        rec.onresult = (event) => {
            let transcript = '';
            let isFinal = false;
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript;
                if (event.results[i].isFinal) isFinal = true;
            }
            setInput(transcript);
            if (isFinal) {
                setTimeout(() => handleSend(transcript), 500);
            }
        };

        rec.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            setIsRecording(false);
        };

        rec.onend = () => {
            setIsRecording(false);
        };

        recognitionRef.current = rec;
    }
  }, [chatHistory, currentMode, settings]);

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
        recognitionRef.current.stop();
    } else {
        recognitionRef.current.start();
    }
  };

  if (!isAuthenticated) {
    return <AuthScreen onLogin={(user) => {
      setCurrentUser(user);
      setIsAuthenticated(true);
      // Reload progress after login
      api.getProgress().then(data => {
        if (data) {
          setPoints(data.points || 0);
          setBadges(data.badges || []);
          if (data.settings) setSettings(data.settings);
          if (data.stats) setStats(data.stats);
        }
        handleModeChange('general');
      }).catch(console.error);
    }} />;
  }

  return (
    <>
      <div id="top-bar">
        <div className="stats">
            <span id="points-display">⭐ Points: {points}</span>
            <span id="badges-display">🏆 Badges: {badges.length}</span>
        </div>
        <h1 className="title">WonderQuest</h1>
        <div className="top-controls" style={{display: 'flex', gap: '10px', alignItems: 'center', flex: 1, justifyContent: 'flex-end'}}>
            <button className={`top-btn ${ttsEnabled ? 'active' : ''}`} title="Toggle Read Aloud" onClick={toggleTts}>{ttsEnabled ? '🔊' : '🔇'}</button>
            <button className="top-btn" title="Chat History" onClick={openHistoryModal}>📜</button>
            <button className="top-btn" title="Progress Dashboard" onClick={() => setIsDashboardOpen(true)}>📊</button>
            <button className="top-btn" title="Settings" onClick={() => setIsSettingsOpen(true)}>⚙️</button>
            <button id="dark-mode-toggle" title="Toggle Dark Mode" onClick={toggleDarkMode}>🌙</button>
        </div>
      </div>

      <div id="container">
        <div id="content-wrapper">
          <div id="main-chat-area">
            <div id="avatar-container">
                <img id="avatar" src={getAvatarSrc()} alt="Avatar" className={avatarState} />
            </div>
            
            <div id="answer-box">
                <div id="answer-text" dangerouslySetInnerHTML={{ __html: answerText }}></div>
                {isTyping && (
                  <div className="typing-indicator" style={{ display: 'block' }}>
                      <div className="typing-dots">
                          <span></span><span></span><span></span>
                      </div>
                  </div>
                )}
            </div>

            <div id="input-container">
                <input 
                  type="text" 
                  id="user-input" 
                  placeholder={isRecording ? "Listening..." : "Ask me anything and see the magic! ✨"}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <button 
                  id="mic-btn" 
                  title="Click to speak" 
                  onClick={toggleMic} 
                  className={isRecording ? 'recording' : ''} 
                  style={{display: recognitionRef.current ? 'flex' : 'none'}}
                >🎤</button>
            </div>
          </div>
          
          <div id="mode-selector">
              <button className={`mode-btn ${currentMode === 'general' ? 'active' : ''}`} onClick={() => handleModeChange('general')}>🤖 General</button>
              <button className={`mode-btn ${currentMode === 'math' ? 'active' : ''}`} onClick={() => handleModeChange('math')}>🧮 Math</button>
              <button className={`mode-btn ${currentMode === 'science' ? 'active' : ''}`} onClick={() => handleModeChange('science')}>🔬 Science</button>
              <button className={`mode-btn ${currentMode === 'story' ? 'active' : ''}`} onClick={() => handleModeChange('story')}>📚 Storytime</button>
          </div>
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        setSettings={(s) => {setSettings(s); api.updateProgress({settings: s})}}
        onClearMemory={clearMemory}
        onLogout={handleLogout}
        currentUser={currentUser}
        browserVoices={browserVoices}
      />
      <DashboardModal isOpen={isDashboardOpen} onClose={() => setIsDashboardOpen(false)} points={points} badges={badges} stats={stats} />
      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} allHistories={allHistories} currentMode={currentMode} />
    </>
  );
}

export default App;
