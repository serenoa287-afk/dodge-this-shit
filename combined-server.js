// Combined server that runs both HTTP game server and WebSocket multiplayer server
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const os = require('os');

const HTTP_PORT = process.env.HTTP_PORT || 3000;
const WS_PORT = process.env.WS_PORT || 8080;

// Import multiplayer server logic
const MultiplayerServer = require('./multiplayer-server');

// Function to get host IP address dynamically
function getHostIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost'; // Fallback
}

class CombinedServer {
    constructor() {
        this.httpServer = this.createHttpServer();
        this.multiplayerServer = new MultiplayerServer(WS_PORT);
    }
    
    createHttpServer() {
        const MIME_TYPES = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.txt': 'text/plain',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.mp4': 'video/mp4',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.eot': 'application/vnd.ms-fontobject',
            '.otf': 'font/otf'
        };
        
        return http.createServer((req, res) => {
            console.log(`${req.method} ${req.url}`);
            
            // Handle root path
            let filePath = req.url === '/' ? '/index.html' : req.url;
            filePath = path.join(__dirname, filePath);
            
            // Security check
            if (!filePath.startsWith(__dirname)) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }
            
            // Get file extension
            const extname = path.extname(filePath);
            const contentType = MIME_TYPES[extname] || 'application/octet-stream';
            
            // Read and serve file
            fs.readFile(filePath, (err, content) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        if (req.url === '/') {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(this.getDefaultPage());
                        } else {
                            res.writeHead(404);
                            res.end('File not found');
                        }
                    } else {
                        res.writeHead(500);
                        res.end(`Server Error: ${err.code}`);
                    }
                } else {
                    res.writeHead(200, { 
                        'Content-Type': contentType,
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    });
                    res.end(content, 'utf-8');
                }
            });
        });
    }
    
    getDefaultPage() {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Dodge This Shit - Combined Server</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; background: #0f0c29; color: white; }
                    h1 { color: #00ffea; }
                    .container { max-width: 800px; margin: 0 auto; }
                    .server-info { background: rgba(0,255,234,0.1); padding: 20px; border-radius: 10px; margin: 20px 0; }
                    .btn { display: inline-block; padding: 12px 24px; background: #00ffea; color: black; 
                           text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0; }
                    .btn-secondary { background: #ff6b6b; margin-left: 10px; }
                    .status { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 10px; }
                    .status.running { background: #00ff00; animation: pulse 2s infinite; }
                    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🚀 Dodge This Shit - Combined Server</h1>
                    
                    <div class="server-info">
                        <h3>Server Status</h3>
                        <p><span class="status running"></span> HTTP Server: Running on port ${HTTP_PORT}</p>
                        <p><span class="status running"></span> WebSocket Server: Running on port ${WS_PORT}</p>
                        
                        <h3>Quick Links</h3>
                        <p>
                            <a href="/" class="btn">Play Game</a>
                            <a href="https://github.com/serenoa287-afk/dodge-this-shit" class="btn btn-secondary">GitHub</a>
                        </p>
                        
                        <h3>Multiplayer Setup</h3>
                        <p>To play multiplayer:</p>
                        <ol>
                            <li>Open the game in your browser</li>
                            <li>Click the "🎮 Multiplayer" button in the top-right</li>
                            <li>Connect to: <code>ws://${getHostIp()}:${WS_PORT}</code></li>
                            <li>Create or join a lobby</li>
                        </ol>
                        
                        <h3>Features</h3>
                        <ul>
                            <li>Single-player mode with progressive difficulty</li>
                            <li>Multiplayer mode with lobby system (up to 4 players)</li>
                            <li>30-second rounds with row/column enemy patterns</li>
                            <li>Real-time player movement and chat</li>
                            <li>Score tracking and leaderboards</li>
                        </ul>
                    </div>
                    
                    <p>Game features: Player movement (WASD/Arrow keys), Dash ability (Space), 4 enemy types, Progressive difficulty, 30-second rounds</p>
                </div>
            </body>
            </html>
        `;
    }
    
    start() {
        // Start HTTP server
        this.httpServer.listen(HTTP_PORT, () => {
            console.log(`
            🎮 Dodge This Shit - Combined Server
            ========================================
            HTTP Server running at:
            - Local: http://localhost:${HTTP_PORT}
            - Network: http://[your-ip]:${HTTP_PORT}
            `);
        });
        
        // Start WebSocket server
        this.multiplayerServer.start();
        
        console.log(`
            WebSocket Server running at:
            - Local: ws://localhost:${WS_PORT}
            - Network: ws://${getHostIp()}:${WS_PORT}
            
            Game Features:
            - Single-player with progressive difficulty
            - Multiplayer with lobby system (up to 4 players)
            - 30-second rounds with row/column patterns
            - Real-time movement and chat
            - Score tracking and leaderboards
            
            Press Ctrl+C to stop both servers
            `);
    }
    
    stop() {
        this.httpServer.close();
        this.multiplayerServer.stop();
        console.log('Both servers stopped');
    }
}

// Start server if run directly
if (require.main === module) {
    const server = new CombinedServer();
    server.start();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n👋 Shutting down combined server...');
        server.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        console.log('\n👋 Received SIGTERM, shutting down...');
        server.stop();
        process.exit(0);
    });
}

module.exports = CombinedServer;