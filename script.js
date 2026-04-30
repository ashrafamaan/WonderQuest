let API_KEY = localStorage.getItem('gemini_api_key') || '';
let AI_PROVIDER = localStorage.getItem('ai_provider') || 'gemini';
let OLLAMA_MODEL = localStorage.getItem('ollama_model') || 'llama3';
const answerText = document.getElementById('answer-text');
const userInput = document.getElementById('user-input');
const typingIndicator = document.getElementById('typing');
const pointsDisplay = document.getElementById('points-display');
const badgesDisplay = document.getElementById('badges-display');
const ttsToggle = document.getElementById('tts-toggle');
const micBtn = document.getElementById('mic-btn');

// State Management
let state = {
    points: 0,
    badges: [],
    stats: {
        general: 0,
        math: 0,
        science: 0,
        story: 0
    }
};

// Available Badges
const BADGE_DEFS = {
    first_question: { id: 'first_question', name: 'Curious Mind', icon: '🤔', description: 'Asked your first question!', condition: s => totalQuestions(s) >= 1 },
    math_wizard: { id: 'math_wizard', name: 'Math Wizard', icon: '🧮', description: 'Asked 5 math questions!', condition: s => s.stats.math >= 5 },
    science_explorer: { id: 'science_explorer', name: 'Science Explorer', icon: '🔬', description: 'Asked 5 science questions!', condition: s => s.stats.science >= 5 },
    story_teller: { id: 'story_teller', name: 'Storyteller', icon: '📚', description: 'Asked 5 story questions!', condition: s => s.stats.story >= 5 },
    point_master: { id: 'point_master', name: 'Point Master', icon: '⭐', description: 'Earned 100 points!', condition: s => s.points >= 100 }
};

function totalQuestions(s) {
    return s.stats.general + s.stats.math + s.stats.science + s.stats.story;
}

// Load State
function loadState() {
    const saved = localStorage.getItem('smartTutorState');
    if (saved) {
        state = JSON.parse(saved);
    }
    updateUI();
}

// Save State
function saveState() {
    localStorage.setItem('smartTutorState', JSON.stringify(state));
    updateUI();
}

// Update UI (points, badges count)
function updateUI() {
    pointsDisplay.textContent = `⭐ Points: ${state.points}`;
    badgesDisplay.textContent = `🏆 Badges: ${state.badges.length}`;
}

// Modes Configuration
const MODES = {
    general: "You are an educational chatbot for children aged 5 to 12 years. Every response must be a maximum of 2 short lines, using very simple words and emojis. Keep a friendly, patient tone. End with a fun question.",
    math: "You are a fun Math Tutor for kids. Ask them simple math puzzles or answer their math questions in a playful way. Max 2 short lines. Use emojis. If the child gets a math question right, append the exact text '||CORRECT||' secretly at the very end of your response.",
    science: "You are a Science Explorer for kids. Explain science simply and ask fun science trivia. Max 2 short lines. Use emojis. If the child answers a trivia question correctly, append the exact text '||CORRECT||' secretly at the very end of your response.",
    story: "You are a Storyteller. Tell an interactive story where the child makes choices. Keep each part to 2 short lines and use lots of fun emojis. End each response by asking what the child wants to do next."
};

let currentMode = 'general';
let chatHistory = [];

function setMode(modeId) {
    currentMode = modeId;
    chatHistory = [
        {
            role: "user",
            parts: [{ text: MODES[modeId] }]
        },
        {
            role: "model",
            parts: [{ text: "Got it! I'm ready! 😊" }]
        }
    ];
    answerText.textContent = "Mode switched! Let's go! 🚀";
    answerText.style.opacity = 1;
}

// Initialize default mode
setMode('general');

// Check Badges
function checkBadges() {
    let newlyUnlocked = false;
    for (let key in BADGE_DEFS) {
        const badge = BADGE_DEFS[key];
        if (!state.badges.includes(key) && badge.condition(state)) {
            state.badges.push(key);
            showBadgeNotification(badge);
            newlyUnlocked = true;
        }
    }
    if (newlyUnlocked) saveState();
}

// Show Badge Notification
function showBadgeNotification(badge) {
    const notif = document.getElementById('badge-notification');
    document.getElementById('new-badge-icon').textContent = badge.icon;
    document.getElementById('new-badge-name').textContent = badge.name;
    notif.classList.remove('hidden');
    setTimeout(() => {
        notif.classList.add('hidden');
    }, 4000);
}

