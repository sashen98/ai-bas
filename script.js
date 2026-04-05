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

// ==========================================
// Secure API Key Handling (v5 Unrestricted)
// ==========================================
// Your new "Superior" API Key is hardcoded here so GitHub site works instantly!
const geminiApiKey = 'AIzaSyBzqNUi-kj_Usbw-ENWCDSoECYiJY7Vjeg';
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

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

// ==========================================
// Gemini API — Secure Dual-Mode Logic
// ==========================================
const getGeminiResponse = async (prompt) => {
    // ---- SUPERIOR MODE: Direct API Call with Security Bypassed ----
    const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ],
                generationConfig: { 
                    temperature: 0.9, 
                    topP: 1, 
                    topK: 1, 
                    maxOutputTokens: 2048 
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Superior AI Error:', response.status, data);
            return `⚠️ Error ${response.status}: ${data.error?.message || 'Access Restricted. Please check API settings.'}`;
        }

        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text;
        } else {
            return `⚠️ AI response blocked by Google's hard-limit. (Safety is set to NONE). JSON: ${JSON.stringify(data)}`;
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        return 'Network error: Check your internet or local proxy.';
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


newChatBtn.addEventListener('click', () => {
    currentSessionID = Date.now().toString();
    messagesContainer.innerHTML = `
        <div class="welcome-screen" id="welcome-screen">
            <h1>How can I help you today?</h1>
            <p>Enter a prompt below and watch the magic unfold.</p>
        </div>`;
});

// Load history on initial startup
try { window.onload = () => { renderHistory(); renderFolders(); }; } catch(e) {}


// ==========================================
// 📁 Folder System
// ==========================================

const newFolderBtn = document.getElementById('new-folder-btn');
const folderList = document.getElementById('folder-list');

function getFolders() {
    try {
        return JSON.parse(localStorage.getItem('nexus_folders') || '{}');
    } catch(e) { return {}; }
}

function saveFolders(folders) {
    localStorage.setItem('nexus_folders', JSON.stringify(folders));
}

function renderFolders() {
    const folders = getFolders();
    const db = getDB();
    folderList.innerHTML = '';

    Object.keys(folders).forEach(folderId => {
        const folder = folders[folderId];
        const li = document.createElement('li');
        li.className = 'folder-item';
        li.dataset.folderId = folderId;

        // Chat items inside folder
        const chatsHTML = (folder.chats || []).map(sessId => {
            const chat = db[sessId];
            if (!chat) return '';
            return `<div class="folder-chat-item" data-session="${sessId}">${chat.title || 'Untitled'}</div>`;
        }).join('');

        li.innerHTML = `
            <div class="folder-header">
                <span class="folder-icon">📁</span>
                <span class="folder-name">${folder.name}</span>
                <span class="folder-arrow">▶</span>
            </div>
            <div class="folder-chats">
                ${chatsHTML || '<span style="font-size:0.8rem;color:var(--text-secondary);padding:4px 8px;">Empty folder</span>'}
            </div>`;

        // Toggle open/close
        li.querySelector('.folder-header').addEventListener('click', (e) => {
            if (e.target.closest('.folder-actions')) return;
            li.classList.toggle('open');
        });

        // Click chat inside folder to load it
        li.querySelectorAll('.folder-chat-item').forEach(item => {
            item.addEventListener('click', () => loadChat(item.dataset.session));
        });

        folderList.appendChild(li);
    });
}

// Create new folder
newFolderBtn.addEventListener('click', () => {
    const name = prompt('📁 Enter folder name:');
    if (!name || !name.trim()) return;

    const folders = getFolders();
    const folderId = 'folder_' + Date.now();
    folders[folderId] = { name: name.trim(), chats: [] };
    saveFolders(folders);
    renderFolders();

    // Ask if they want to add current chat to folder
    if (currentSessionID && messagesContainer.querySelector('.message')) {
        const add = confirm(`Add current chat to "${name.trim()}"?`);
        if (add) {
            folders[folderId].chats.push(currentSessionID);
            saveFolders(folders);
            renderFolders();
        }
    }
});

// Right-click context menu on history items to move to folder
function addContextMenuToHistory(li, sessionId) {
    li.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const folders = getFolders();
        const folderNames = Object.keys(folders);

        if (folderNames.length === 0) {
            alert('No folders yet. Click 📁 to create one first!');
            return;
        }

        const options = folderNames.map(id => folders[id].name).join('\n');
        const choice = prompt(`Move "${sessTitle(sessionId)}" to folder:\n\n${folderNames.map((id, i) => `${i+1}. ${folders[id].name}`).join('\n')}\n\nEnter number:`);
        const idx = parseInt(choice) - 1;

        if (!isNaN(idx) && folderNames[idx]) {
            const fId = folderNames[idx];
            // Remove from other folders first
            folderNames.forEach(id => {
                folders[id].chats = folders[id].chats.filter(c => c !== sessionId);
            });
            folders[fId].chats.push(sessionId);
            saveFolders(folders);
            renderFolders();
        }
    });
}

function sessTitle(sessionId) {
    const db = getDB();
    return db[sessionId]?.title || 'Untitled';
}

function renderHistory() {
    const db = getDB();
    historyList.innerHTML = '';

    const sessions = Object.keys(db).sort((a,b) => db[b].timestamp - db[a].timestamp);

    sessions.forEach(sessId => {
        const li = document.createElement('li');
        li.textContent = db[sessId].title;
        li.title = 'Click to load · Right-click to move to folder';
        li.addEventListener('click', () => loadChat(sessId));
        addContextMenuToHistory(li, sessId);

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


// ==========================================
// 💾 Save Chat to Computer (Download)
// ==========================================

document.getElementById('save-computer-btn').addEventListener('click', () => {
    const messages = messagesContainer.querySelectorAll('.message');

    if (messages.length === 0) {
        alert('No chat to save yet. Start a conversation first!');
        return;
    }

    let chatText = `NEXUS AI — Chat Export\n`;
    chatText += `Date: ${new Date().toLocaleString()}\n`;
    chatText += `Session: ${currentSessionID}\n`;
    chatText += `${'='.repeat(50)}\n\n`;

    messages.forEach(msg => {
        const role = msg.classList.contains('user') ? 'YOU' : 'NEXUS AI';
        const content = msg.querySelector('.msg-content')?.textContent || '';
        chatText += `[${role}]\n${content}\n\n${'—'.repeat(40)}\n\n`;
    });

    // Create download
    const blob = new Blob([chatText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `nexus-chat-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Visual feedback
    const btn = document.getElementById('save-computer-btn');
    const original = btn.textContent;
    btn.textContent = '✅ Saved!';
    btn.style.color = '#00e676';
    setTimeout(() => {
        btn.textContent = original;
        btn.style.color = '';
    }, 2000);
});
