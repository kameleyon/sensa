const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store chat sessions
const sessions = new Map();
const conversations = new Map();

// AI Agents Configuration
const AGENTS = [
    { id: 'luna', name: 'Luna', personality: 'Empathetic and calming, like a caring friend who always knows what to say' },
    { id: 'phoenix', name: 'Phoenix', personality: 'Inspiring and transformative, helps you rise from challenges' },
    { id: 'sage', name: 'Sage', personality: 'Wise and knowledgeable, offers deep insights and thoughtful perspectives' },
    { id: 'zara', name: 'Zara', personality: 'Energetic and creative, brings excitement and fresh ideas' },
    { id: 'atlas', name: 'Atlas', personality: 'Analytical and strategic, excellent at planning and problem-solving' },
    { id: 'nova', name: 'Nova', personality: 'Innovative and futuristic, explores cutting-edge possibilities' },
    { id: 'echo', name: 'Echo', personality: 'Harmonious and reflective, helps you understand yourself better' },
    { id: 'kai', name: 'Kai', personality: 'Adaptive and flowing, goes with your energy and needs' },
    { id: 'indigo', name: 'Indigo', personality: 'Intuitive and mysterious, offers unique perspectives' },
    { id: 'raven', name: 'Raven', personality: 'Observant and direct, tells it like it is with care' },
    { id: 'storm', name: 'Storm', personality: 'Dynamic and powerful, brings energy and momentum' },
    { id: 'jade', name: 'Jade', personality: 'Balanced and grounding, helps you find your center' },
    { id: 'blaze', name: 'Blaze', personality: 'Passionate and motivating, ignites your inner fire' },
    { id: 'river', name: 'River', personality: 'Peaceful and flowing, brings calm and clarity' },
    { id: 'cosmos', name: 'Cosmos', personality: 'Expansive and philosophical, explores big ideas and meanings' }
];

// Health check first (before static middleware)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        agents: AGENTS.length,
        activeSessions: sessions.size
    });
});

// Get all agents
app.get('/api/agents', (req, res) => {
    res.json({ agents: AGENTS });
});

// Get specific agent
app.get('/api/agents/:id', (req, res) => {
    const agent = AGENTS.find(a => a.id === req.params.id);
    if (agent) {
        res.json(agent);
    } else {
        res.status(404).json({ error: 'Agent not found' });
    }
});

// Create new conversation
app.post('/api/conversations', (req, res) => {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const conversation = {
        id: conversationId,
        agentId: req.body.agentId || 'luna',
        mode: req.body.mode || 'Vent',
        messages: [],
        createdAt: new Date().toISOString()
    };
    conversations.set(conversationId, conversation);
    res.json(conversation);
});

// Get conversation
app.get('/api/conversations/:id', (req, res) => {
    const conversation = conversations.get(req.params.id);
    if (conversation) {
        res.json(conversation);
    } else {
        res.status(404).json({ error: 'Conversation not found' });
    }
});

// Add message to conversation
app.post('/api/conversations/:id/messages', (req, res) => {
    const conversation = conversations.get(req.params.id);
    if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
    }

    const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: req.body.text,
        sender: req.body.sender || 'user',
        timestamp: new Date().toISOString()
    };

    conversation.messages.push(message);
    res.json(message);
});

// Serve static files and root route
app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'sensacall-app.html'));
});

// WebSocket handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Store session
    sessions.set(socket.id, {
        connectedAt: new Date(),
        currentAgent: null,
        currentMode: 'Vent'
    });

    // Join conversation room
    socket.on('join_conversation', (data) => {
        socket.join(data.conversationId);
        const session = sessions.get(socket.id);
        if (session) {
            session.conversationId = data.conversationId;
            session.currentAgent = data.agentId;
            session.currentMode = data.mode;
        }
        socket.emit('joined', { conversationId: data.conversationId });
    });

    // Handle messages
    socket.on('send_message', (data) => {
        const { conversationId, message, agentId, mode } = data;
        
        // Broadcast to conversation room
        io.to(conversationId).emit('new_message', {
            message,
            sender: 'user',
            timestamp: new Date().toISOString()
        });

        // Simulate agent typing
        setTimeout(() => {
            io.to(conversationId).emit('agent_typing', { agentId });
        }, 500);

        // Simulate agent response (in production, this would call AI API)
        setTimeout(() => {
            const agent = AGENTS.find(a => a.id === agentId);
            const response = {
                message: `[${agent.name} in ${mode} mode] I understand what you're saying. ${agent.personality}. How can I help you further?`,
                sender: agentId,
                timestamp: new Date().toISOString()
            };
            io.to(conversationId).emit('new_message', response);
        }, 2000);
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
        socket.to(data.conversationId).emit('user_typing', {
            userId: socket.id
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        sessions.delete(socket.id);
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`
    ✨ SensaCall Integrated Server Started ✨
    =========================================
    🌐 Frontend: http://localhost:${PORT}
    🔌 API: http://localhost:${PORT}/api
    🔗 WebSocket: ws://localhost:${PORT}
    ❤️  Health: http://localhost:${PORT}/api/health
    =========================================
    
    Available Endpoints:
    - GET  /                           (Main App)
    - GET  /api/health                 (Health Check)
    - GET  /api/agents                 (List Agents)
    - GET  /api/agents/:id             (Get Agent)
    - POST /api/conversations          (Create Conversation)
    - GET  /api/conversations/:id      (Get Conversation)
    - POST /api/conversations/:id/messages (Add Message)
    
    WebSocket Events:
    - join_conversation
    - send_message
    - typing
    - new_message
    - agent_typing
    - user_typing
    
    Press Ctrl+C to stop the server
    =========================================
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received, closing server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});