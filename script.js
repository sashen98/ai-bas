// Configure Remote Logging (GitHub Support)
let LOG_SERVER_URL = window.location.origin; 

// If on GitHub Pages, only enable remote logging if a custom URL is saved
if (window.location.hostname.includes('github.io')) {
    const savedUrl = localStorage.getItem('nexus_remote_url');
    if (savedUrl && savedUrl.startsWith('http')) {
        LOG_SERVER_URL = savedUrl;
    } else {
        LOG_SERVER_URL = null; // Disable logging on GitHub by default
    }
}

// Sidebar Remote Sync UI Connector
document.addEventListener('DOMContentLoaded', () => {
    const remoteInput = document.getElementById('remote-url-input');
    const saveRemoteBtn = document.getElementById('save-remote-btn');
    
    if (remoteInput && saveRemoteBtn) {
        remoteInput.value = localStorage.getItem('nexus_remote_url') || '';
        
        saveRemoteBtn.addEventListener('click', () => {
            const url = remoteInput.value.trim();
            if (url.startsWith('http')) {
                localStorage.setItem('nexus_remote_url', url);
                LOG_SERVER_URL = url;
                alert("Nexus AI: Connected to local server!");
                saveCurrentChat(); // Trigger a backup
            } else if (url === "") {
                localStorage.removeItem('nexus_remote_url');
                LOG_SERVER_URL = window.location.hostname.includes('github.io') ? null : window.location.origin;
                alert("Nexus AI: Local sync disabled.");
            } else {
                alert("Please enter a valid URL (starting with http:// or https://)");
            }
        });
    }
});

async function logChatToServer(sessionId, role, content) {
    if (!LOG_SERVER_URL || LOG_SERVER_URL === window.location.origin && window.location.hostname.includes('github.io')) return;
    
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
        // Silent fail for logging
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
const geminiApiKey = 'AIzaSyBzqNUi-kj_Usbw-ENWCDSoECYiJY7Vjeg';

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

// Helper to discover what models your key actually supports
const listAvailableModels = async () => {
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${geminiApiKey}`);
        const data = await res.json();
        return data.models?.map(m => m.name) || [];
    } catch (e) {
        return [];
    }
};

// Real Google Gemini API Logic
const getGeminiResponse = async (prompt) => {
    // Stable v1 endpoint for gemini-1.5-flash
    const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ],
                generationConfig: {
                    temperature: 0.9,
                    topP: 1,
                    topK: 1,
                    maxOutputTokens: 2048,
                }
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error("API response error:", response.status, data);
            if (response.status === 404) {
                 return "⚠️ API Error 404: The model name you're using (gemini-1.5-flash) might not be available for your specific key. Please try using 'gemini-pro'.";
            }
            if (response.status === 403) {
                 return "⚠️ API Error 403: Forbidden. Your API Key might have restrictions or is not authorized for this specific model.";
            }
            return `⚠️ Error ${response.status}: ${data.error?.message || "Internal API Error"}`;
        }
        
        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        } else if (data.promptFeedback && data.promptFeedback.blockReason) {
             return `⚠️ Response Blocked: ${data.promptFeedback.blockReason}. Even with filters off, some prompts are restricted by Google's safety policy.`;
        } else if (data.candidates && data.candidates[0].finishReason === 'SAFETY') {
            return "⚠️ Response blocked by safety filters.";
        } else {
            return "Sorry, the AI did not return a valid response. Please try again.";
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        return "Network error: Unable to connect to Gemini API. Check your internet connection.";
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
    
    // 3. Log AI Response immediately (for persistence)
    logChatToServer(currentSessionID, 'ai', response);

    // 4. Add AI Message with typing animation
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

    // v4: Database Backup (Full JSON)
    if (LOG_SERVER_URL && (!window.location.hostname.includes('github.io') || localStorage.getItem('nexus_remote_url'))) {
        fetch(`${LOG_SERVER_URL}/database`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: currentSessionID,
                title,
                data: db[currentSessionID],
                fullHistory: db,
                timestamp: new Date().toISOString()
            })
        }).catch(e => {});
    }
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
