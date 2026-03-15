# Deployment Guide - Dodge This Shit Game

Multiple ways to serve the game on a port:

## Option 1: Node.js Server (Recommended)

```bash
# Install dependencies (none required for basic server)
npm install

# Start the server (default port: 3000)
npm start

# Or specify a custom port
PORT=8080 npm start
```

## Option 2: Using Docker

```bash
# Build and run with Docker
docker build -t dodge-game .
docker run -p 3000:3000 dodge-game

# Or with docker-compose
docker-compose up -d
```

## Option 3: Using PM2 (Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start server.js --name "dodge-game"

# Set to start on boot
pm2 startup
pm2 save
```

## Option 4: Quick Start Scripts

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

**Windows:**
```cmd
start.bat
```

## Port Configuration

The server runs on port 3000 by default. To change the port:

```bash
# Environment variable
export PORT=8080
npm start

# Or directly
node server.js --port=8080
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

## Deployment Platforms

### Railway / Render
```yaml
# railway.json / render.yaml
buildCommand: npm install
startCommand: npm start
```

### Heroku
```bash
heroku create dodge-this-shit-game
git push heroku main
```

### Vercel / Netlify
Configure as static site, but use custom server for Node.js version.

## Health Check
The server includes a health check endpoint:
```
GET http://localhost:3000/
```

## Monitoring
Check server status:
```bash
# Check if server is running
curl -f http://localhost:3000/

# View logs
pm2 logs dodge-game
# or
docker logs dodge-this-shit-game
```

## Security Notes
- The server only serves files from the project directory
- No external dependencies required
- Built-in security against directory traversal attacks