// TTS Logic
let ttsEnabled = false;
ttsToggle.addEventListener('click', () => {
    ttsEnabled = !ttsEnabled;
    if (ttsEnabled) {
        ttsToggle.textContent = '🔊 Read Aloud: ON';
        ttsToggle.classList.add('active');
    } else {
        ttsToggle.textContent = '🔇 Read Aloud: OFF';
        ttsToggle.classList.remove('active');
        window.speechSynthesis.cancel();
    }
});

let availableVoices = [];
if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
        availableVoices = window.speechSynthesis.getVoices();
    };
    availableVoices = window.speechSynthesis.getVoices();
}

function speakText(text) {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    // Remove emojis and common markdown characters (*, #, _) so the TTS doesn't read them out loud
    let cleanText = text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
    cleanText = cleanText.replace(/[*#_]/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    if (availableVoices.length > 0) {
        // Try to pick the most natural, premium sounding AI voice available on this browser/OS
        const bestVoice = availableVoices.find(v => v.name.includes('Natural') && v.lang.includes('en')) ||
                          availableVoices.find(v => v.name.includes('Google US English')) ||
                          availableVoices.find(v => v.name.includes('Google UK English Female')) ||
                          availableVoices.find(v => v.name.includes('Aria')) ||
                          availableVoices.find(v => v.name.includes('Zira')) ||
                          availableVoices.find(v => v.lang === 'en-US');
                          
        if (bestVoice) {
            utterance.voice = bestVoice;
        }
    }
    
    // Slightly tweak pitch and rate to sound friendlier
    utterance.pitch = 1.1; 
    utterance.rate = 0.95; 
    
    utterance.onend = () => {
        // If we are in story mode, automatically start listening for the user's reply after 3 seconds
        if (currentMode === 'story' && recognition) {
            setTimeout(() => {
                // Make sure they didn't switch modes or disable read aloud during the 3 seconds
                if (currentMode === 'story' && ttsEnabled && !micBtn.classList.contains('recording')) {
                    try {
                        recognition.start();
                    } catch (e) {
                        console.error('Could not auto-start recognition', e);
                    }
                }
            }, 1000);
        }
    };
    
    window.speechSynthesis.speak(utterance);
}

// STT Logic
let recognition = null;
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
        micBtn.classList.add('recording');
        userInput.placeholder = "Listening...";
        userInput.value = "";
    };

    recognition.onresult = (event) => {
        let transcript = '';
        let isFinal = false;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                isFinal = true;
            }
        }
        
        userInput.value = transcript;

        if (isFinal) {
            setTimeout(() => {
                sendMessage();
            }, 500);
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        micBtn.classList.remove('recording');
        userInput.placeholder = "Ask me anything and see the magic! ✨";
        
        if (event.error === 'network') {
            if (window.location.protocol === 'file:') {
                alert("Voice error! If you are opening this file directly (file:///), Chrome blocks the microphone for security. Try using a local web server.");
            } else {
                alert("Voice error! Your browser (like Brave) or an ad-blocker is blocking the speech recognition service. Please try using standard Google Chrome or Microsoft Edge, or check your browser's privacy settings.");
            }
        } else if (event.error === 'not-allowed') {
            alert("Microphone access denied. Please click the lock icon in your URL bar and allow microphone access.");
        } else if (event.error !== 'no-speech') {
            alert("Speech recognition error: " + event.error);
        }
    };

    recognition.onend = () => {
        micBtn.classList.remove('recording');
        userInput.placeholder = "Ask me anything and see the magic! ✨";
    };
} else {
    micBtn.style.display = 'none';
}

