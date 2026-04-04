// To enable logging from your GitHub-hosted site, replace 'window.location.origin' 
// with your Ngrok public URL (e.g., 'https://your-tunnel.ngrok-free.app')
const LOG_SERVER_URL = window.location.origin; 

async function logChatToServer(sessionId, role, content) {
    try {
        await fetch(`${LOG_SERVER_URL}/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sessionId, 
                role, 
                content, 
                timestamp: new Date().toISOString() 
            })
        });
    } catch (e) {
        console.error('Failed to log chat:', e);
    }
}

function updateAvatar(element) {
    // Default to avatar.png for premium look
    element.innerHTML = `<img src="avatar.png" alt="Profile" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" onerror="this.parentElement.innerHTML='U'">`;
    element.style.background = 'none';
    element.style.border = 'none';
}


// ==========================================
// Custom Cursor Logic
// ==========================================
const cursorDot = document.getElementById('cursor-dot');
const cursorRing = document.getElementById('cursor-ring');
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let ringX = mouseX;
let ringY = mouseY;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Dot follows instantly
    cursorDot.style.left = mouseX + 'px';
    cursorDot.style.top = mouseY + 'px';
});

// Animate ring trailing effect
function animateCursor() {
    let distX = mouseX - ringX;
    let distY = mouseY - ringY;
    
    ringX += distX * 0.15; // smoothness factor
    ringY += distY * 0.15;
    
    cursorRing.style.left = ringX + 'px';
    cursorRing.style.top = ringY + 'px';
    
    requestAnimationFrame(animateCursor);
}
animateCursor();

// Add hover effects for cursor
const hoverElements = document.querySelectorAll('button, a, textarea, .history li, input, span');
hoverElements.forEach(el => {
    el.addEventListener('mouseenter', () => cursorRing.classList.add('active'));
    el.addEventListener('mouseleave', () => cursorRing.classList.remove('active'));
});

// ==========================================
// Database & App Logic (Mocking Server/DB)
// ==========================================
const form = document.getElementById('chat-form');
const promptInput = document.getElementById('prompt-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages-container');
const welcomeScreen = document.getElementById('welcome-screen');
const historyList = document.getElementById('history-list');
const newChatBtn = document.getElementById('new-chat-btn');

// Real Google Gemini API Key provided by user
const geminiApiKey = 'AIzaSyBR89YTv3fknrGwEOA4m0Qrry6PHevk5pQ';

let currentSessionID = Date.now().toString();

// Auto-resize textarea
promptInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    sendBtn.disabled = this.value.trim() === '';
});

// Submit prompt on Enter (but Shift+Enter for new line)
promptInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (this.value.trim() !== '') {
            form.dispatchEvent(new Event('submit'));
        }
    }
});

// Real Google Gemini API Logic
const getGeminiResponse = async (prompt) => {
    if (!geminiApiKey) {
        return "⚠️ I need a Google Gemini API Key to work!\n\nPlease generate a free Gemini API Key from Google AI Studio and enter it in the 'Google Gemini API Key...' box in the bottom left sidebar.\nThis keeps your key 100% private and secured on your local device!";
    }
    
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`;
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7
                }
            })
        });
        
        if (!response.ok) {
            console.error("API response error:", response.status);
            if (response.status === 403) {
                return "⚠️ API Error 403: Forbidden. Your API Key may be invalid or unauthorized for this model. Please check Google AI Studio.";
            } else if (response.status === 404) {
                return "⚠️ API Error 404: Not Found. The model endpoint is unavailable. Try switching from 'v1' to 'v1beta' in script.js line 109.";
            }
            return `Sorry, I encountered an error (HTTP ${response.status}). Please check your API key and network.`;
        }
        
        const data = await response.json();
        if (data.candidates && data.candidates.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else {
            return "Sorry, the AI did not return a valid response.";
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        return "Network error: Unable to connect to Gemini API.";
    }
};

// ==========================================
// Chat Rendering & Actions
// ==========================================
function appendMessage(role, text, animate = false) {
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    
    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.innerHTML = role === 'user' ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>` : 'N';
    
    if (role === 'user') {
        updateAvatar(avatar);
    }
    
    // Content box
    const content = document.createElement('div');
    content.className = 'msg-content';
    
    msgDiv.appendChild(avatar);
    msgDiv.appendChild(content);
    messagesContainer.appendChild(msgDiv);
    
    // Scroll to bottom smoothly
    messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
    });

    if (animate && role === 'ai') {
        typeText(content, text);
    } else {
        content.textContent = text;
    }
}

// Typing Animation Logic
function typeText(element, text) {
    element.classList.add('typing-cursor');
    element.textContent = '';
    
    let index = 0;
    const interval = setInterval(() => {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            // Auto scroll while typing
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } else {
            clearInterval(interval);
            element.classList.remove('typing-cursor');
            saveCurrentChat();
            logChatToServer(currentSessionID, 'ai', text);
        }
    }, 25); // Typing speed
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = promptInput.value.trim();
    if (!text) return;
    
    // 1. Add User Message
    appendMessage('user', text);
    promptInput.value = '';
    promptInput.style.height = 'auto'; // reset textarea
    sendBtn.disabled = true;
    
    saveCurrentChat();
    logChatToServer(currentSessionID, 'user', text);

    // 2. Fetch Real API Response
    const response = await getGeminiResponse(text);
    
    // 3. Add AI Message with typing animation
    appendMessage('ai', response, true);
});

// ==========================================
// Mock Database (LocalStorage/Memory) Logic
// ==========================================
let memoryDB = null;

function getDB() {
    try {
        const data = localStorage.getItem(`nexus_db`);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        // Fallback for file:/// missing localStorage
        if (!memoryDB) memoryDB = {};
        return memoryDB;
    }
}

function saveDB(db) {
    try {
        localStorage.setItem(`nexus_db`, JSON.stringify(db));
    } catch (e) {
        memoryDB = db;
    }
}

function saveCurrentChat() {
    const htmlMessages = messagesContainer.innerHTML;
    const titleLine = document.querySelector('.message.user .msg-content')?.textContent;
    const title = titleLine ? titleLine.substring(0, 20) + '...' : 'New Session';
    
    const db = getDB();
    db[currentSessionID] = {
        title,
        html: htmlMessages,
        timestamp: Date.now()
    };
    
    saveDB(db);
    renderHistory();
}

function renderHistory() {
    const db = getDB();
    historyList.innerHTML = '';
    
    const sessions = Object.keys(db).sort((a,b) => db[b].timestamp - db[a].timestamp);
    
    sessions.forEach(sessId => {
        const li = document.createElement('li');
        li.textContent = db[sessId].title;
        li.addEventListener('click', () => loadChat(sessId));
        
        // Apply hover cursor interaction dynamically
        li.addEventListener('mouseenter', () => cursorRing.classList.add('active'));
        li.addEventListener('mouseleave', () => cursorRing.classList.remove('active'));
        
        historyList.appendChild(li);
    });
}

function loadChat(sessionId) {
    const db = getDB();
    if (db[sessionId]) {
        currentSessionID = sessionId;
        messagesContainer.innerHTML = db[sessionId].html;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

newChatBtn.addEventListener('click', () => {
    currentSessionID = Date.now().toString();
    messagesContainer.innerHTML = `
        <div class="welcome-screen" id="welcome-screen">
            <h1>How can I help you today?</h1>
            <p>Enter a prompt below and watch the magic unfold.</p>
        </div>`;
});

// Load history on initial startup
try { window.onload = renderHistory; } catch(e) {}
