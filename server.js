const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

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

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Handle root path
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);
  
  // Security check: prevent directory traversal
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
        // File not found
        if (req.url === '/') {
          // If index.html not found, serve a basic page
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Dodge This Shit - Game Server</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #0f0c29; color: white; }
                h1 { color: #00ffea; }
                .container { max-width: 800px; margin: 0 auto; }
                .btn { display: inline-block; padding: 12px 24px; background: #00ffea; color: black; 
                       text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0; }
                .info { background: rgba(0,255,234,0.1); padding: 20px; border-radius: 10px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🚀 Dodge This Shit Game Server</h1>
                <div class="info">
                  <p>The game files are being built or moved. Please check back soon!</p>
                  <p>If you're developing, make sure your game files are in the same directory as this server.</p>
                </div>
                <p>Server is running on port ${PORT}</p>
                <a href="https://github.com/serenoa287-afk/dodge-this-shit" class="btn">View on GitHub</a>
              </div>
            </body>
            </html>
          `);
        } else {
          res.writeHead(404);
          res.end('File not found');
        }
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // Success
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

server.listen(PORT, () => {
  console.log(`
  🎮 Dodge This Shit Game Server
  ================================
  Server running at:
  - Local: http://localhost:${PORT}
  - Network: http://[your-ip]:${PORT}
  
  Game features:
  - Player movement: WASD/Arrow keys
  - Dash ability: Space bar
  - 4 enemy types
  - Level progression
  - Score system
  
  Press Ctrl+C to stop the server
  `);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Received SIGTERM, shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});