micBtn.addEventListener('click', () => {
    if (recognition) {
        if (micBtn.classList.contains('recording')) {
            recognition.stop();
        } else {
            recognition.start();
        }
    }
});

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    if (AI_PROVIDER === 'gemini' && !API_KEY) {
        if (typeof openSettingsModal === 'function') openSettingsModal();
        return;
    }

    // Award basic points and update stats
    state.points += 5;
    state.stats[currentMode]++;
    saveState();
    checkBadges();

    answerText.style.opacity = 0;
    userInput.value = '';
    typingIndicator.style.display = 'block';

    try {
        let botResponse = "";

        if (AI_PROVIDER === 'gemini') {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        ...chatHistory,
                        { role: "user", parts: [{ text: message }] }
                    ],
                    generationConfig: { temperature: 1, topP: 0.95, topK: 40, maxOutputTokens: 8192 }
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            if (!data.candidates || data.candidates.length === 0) throw new Error("Response was blocked by safety filters or was empty.");
            
            botResponse = data.candidates[0].content.parts[0].text;
            
        } else if (AI_PROVIDER === 'ollama') {
            const ollamaMessages = chatHistory.map(msg => ({
                role: msg.role === 'model' ? 'assistant' : 'user',
                content: msg.parts[0].text
            }));
            ollamaMessages.push({ role: 'user', content: message });

            const response = await fetch('http://localhost:11434/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: OLLAMA_MODEL,
                    messages: ollamaMessages,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error("Could not connect to Ollama. Make sure it is running and OLLAMA_ORIGINS=\"*\" is set.");
            }

            const data = await response.json();
            botResponse = data.message.content;
        }
        
        // Detect ||CORRECT|| tag
        if (botResponse.includes('||CORRECT||')) {
            state.points += 20; // Bonus points!
            saveState();
            checkBadges();
            botResponse = botResponse.replace('||CORRECT||', '').trim();
        }

        speakText(botResponse);

        chatHistory.push(
            { role: "user", parts: [{ text: message }] },
            { role: "model", parts: [{ text: botResponse }] }
        );

        typingIndicator.style.display = 'none';
        
        let i = 0;
        answerText.textContent = '';
        answerText.style.opacity = 1;
        
        function typeWriter() {
            if (i < botResponse.length) {
                answerText.textContent += botResponse.charAt(i);
                i++;
                setTimeout(typeWriter, 20);
            }
        }
        typeWriter();

    } catch (error) {
        console.error('Error:', error);
        typingIndicator.style.display = 'none';
        answerText.style.opacity = 1;
        answerText.textContent = `Oops! Error: ${error.message}`;
    }
}

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Auto-scroll on mobile
userInput.addEventListener('focus', () => {
    if (window.innerWidth < 768) {
        document.getElementById('answer-box').scrollIntoView();
    }
});

// Mode Selector Event Listeners
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        setMode(e.target.dataset.mode);
    });
});

// Dashboard Modal Logic
const dashboardModal = document.getElementById('dashboard-modal');
const dashboardBtn = document.getElementById('dashboard-btn');
const closeDashboard = document.getElementById('close-dashboard');
let chartInstance = null;

dashboardBtn.addEventListener('click', () => {
    dashboardModal.classList.remove('hidden');
    renderDashboard();
});

closeDashboard.addEventListener('click', () => {
    dashboardModal.classList.add('hidden');
});

function renderDashboard() {
    // Render Badges
    const badgeGrid = document.getElementById('badge-grid');
    badgeGrid.innerHTML = '';
    for (let key in BADGE_DEFS) {
        const badge = BADGE_DEFS[key];
        const isUnlocked = state.badges.includes(key);
        const div = document.createElement('div');
        div.className = `badge-item ${isUnlocked ? 'unlocked' : ''}`;
        div.innerHTML = `<div class="badge-icon">${badge.icon}</div><div style="font-weight:bold">${badge.name}</div><div style="font-size:0.8em;margin-top:5px;">${badge.description}</div>`;
        badgeGrid.appendChild(div);
    }

    // Render Chart
    const ctx = document.getElementById('progressChart').getContext('2d');
    const data = {
        labels: ['General', 'Math', 'Science', 'Storytime'],
        datasets: [{
            label: 'Questions Asked',
            data: [state.stats.general, state.stats.math, state.stats.science, state.stats.story],
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

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            },
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Questions by Subject', color: getComputedStyle(document.body).getPropertyValue('--text-color') }
            }
        }
    });
}

// Dark mode toggle
const darkModeToggle = document.getElementById('dark-mode-toggle');
const body = document.body;

if (localStorage.getItem('darkMode') === 'enabled') {
    body.classList.add('dark-mode');
    darkModeToggle.textContent = '☀️';
}

darkModeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('darkMode', 'enabled');
        darkModeToggle.textContent = '☀️';
    } else {
        localStorage.setItem('darkMode', 'disabled');
        darkModeToggle.textContent = '🌙';
    }
});

// Init
loadState();

// Settings Modal Logic
const apiKeyBtn = document.getElementById('api-key-btn');
const apiKeyModal = document.getElementById('api-key-modal');
const closeApiModal = document.getElementById('close-api-modal');
const saveApiKeyBtn = document.getElementById('save-api-key-btn');
const apiKeyInput = document.getElementById('api-key-input');
const ollamaModelInput = document.getElementById('ollama-model-input');
const ollamaModelSelect = document.getElementById('ollama-model-select');
const toggleCustomModelBtn = document.getElementById('toggle-custom-model-btn');
const providerRadios = document.querySelectorAll('input[name="ai-provider"]');
const geminiSettings = document.getElementById('gemini-settings');
const ollamaSettings = document.getElementById('ollama-settings');

