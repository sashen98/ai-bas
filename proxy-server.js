// ============================================
// Nexus AI - Secure Gemini API Proxy Server
// ============================================
// Your API key lives ONLY in .env - never in code!
// Run: node proxy-server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// ----- Validate API Key on startup -----
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error('\n❌ ERROR: GEMINI_API_KEY is not set in your .env file!');
    console.error('   Create a .env file with: GEMINI_API_KEY=your_key_here\n');
    process.exit(1);
}

// ----- Middleware -----
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve frontend files

// ----- Ensure chat/db dirs exist -----
const chatDir = path.join(__dirname, 'Chat');
const dbDir = path.join(__dirname, 'Database');
if (!fs.existsSync(chatDir)) fs.mkdirSync(chatDir);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);

// ============================================
// POST /api/chat  — Secure Gemini Proxy
// ============================================
app.post('/api/chat', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid prompt' });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        // Use dynamic import for node-fetch or built-in fetch (Node 18+)
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
            console.error(`[Gemini Error] ${response.status}:`, data.error?.message);
            return res.status(response.status).json({ error: data.error?.message || 'Gemini API error' });
        }

        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return res.json({ reply: data.candidates[0].content.parts[0].text });
        } else if (data.promptFeedback?.blockReason) {
            return res.json({ reply: `⚠️ Blocked: ${data.promptFeedback.blockReason}` });
        } else {
            return res.json({ reply: 'Sorry, Gemini returned an empty response.' });
        }

    } catch (err) {
        console.error('[Fetch Error]', err.message);
        return res.status(500).json({ error: 'Network error connecting to Gemini.' });
    }
});

// ============================================
// POST /log  — Chat message logging
// ============================================
app.post('/log', (req, res) => {
    const { sessionId, role, content, timestamp } = req.body;
    if (!sessionId) return res.status(400).send('Missing sessionId');

    const logLine = `[${timestamp}] ${role.toUpperCase()}: ${content}\n-----------------------------------\n`;
    fs.appendFileSync(path.join(chatDir, `${sessionId}.txt`), logLine, 'utf8');
    console.log(`[LOG] Session ${sessionId} (${role})`);
    res.send('Logged');
});

// ============================================
// POST /database  — Full session JSON backup
// ============================================
app.post('/database', (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).send('Missing sessionId');

    fs.writeFileSync(path.join(dbDir, `${sessionId}.json`), JSON.stringify(req.body, null, 2), 'utf8');
    console.log(`[DB]  Backup saved: ${sessionId}`);
    res.send('DB Saved');
});

// ============================================
// Start server
// ============================================
app.listen(PORT, () => {
    console.log('\n--------------------------------------------------');
    console.log('  Nexus AI — Secure Node.js Proxy Server');
    console.log(`  Listening on → http://localhost:${PORT}`);
    console.log('  API key loaded from .env ✅ (never in code!)');
    console.log('--------------------------------------------------\n');
});
