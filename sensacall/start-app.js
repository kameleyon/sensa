#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log(`
╔════════════════════════════════════════════╗
║         🌟 SENSACALL LAUNCHER 🌟           ║
╠════════════════════════════════════════════╣
║  AI-Powered Conversation Companion App     ║
╚════════════════════════════════════════════╝
`);

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
const backendNodeModules = path.join(__dirname, 'backend', 'node_modules');

function checkDependencies() {
    if (!fs.existsSync(nodeModulesPath)) {
        console.log('📦 Installing dependencies...\n');
        return new Promise((resolve, reject) => {
            const install = spawn('npm', ['install'], {
                stdio: 'inherit',
                shell: true,
                cwd: __dirname
            });

            install.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error('Failed to install dependencies'));
                } else {
                    console.log('✅ Dependencies installed successfully!\n');
                    resolve();
                }
            });
        });
    }
    return Promise.resolve();
}

async function startApp() {
    try {
        await checkDependencies();

        console.log('🚀 Starting SensaCall...\n');
        console.log('Choose an option:\n');
        console.log('1. Run Simple Integrated Server (Recommended for quick start)');
        console.log('2. Run Full Backend Server (TypeScript version)');
        console.log('3. Open HTML App directly (No server features)\n');

        // For automatic start, we'll use option 1
        const choice = process.argv[2] || '1';

        switch(choice) {
            case '1':
                console.log('Starting integrated server...\n');
                const server = spawn('node', ['integrated-server.js'], {
                    stdio: 'inherit',
                    cwd: __dirname
                });

                server.on('error', (err) => {
                    console.error('❌ Failed to start server:', err.message);
                    console.log('\nTrying alternative method...');
                    startFallbackServer();
                });
                break;

            case '2':
                console.log('Starting TypeScript backend...\n');
                const tsServer = spawn('npm', ['run', 'dev'], {
                    stdio: 'inherit',
                    shell: true,
                    cwd: path.join(__dirname, 'backend')
                });

                tsServer.on('error', (err) => {
                    console.error('❌ Failed to start TypeScript server:', err.message);
                });
                break;

            case '3':
                console.log('Opening HTML app...\n');
                const htmlPath = path.join(__dirname, 'sensacall-app.html');
                console.log(`\n✨ Open this file in your browser:\n${htmlPath}\n`);
                
                // Try to open in default browser
                const platform = process.platform;
                let openCmd;
                
                if (platform === 'win32') {
                    openCmd = 'start';
                } else if (platform === 'darwin') {
                    openCmd = 'open';
                } else {
                    openCmd = 'xdg-open';
                }
                
                spawn(openCmd, [htmlPath], { shell: true });
                break;

            default:
                console.log('Starting integrated server by default...\n');
                startIntegratedServer();
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        startFallbackServer();
    }
}

function startIntegratedServer() {
    const server = spawn('node', ['integrated-server.js'], {
        stdio: 'inherit',
        cwd: __dirname
    });

    server.on('error', (err) => {
        console.error('❌ Failed to start server:', err.message);
        startFallbackServer();
    });
}

function startFallbackServer() {
    console.log('\n🔄 Starting fallback simple server...\n');
    
    // Create a minimal server inline
    const express = require('express');
    const app = express();
    const PORT = 3001;

    app.use(express.static(__dirname));
    
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'sensacall-app.html'));
    });

    app.listen(PORT, () => {
        console.log(`
✅ Fallback server started successfully!

🌐 Open your browser and go to:
   http://localhost:${PORT}

📱 Or scan this URL on your mobile device:
   http://localhost:${PORT}

Press Ctrl+C to stop the server
        `);
    });
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down SensaCall...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n👋 Shutting down SensaCall...');
    process.exit(0);
});

// Start the application
startApp().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});