let isCustomModelInput = false;

if (toggleCustomModelBtn) {
    toggleCustomModelBtn.addEventListener('click', () => {
        isCustomModelInput = !isCustomModelInput;
        if (isCustomModelInput) {
            if (ollamaModelSelect) ollamaModelSelect.style.display = 'none';
            if (ollamaModelInput) ollamaModelInput.style.display = 'block';
            toggleCustomModelBtn.innerHTML = '📋 List';
            toggleCustomModelBtn.title = 'Select from list';
        } else {
            if (ollamaModelSelect) ollamaModelSelect.style.display = 'block';
            if (ollamaModelInput) ollamaModelInput.style.display = 'none';
            toggleCustomModelBtn.innerHTML = '✏️ Custom';
            toggleCustomModelBtn.title = 'Toggle custom text input';
        }
    });
}

async function fetchOllamaModels() {
    if (!ollamaModelSelect) return;
    try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (!response.ok) return;
        const data = await response.json();
        
        if (data.models && data.models.length > 0) {
            ollamaModelSelect.innerHTML = '';
            data.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.name;
                option.textContent = model.name;
                ollamaModelSelect.appendChild(option);
            });
            
            // Re-select current model if it exists in the fetched list
            if (Array.from(ollamaModelSelect.options).some(opt => opt.value === OLLAMA_MODEL)) {
                ollamaModelSelect.value = OLLAMA_MODEL;
                if (isCustomModelInput) toggleCustomModelBtn.click(); // Switch to list mode
            }
        }
    } catch (e) {
        console.log("Could not fetch Ollama models automatically:", e);
    }
}

function updateSettingsVisibility() {
    const selectedProvider = document.querySelector('input[name="ai-provider"]:checked').value;
    if (selectedProvider === 'gemini') {
        if (geminiSettings) geminiSettings.style.display = 'block';
        if (ollamaSettings) ollamaSettings.style.display = 'none';
    } else {
        if (geminiSettings) geminiSettings.style.display = 'none';
        if (ollamaSettings) ollamaSettings.style.display = 'block';
    }
}

function openSettingsModal() {
    if (apiKeyInput) apiKeyInput.value = API_KEY;
    if (ollamaModelInput) ollamaModelInput.value = OLLAMA_MODEL;
    if (ollamaModelSelect) {
        if (Array.from(ollamaModelSelect.options).some(opt => opt.value === OLLAMA_MODEL)) {
            ollamaModelSelect.value = OLLAMA_MODEL;
            if (isCustomModelInput) toggleCustomModelBtn.click();
        } else {
            if (!isCustomModelInput && toggleCustomModelBtn) toggleCustomModelBtn.click();
        }
    }
    
    // Attempt to fetch fresh models from localhost
    if (AI_PROVIDER === 'ollama') {
        fetchOllamaModels();
    }
    
    if (providerRadios) {
        providerRadios.forEach(radio => {
            if (radio.value === AI_PROVIDER) radio.checked = true;
        });
    }
    updateSettingsVisibility();
    
    if (apiKeyModal) apiKeyModal.classList.remove('hidden');
}

function closeSettingsModal() {
    if (apiKeyModal) apiKeyModal.classList.add('hidden');
}

if (providerRadios) {
    providerRadios.forEach(radio => {
        radio.addEventListener('change', updateSettingsVisibility);
    });
}

if (apiKeyBtn) apiKeyBtn.addEventListener('click', openSettingsModal);
if (closeApiModal) closeApiModal.addEventListener('click', closeSettingsModal);

if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', () => {
        const checkedRadio = document.querySelector('input[name="ai-provider"]:checked');
        if (checkedRadio) AI_PROVIDER = checkedRadio.value;
        if (apiKeyInput) API_KEY = apiKeyInput.value.trim();
        if (isCustomModelInput && ollamaModelInput) {
            OLLAMA_MODEL = ollamaModelInput.value.trim() || 'llama3';
        } else if (!isCustomModelInput && ollamaModelSelect) {
            OLLAMA_MODEL = ollamaModelSelect.value;
        }
        
        localStorage.setItem('ai_provider', AI_PROVIDER);
        localStorage.setItem('gemini_api_key', API_KEY);
        localStorage.setItem('ollama_model', OLLAMA_MODEL);
        
        closeSettingsModal();
    });
}

function checkSettings() {
    if (AI_PROVIDER === 'gemini' && !API_KEY) {
        setTimeout(openSettingsModal, 1000);
    }
}
checkSettings();
