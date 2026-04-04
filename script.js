// ==========================================
// Authentication System Logic
// ==========================================
const authScreen = document.getElementById('auth-screen');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const switchAuthMode = document.getElementById('switch-auth-mode');
const authBtn = document.getElementById('auth-btn');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authError = document.getElementById('auth-error');

const signoutBtn = document.getElementById('signout-btn');

let isLoginMode = true;
let memoryUser = null;
let memoryUsers = {};

function getActiveUser() {
    try { return localStorage.getItem('nexus_user') || memoryUser; } 
    catch { return memoryUser; }
}

function setActiveUser(email) {
    try { localStorage.setItem('nexus_user', email); } 
    catch { memoryUser = email; }
}

function clearActiveUser() {
    try { localStorage.removeItem('nexus_user'); } 
    catch { memoryUser = null; }
}

function getUsers() {
    try { return JSON.parse(localStorage.getItem('nexus_users')) || memoryUsers; } 
    catch { return memoryUsers; }
}

function setUsers(u) {
    try { localStorage.setItem('nexus_users', JSON.stringify(u)); } 
    catch { memoryUsers = u; }
}

// Check if user is already logged in
if (getActiveUser()) {
    authScreen.style.display = 'none';
}

switchAuthMode.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    authError.textContent = '';
    authForm.reset();
    if (isLoginMode) {
        authTitle.textContent = 'Welcome to Nexus AI';
        authSubtitle.textContent = 'Login to access the premium chat experience.';
        authBtn.textContent = 'Login';
        switchAuthMode.textContent = 'Sign up';
        switchAuthMode.parentElement.childNodes[0].textContent = "Don't have an account? ";
    } else {
        authTitle.textContent = 'Create Account';
        authSubtitle.textContent = 'Join Nexus AI to start chatting.';
        authBtn.textContent = 'Sign Up';
        switchAuthMode.textContent = 'Login';
        switchAuthMode.parentElement.childNodes[0].textContent = "Already have an account? ";
    }
});

function loginSuccess() {
    authForm.reset();
    authScreen.style.opacity = '0';
    setTimeout(() => {
        authScreen.style.display = 'none';
        
        // Reset chat UI
        messagesContainer.innerHTML = `
            <div class="welcome-screen" id="welcome-screen">
                <h1>How can I help you today?</h1>
                <p>Enter a prompt below and watch the magic unfold.</p>
            </div>`;
        renderHistory();
        
        // Update avatars if needed
        document.querySelectorAll('.user .avatar').forEach(updateAvatar);
    }, 500);
}

function updateAvatar(element) {
    if (getActiveUser() === 'sashensandamith@gmail.com') {
        element.innerHTML = `<img src="avatar.png" alt="Profile" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        element.style.background = 'none';
        element.style.border = 'none';
    } else {
        // Reset to default SVG for other users
        element.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
        element.style.background = 'var(--glass-bg)';
        element.style.border = '1px solid var(--glass-border)';
    }
}

authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = authEmail.value.trim();
    const password = authPassword.value.trim();
    authError.textContent = '';

    const users = getUsers();

    if (isLoginMode) {
        if (users[email] && users[email].password === password) {
            setActiveUser(email);
            loginSuccess();
        } else {
            authError.textContent = 'Invalid email or password.';
        }
    } else {
        if (users[email]) {
            authError.textContent = 'Account already exists. Please login.';
        } else {
            users[email] = { password };
            setUsers(users);
            setActiveUser(email);
            loginSuccess();
        }
    }
});

if (signoutBtn) {
    signoutBtn.addEventListener('click', () => {
        clearActiveUser();
        currentSession = Date.now().toString();
        // Show auth screen again smoothly without reload
        authScreen.style.display = 'flex';
        setTimeout(() => authScreen.style.opacity = '1', 10);
        authForm.reset();
    });
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

let currentSession = Date.now().toString();

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
    const API_KEY = 'AIzaSyBR89YTv3fknrGwEOA4m0Qrry6PHevk5pQ';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    
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
            return "Sorry, I encountered an error connecting to the AI. Please try again.";
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
    const activeUser = localStorage.getItem('nexus_user') || 'anonymous';
    try {
        const data = localStorage.getItem(`nexus_db_${activeUser}`);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        // Fallback for file:/// missing localStorage
        if (!memoryDB) memoryDB = {};
        if (!memoryDB[activeUser]) memoryDB[activeUser] = {};
        return memoryDB[activeUser];
    }
}

function saveDB(db) {
    const activeUser = localStorage.getItem('nexus_user') || 'anonymous';
    try {
        localStorage.setItem(`nexus_db_${activeUser}`, JSON.stringify(db));
    } catch (e) {
        if (!memoryDB) memoryDB = {};
        memoryDB[activeUser] = db;
    }
}

function saveCurrentChat() {
    const htmlMessages = messagesContainer.innerHTML;
    const titleLine = document.querySelector('.message.user .msg-content')?.textContent;
    const title = titleLine ? titleLine.substring(0, 20) + '...' : 'New Session';
    
    const db = getDB();
    db[currentSession] = {
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
        currentSession = sessionId;
        messagesContainer.innerHTML = db[sessionId].html;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

newChatBtn.addEventListener('click', () => {
    currentSession = Date.now().toString();
    messagesContainer.innerHTML = `
        <div class="welcome-screen" id="welcome-screen">
            <h1>How can I help you today?</h1>
            <p>Enter a prompt below and watch the magic unfold.</p>
        </div>`;
});

// Load history on initial startup
try { window.onload = renderHistory; } catch(e) {}
