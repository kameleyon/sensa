# SensaCall - Quick Start Guide

## 🚀 Instant Launch (Recommended)

### Option 1: Simple Integrated App (Fastest)
```bash
# Open the HTML file directly in your browser:
sensacall-app.html
```
This gives you the full chat interface with all 15 AI agents and 6 conversation modes!

### Option 2: With Server Features
```bash
# Install dependencies (first time only)
npm install

# Start the integrated server
npm run start:integrated
```
Then open http://localhost:3001 in your browser.

### Option 3: Auto-Launcher
```bash
node start-app.js
```
This will guide you through different launch options.

## 📱 Features Included

✅ **15 AI Agents**: Luna, Phoenix, Sage, Zara, Atlas, Nova, Echo, Kai, Indigo, Raven, Storm, Jade, Blaze, River, Cosmos

✅ **6 Conversation Modes**:
- 🌊 **Vent** - Express feelings and get emotional support
- 💬 **Gossip** - Fun, casual conversations
- 🎯 **Coach** - Get motivated and guided
- 🧩 **Solver** - Problem-solving assistance
- 🚀 **Hype** - Energy and encouragement
- 💡 **Advice** - Thoughtful guidance

✅ **Additional Features**:
- 🎨 Custom tone slider (Casual ↔ Professional)
- 🌙 Dark/Light theme toggle
- ⚡ Real-time chat with typing indicators
- 🔌 WebSocket support for live updates
- 📱 Mobile-responsive design
- 🎨 Beautiful color palette

## 🎨 Color Palette Used
- Primary: #1A517B
- Primary Light: #1d7693
- Accent: #239ba8
- Warning: #e56b00
- Highlight: #fcb81c
- Background: #f1f5fc
- Neutral: #b4c4c0

## 🔧 Technical Stack
- Frontend: HTML5, CSS3, JavaScript (with React components available)
- Backend: Node.js, Express, Socket.io
- AI Integration: OpenRouter API (Llama 3.2)
- Database: Supabase (configured)
- Real-time: WebSocket/Socket.io

## 📝 Configuration
The app is pre-configured with:
- OpenRouter API key for AI responses
- Supabase connection for data persistence
- WebSocket server for real-time features

## 🌐 API Endpoints (When running with server)
- `GET /api/health` - Health check
- `GET /api/agents` - List all agents
- `POST /api/conversations` - Create new conversation
- WebSocket events for real-time chat

## 💡 Tips
1. The HTML app (`sensacall-app.html`) works standalone - perfect for quick testing!
2. Run with the server for full features including data persistence
3. All agents have unique personalities - try different ones!
4. Adjust the tone slider to change conversation style
5. Switch between light/dark themes with the toggle button

## 🐛 Troubleshooting
- If port 3001 is busy, the server will try alternative ports
- Make sure Node.js is installed (version 14+)
- Run `npm install` if you see dependency errors

## 🎉 Enjoy SensaCall!
Start chatting with your AI companions and explore different conversation modes!