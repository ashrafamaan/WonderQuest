import React, { useEffect, useRef } from 'react';
import { marked } from 'marked';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BADGE_DEFS = {
    first_question: { id: 'first_question', name: 'Curious Mind', icon: '🤔', description: 'Asked your first question!' },
    math_wizard: { id: 'math_wizard', name: 'Math Wizard', icon: '🧮', description: 'Asked 5 math questions!' },
    science_explorer: { id: 'science_explorer', name: 'Science Explorer', icon: '🔬', description: 'Asked 5 science questions!' },
    story_teller: { id: 'story_teller', name: 'Storyteller', icon: '📚', description: 'Asked 5 story questions!' },
    point_master: { id: 'point_master', name: 'Point Master', icon: '⭐', description: 'Earned 100 points!' }
};

export function SettingsModal({ isOpen, onClose, settings, setSettings, onClearMemory, onLogout, currentUser, browserVoices = [], isDarkMode }) {
  const [activeTab, setActiveTab] = React.useState('account');
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = React.useState(false);
  const [isBrowserVoiceDropdownOpen, setIsBrowserVoiceDropdownOpen] = React.useState(false);
  const [elevenLabsFetchedVoices, setElevenLabsFetchedVoices] = React.useState([]);
  const [isFetchingVoices, setIsFetchingVoices] = React.useState(false);

  const OLLAMA_OPTIONS = [
    { value: 'llama3', label: 'Meta Llama 3 (8B)' },
    { value: 'mistral', label: 'Mistral (7B)' },
    { value: 'gemma', label: 'Google Gemma (7B)' },
    { value: 'phi3', label: 'Microsoft Phi-3 (3.8B)' },
    { value: 'qwen', label: 'Qwen (7B)' },
    { value: 'deepseek-r1:8b', label: 'DeepSeek R1 (8B)' }
  ];

  const MISTRAL_OPTIONS = [
    { value: 'mistral-large-latest', label: 'Mistral Large (Latest)' },
    { value: 'mistral-medium-latest', label: 'Mistral Medium' },
    { value: 'mistral-small-latest', label: 'Mistral Small' },
    { value: 'pixtral-large-latest', label: 'Pixtral Large' }
  ];
  const [isMistralDropdownOpen, setIsMistralDropdownOpen] = React.useState(false);

  const fetchElevenLabsVoices = async () => {
    if (!settings.elevenLabsKey) return alert("Please enter your API key first.");
    setIsFetchingVoices(true);
    try {
      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": settings.elevenLabsKey.trim() }
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to fetch voices (${response.status}): ${errText}`);
      }
      const data = await response.json();
      if (data.voices) {
        const fetched = data.voices.map(v => ({ value: v.voice_id, label: v.name + (v.category ? ` (${v.category})` : '') }));
        setElevenLabsFetchedVoices(fetched);
      }
    } catch (e) {
      alert("Error fetching voices: " + e.message);
    } finally {
      setIsFetchingVoices(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = () => {
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '700px', height: '550px', display: 'flex', flexDirection: 'row', padding: 0, overflow: 'hidden', color: 'var(--text-color)' }}>
        
        {/* Sidebar */}
        <div style={{ width: '220px', background: 'rgba(0,0,0,0.05)', padding: '20px', borderRight: '1px solid var(--border-color-alpha)' }}>
          <h2 style={{ marginBottom: '20px', color: 'var(--text-color)' }}>Settings ⚙️</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              onClick={() => setActiveTab('account')}
              style={{ fontFamily: 'inherit', padding: '10px', textAlign: 'left', background: activeTab === 'account' ? 'var(--border-color)' : 'transparent', color: activeTab === 'account' ? 'white' : 'var(--text-color)', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1em' }}
            >
              👤 Account
            </button>
            <button 
              onClick={() => setActiveTab('aiProvider')}
              style={{ fontFamily: 'inherit', padding: '10px', textAlign: 'left', background: activeTab === 'aiProvider' ? 'var(--border-color)' : 'transparent', color: activeTab === 'aiProvider' ? 'white' : 'var(--text-color)', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1em' }}
            >
              🤖 AI Provider
            </button>
            <button 
              onClick={() => setActiveTab('voice')}
              style={{ fontFamily: 'inherit', padding: '10px', textAlign: 'left', background: activeTab === 'voice' ? 'var(--border-color)' : 'transparent', color: activeTab === 'voice' ? 'white' : 'var(--text-color)', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1em' }}
            >
              🎙️ Voice Settings
            </button>
            <button 
              onClick={() => setActiveTab('danger')}
              style={{ fontFamily: 'inherit', padding: '10px', textAlign: 'left', background: activeTab === 'danger' ? 'rgba(231, 76, 60, 0.2)' : 'transparent', color: '#e74c3c', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginTop: '20px', fontSize: '1.1em' }}
            >
              ⚠️ Data Controls
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <button onClick={onClose} className="close-btn" style={{ position: 'absolute', top: '15px', right: '20px', zIndex: 10 }}>&times;</button>
          
          {/* Scrollable Content */}
          <div className="hide-scrollbar" style={{ flex: 1, padding: '30px 30px 50px 30px', overflowY: 'auto', textAlign: 'left' }}>
            {activeTab === 'account' && (
              <div>
                <h3 style={{ marginBottom: '20px', fontSize: '1.5em', color: 'var(--text-color)' }}>Account Properties</h3>
              {currentUser ? (
                <div style={{ background: 'rgba(0,0,0,0.1)', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
                  <p style={{ margin: '10px 0', fontSize: '1.1em' }}><strong>Username:</strong> {currentUser.username}</p>
                  <p style={{ margin: '10px 0', fontSize: '1.1em' }}><strong>Account Type:</strong> {currentUser.username === 'guest' ? 'Guest' : 'Registered User'}</p>
                </div>
              ) : (
                <p>Guest Account</p>
              )}
              {onLogout && (
                <button onClick={onLogout} className="modal-btn" style={{ width: '100%', padding: '12px', fontSize: '1em', background: 'transparent', border: '2px solid #e74c3c', color: '#e74c3c' }}>
                  🚪 Logout
                </button>
              )}
            </div>
          )}

          {activeTab === 'aiProvider' && (
            <div>
              <h3 style={{ marginBottom: '20px', fontSize: '1.5em', color: 'var(--text-color)' }}>AI Provider</h3>
              <p style={{ marginBottom: '15px' }}>Choose the AI engine powering <img src={isDarkMode ? "/wonderquest_w.png" : "/wonderquest.png"} alt="WonderQuest" style={{ height: '1.2em', verticalAlign: 'middle' }} />.</p>

              <div style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
                <div 
                  onClick={() => setSettings({...settings, aiProvider: 'mistral'})}
                  style={{ cursor: 'pointer', background: settings.aiProvider === 'mistral' ? 'var(--border-color)' : 'rgba(0,0,0,0.1)', color: settings.aiProvider === 'mistral' ? 'white' : 'inherit', padding: '10px 15px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center', fontWeight: 'bold', transition: 'all 0.2s' }}
                >
                  Mistral
                </div>
                <div 
                  onClick={() => setSettings({...settings, aiProvider: 'gemini'})}
                  style={{ cursor: 'pointer', background: settings.aiProvider === 'gemini' ? 'var(--border-color)' : 'rgba(0,0,0,0.1)', color: settings.aiProvider === 'gemini' ? 'white' : 'inherit', padding: '10px 15px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center', fontWeight: 'bold', transition: 'all 0.2s' }}
                >
                  Gemini
                </div>
                <div 
                  onClick={() => setSettings({...settings, aiProvider: 'ollama'})}
                  style={{ cursor: 'pointer', background: settings.aiProvider === 'ollama' ? 'var(--border-color)' : 'rgba(0,0,0,0.1)', color: settings.aiProvider === 'ollama' ? 'white' : 'inherit', padding: '10px 15px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center', fontWeight: 'bold', transition: 'all 0.2s' }}
                >
                  Ollama
                </div>
              </div>

              {settings.aiProvider === 'gemini' && (
                <div style={{ marginBottom: '20px', background: 'rgba(0,0,0,0.1)', padding: '15px', borderRadius: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Gemini API Key:</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="password" 
                      value={settings.geminiKey || ''}
                      onChange={(e) => setSettings({...settings, geminiKey: e.target.value})}
                      placeholder="Paste API Key here..."
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color-alpha)', color: 'var(--text-color)', background: 'transparent' }}
                    />
                  </div>
                  <small style={{display: 'block', marginTop: '10px'}}>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{color: '#3498db', textDecoration: 'underline'}}>Get a Gemini API Key here</a>
                  </small>
                </div>
              )}

              {settings.aiProvider === 'mistral' && (
                <div style={{ marginBottom: '20px', background: 'rgba(0,0,0,0.1)', padding: '15px', borderRadius: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Mistral Model:</label>
                  <div style={{ position: 'relative' }}>
                    <div 
                      onClick={() => setIsMistralDropdownOpen(!isMistralDropdownOpen)}
                      style={{ padding: '12px 15px', borderRadius: '8px', border: '1px solid var(--border-color-alpha)', background: 'var(--container-bg)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span>{MISTRAL_OPTIONS.find(o => o.value === (settings.mistralModel || 'mistral-large-latest'))?.label || 'Mistral Large (Latest)'}</span>
                      <span style={{ fontSize: '0.8em', transform: isMistralDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                    </div>
                    
                    {isMistralDropdownOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '5px', marginBottom: '30px', background: 'var(--container-bg)', border: '1px solid var(--border-color-alpha)', borderRadius: '8px', zIndex: 50, overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        {MISTRAL_OPTIONS.map(opt => (
                          <div 
                            key={opt.value}
                            onClick={() => { setSettings({...settings, mistralModel: opt.value}); setIsMistralDropdownOpen(false); }}
                            style={{ padding: '10px 15px', cursor: 'pointer', background: settings.mistralModel === opt.value ? 'var(--border-color)' : 'transparent', color: settings.mistralModel === opt.value ? 'white' : 'inherit' }}
                            onMouseEnter={(e) => { if(settings.mistralModel !== opt.value) e.target.style.background = 'rgba(0,0,0,0.05)' }}
                            onMouseLeave={(e) => { if(settings.mistralModel !== opt.value) e.target.style.background = 'transparent' }}
                          >
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {settings.aiProvider === 'ollama' && (
                <div style={{ marginBottom: '20px', background: 'rgba(0,0,0,0.1)', padding: '15px', borderRadius: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Ollama Model:</label>
                  <div style={{ position: 'relative' }}>
                    <div 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      style={{ padding: '12px 15px', borderRadius: '8px', border: '1px solid var(--border-color-alpha)', background: 'var(--container-bg)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span>{OLLAMA_OPTIONS.find(o => o.value === (settings.ollamaModel || 'llama3'))?.label || settings.ollamaModel}</span>
                      <span style={{ fontSize: '0.8em', transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                    </div>
                    
                    {isDropdownOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '5px', marginBottom: '30px', background: 'var(--container-bg)', border: '1px solid var(--border-color-alpha)', borderRadius: '8px', zIndex: 50, overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        {OLLAMA_OPTIONS.map(opt => (
                          <div 
                            key={opt.value}
                            onClick={() => { setSettings({...settings, ollamaModel: opt.value}); setIsDropdownOpen(false); }}
                            style={{ padding: '10px 15px', cursor: 'pointer', background: settings.ollamaModel === opt.value ? 'var(--border-color)' : 'transparent', color: settings.ollamaModel === opt.value ? 'white' : 'inherit' }}
                            onMouseEnter={(e) => { if(settings.ollamaModel !== opt.value) e.target.style.background = 'rgba(0,0,0,0.05)' }}
                            onMouseLeave={(e) => { if(settings.ollamaModel !== opt.value) e.target.style.background = 'transparent' }}
                          >
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <details style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', borderLeft: '4px solid var(--border-color)' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1em', outline: 'none' }}>
                      📖 How to setup Offline Mode
                    </summary>
                    <div style={{ marginTop: '15px', fontSize: '0.95em', lineHeight: '1.6' }}>
                      <strong>1. Download Ollama & Model</strong>
                      <ol style={{ marginTop: '5px', marginBottom: '15px', paddingLeft: '20px' }}>
                        <li>Install from <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--border-color)', textDecoration: 'none', fontWeight: 'bold' }}>ollama.com</a></li>
                        <li>Open Terminal/Command Prompt</li>
                        <li>Run: <code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: '4px' }}>ollama pull {settings.ollamaModel || 'deepseek-r1:8b'}</code> (or your chosen model)</li>
                      </ol>

                      <strong>2. Allow Cross-Origin Requests (CORS)</strong>
                      <ol style={{ marginTop: '5px', marginBottom: '15px', paddingLeft: '20px' }}>
                        <li>Quit the Ollama app (right-click the llama icon in your system tray &gt; Quit).</li>
                        <li>Open Windows Start Menu &gt; search "Environment Variables" &gt; click "Edit the system environment variables".</li>
                        <li>Click "Environment Variables..."</li>
                        <li>Under "User variables", click "New..."</li>
                        <li>Variable Name: <code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: '4px' }}>OLLAMA_ORIGINS</code></li>
                        <li>Variable Value: <code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: '4px' }}>*</code></li>
                        <li>Click OK on all windows, then open Ollama from the Start Menu to restart it.</li>
                      </ol>

                      <strong>3. Allow Insecure Content (Browser)</strong>
                      <p style={{ marginTop: '5px', marginBottom: '10px' }}>Because GitHub Pages uses secure HTTPS and Ollama uses local HTTP, browsers block the connection by default.</p>
                      <ol style={{ marginTop: '0', paddingLeft: '20px' }}>
                        <li>Click the lock/settings icon next to your website's URL in the browser address bar.</li>
                        <li>Go to "Site settings".</li>
                        <li>Find "Insecure content" and change it to "Allow".</li>
                        <li>Refresh the page.</li>
                      </ol>
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}

          {activeTab === 'voice' && (
            <div>

              <h3 style={{ marginBottom: '20px', fontSize: '1.5em', color: 'var(--text-color)' }}>Voice Engine</h3>
              <p style={{ marginBottom: '20px', opacity: 0.8 }}>Choose the Text-to-Speech engine used for reading answers aloud.</p>

              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                <div 
                  onClick={() => setSettings({...settings, ttsProvider: 'browser'})}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: (settings.ttsProvider === 'browser' || !settings.ttsProvider) ? 'var(--border-color)' : 'rgba(0,0,0,0.05)', color: (settings.ttsProvider === 'browser' || !settings.ttsProvider) ? 'white' : 'inherit', padding: '12px 20px', borderRadius: '8px', flex: 1, justifyContent: 'center', fontWeight: 'bold', transition: 'all 0.2s' }}
                >
                  Browser Native
                </div>
                <div 
                  onClick={() => setSettings({...settings, ttsProvider: 'elevenlabs'})}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: settings.ttsProvider === 'elevenlabs' ? 'var(--border-color)' : 'rgba(0,0,0,0.05)', color: settings.ttsProvider === 'elevenlabs' ? 'white' : 'inherit', padding: '12px 20px', borderRadius: '8px', flex: 1, justifyContent: 'center', fontWeight: 'bold', transition: 'all 0.2s' }}
                >
                  ElevenLabs
                </div>
              </div>

              {(settings.ttsProvider === 'browser' || !settings.ttsProvider) && (
                <div style={{ marginBottom: '20px', background: 'rgba(0,0,0,0.1)', padding: '15px', borderRadius: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Select Native Voice:</label>
                  <div style={{ position: 'relative' }}>
                    <div 
                      onClick={() => setIsBrowserVoiceDropdownOpen(!isBrowserVoiceDropdownOpen)}
                      style={{ padding: '12px 15px', borderRadius: '8px', border: '1px solid var(--border-color-alpha)', background: 'var(--container-bg)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span>{browserVoices.find(o => o.voiceURI === settings.browserVoiceURI)?.name || (browserVoices.length > 0 ? browserVoices[0].name : "Default Voice")}</span>
                      <span style={{ fontSize: '0.8em', transform: isBrowserVoiceDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                    </div>
                    {isBrowserVoiceDropdownOpen && (
                      <div className="hide-scrollbar" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '5px', marginBottom: '30px', background: 'var(--container-bg)', border: '1px solid var(--border-color-alpha)', borderRadius: '8px', zIndex: 50, overflowY: 'auto', maxHeight: '200px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        {browserVoices.map(opt => (
                          <div 
                            key={opt.voiceURI}
                            onClick={() => { setSettings({...settings, browserVoiceURI: opt.voiceURI}); setIsBrowserVoiceDropdownOpen(false); }}
                            style={{ padding: '10px 15px', cursor: 'pointer', background: settings.browserVoiceURI === opt.voiceURI ? 'var(--border-color)' : 'transparent', color: settings.browserVoiceURI === opt.voiceURI ? 'white' : 'inherit' }}
                            onMouseEnter={(e) => { if(settings.browserVoiceURI !== opt.voiceURI) e.target.style.background = 'rgba(0,0,0,0.05)' }}
                            onMouseLeave={(e) => { if(settings.browserVoiceURI !== opt.voiceURI) e.target.style.background = 'transparent' }}
                          >
                            {opt.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <small style={{display: 'block', marginTop: '10px', opacity: 0.8}}>
                    Voices marked as "Natural" or "Online" are ultra-high-quality cloud voices provided free by your browser (e.g. Edge).
                  </small>
                </div>
              )}

              {settings.ttsProvider === 'elevenlabs' && (
                <div style={{ marginBottom: '20px', background: 'rgba(0,0,0,0.1)', padding: '15px', borderRadius: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>ElevenLabs API Key:</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                    <input 
                      type="password" 
                      value={settings.elevenLabsKey || ''}
                      onChange={(e) => setSettings({...settings, elevenLabsKey: e.target.value})}
                      placeholder="Paste ElevenLabs API Key here..."
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color-alpha)', color: 'var(--text-color)', background: 'transparent' }}
                    />
                    <button 
                      onClick={fetchElevenLabsVoices} 
                      disabled={isFetchingVoices}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px', fontSize: '1em', background: 'var(--border-color)', color: 'white', border: 'none', borderRadius: '8px', cursor: isFetchingVoices ? 'not-allowed' : 'pointer', opacity: isFetchingVoices ? 0.7 : 1, fontWeight: 'bold' }}
                    >
                      {isFetchingVoices ? '🔄 Loading...' : '🔄 Load My Voices'}
                    </button>
                  </div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Select AI Voice:</label>
                  <div style={{ position: 'relative' }}>
                    <div 
                      onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
                      style={{ padding: '12px 15px', borderRadius: '8px', border: '1px solid var(--border-color-alpha)', background: 'var(--container-bg)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span>{elevenLabsFetchedVoices.find(o => o.value === settings.elevenLabsVoice)?.label || 'Select Voice'}</span>
                      <span style={{ fontSize: '0.8em', transform: isVoiceDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                    </div>
                    
                    {isVoiceDropdownOpen && (
                      <div className="hide-scrollbar" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '5px', marginBottom: '30px', background: 'var(--container-bg)', border: '1px solid var(--border-color-alpha)', borderRadius: '8px', zIndex: 50, overflowY: 'auto', maxHeight: '200px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        {elevenLabsFetchedVoices.map(opt => (
                          <div 
                            key={opt.value}
                            onClick={() => { setSettings({...settings, elevenLabsVoice: opt.value}); setIsVoiceDropdownOpen(false); }}
                            style={{ padding: '10px 15px', cursor: 'pointer', background: settings.elevenLabsVoice === opt.value ? 'var(--border-color)' : 'transparent', color: settings.elevenLabsVoice === opt.value ? 'white' : 'inherit' }}
                            onMouseEnter={(e) => { if(settings.elevenLabsVoice !== opt.value) e.target.style.background = 'rgba(0,0,0,0.05)' }}
                            onMouseLeave={(e) => { if(settings.elevenLabsVoice !== opt.value) e.target.style.background = 'transparent' }}
                          >
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <small>
                      <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" style={{color: '#3498db', textDecoration: 'underline'}}>Get an ElevenLabs API Key</a>
                    </small>
                  </div>
                </div>
              )}

            </div>
          )}

          {activeTab === 'danger' && (
            <div>
              <h3 style={{ marginBottom: '20px', fontSize: '1.5em', color: '#e74c3c' }}>Data Controls</h3>
              <p style={{ marginBottom: '20px', opacity: 0.8 }}>Manage your chatbot's memory.</p>
              
              <button onClick={onClearMemory} className="modal-btn" style={{ width: '100%', padding: '12px', fontSize: '1em', background: '#e74c3c', marginBottom: '15px' }}>
                🗑️ Clear Chat Memory
              </button>
            </div>
          )}
          </div>

          {/* Sticky Bottom Footer */}
          <div style={{ padding: '20px 30px', borderTop: '1px solid var(--border-color-alpha)', background: 'var(--container-bg)', zIndex: 10 }}>
            <button onClick={handleSave} className="modal-btn" style={{ width: '100%', padding: '15px', fontSize: '1.2em' }}>
              Save & Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export function DashboardModal({ isOpen, onClose, points, badges, stats }) {
  if (!isOpen) return null;

  const chartData = {
      labels: ['General', 'Math', 'Science', 'Storytime'],
      datasets: [{
          label: 'Questions Asked',
          data: [stats?.general || 0, stats?.math || 0, stats?.science || 0, stats?.story || 0],
          backgroundColor: [
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 99, 132, 0.6)',
              'rgba(75, 192, 192, 0.6)',
              'rgba(153, 102, 255, 0.6)'
          ],
          borderColor: [
              'rgba(54, 162, 235, 1)',
              'rgba(255, 99, 132, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
      }]
  };

  const chartOptions = {
      scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
      },
      responsive: true,
      plugins: {
          legend: { display: false },
          title: { display: true, text: 'Questions by Subject' }
      }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
        <button onClick={onClose} className="close-btn">&times;</button>
        <h2 style={{ textAlign: 'center', fontSize: '2em', marginBottom: '20px' }}>🌟 Your Progress Dashboard 🌟</h2>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '50px', marginBottom: '30px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3em' }}>⭐</div>
            <h3>{points} Points</h3>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3em' }}>🏆</div>
            <h3>{badges.length} Badges</h3>
          </div>
        </div>

        <div className="dashboard-sections">
            <div className="chart-container">
                <Bar data={chartData} options={chartOptions} />
            </div>

            <div style={{marginTop: '20px'}}>
                <h3 style={{textAlign: 'center', marginBottom: '15px'}}>Your Badges</h3>
                <div className="badge-grid">
                    {Object.values(BADGE_DEFS).map(badge => {
                        const isUnlocked = badges.includes(badge.id);
                        return (
                            <div key={badge.id} className={`badge-item ${isUnlocked ? 'unlocked' : ''}`}>
                                <div className="badge-icon">{badge.icon}</div>
                                <div style={{fontWeight: 'bold'}}>{badge.name}</div>
                                <div style={{fontSize: '0.8em', marginTop: '5px'}}>{badge.description}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}

export function HistoryModal({ isOpen, onClose, allHistories, currentMode }) {
  const [selectedTab, setSelectedTab] = React.useState(currentMode);
  const contentRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedTab(currentMode);
    }
  }, [isOpen, currentMode]);

  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [isOpen, selectedTab, allHistories]);

  if (!isOpen) return null;

  const currentHistory = allHistories[selectedTab] || [];
  const visibleHistory = currentHistory.slice(2);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', width: '90%', height: '70vh', display: 'flex', flexDirection: 'column' }}>
        <button onClick={onClose} className="close-btn">&times;</button>
        <h2>📜 Past Conversations</h2>
        
        <div style={{ display: 'flex', gap: '5px', marginTop: '10px', justifyContent: 'center' }}>
          {['general', 'math', 'science', 'story'].map(mode => (
            <button 
              key={mode}
              onClick={() => setSelectedTab(mode)}
              style={{
                padding: '8px 12px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: selectedTab === mode ? 'var(--border-color)' : 'rgba(0,0,0,0.2)',
                color: selectedTab === mode ? 'white' : 'inherit',
                fontWeight: selectedTab === mode ? 'bold' : 'normal',
                textTransform: 'capitalize'
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        <div 
          ref={contentRef}
          id="history-content" 
          style={{ flex: 1, overflowY: 'auto', textAlign: 'left', marginTop: '15px', padding: '10px', border: '2px solid var(--border-color-alpha)', borderRadius: '10px', background: 'rgba(0,0,0,0.2)' }}
        >
          {visibleHistory.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>No conversation history for this subject yet! ✨</div>
          ) : (
            visibleHistory.map((msg, idx) => (
              <div key={idx} className={`chat-log-msg ${msg.role === 'user' ? 'user' : 'bot'}`}>
                {msg.role === 'model' ? (
                  <div dangerouslySetInnerHTML={{ __html: marked.parse(msg.parts && msg.parts[0] ? msg.parts[0].text : '') }} />
                ) : (
                  msg.parts && msg.parts[0] ? msg.parts[0].text : ''
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
