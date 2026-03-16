# Dodge This Shit Game

A browser-based JavaScript game inspired by the classic Warcraft 3 custom map "Dodge This Shit". Control a character in an arena and dodge incoming enemies from all four sides.

## Game Concept

- **Arena**: You're in a rectangular arena
- **Enemies**: Enemies spawn from all four sides (top, bottom, left, right)
- **Objective**: Survive as long as possible by dodging incoming enemies
- **Levels**: Progressive difficulty with faster enemies, more spawns, and different patterns

## Controls

- **WASD** or **Arrow Keys**: Move your character
- **Mouse Click**: Move to clicked position (optional)
- **Space**: Dash/evade (if implemented)
- **P**: Pause game

## Features

- Progressive difficulty levels
- Score system
- High score tracking
- Visual effects for hits and near-misses
- Sound effects
- Responsive controls

## 🎮 Quick Start

### Single Player
```bash
# Clone and run
git clone https://github.com/serenoa287-afk/dodge-this-shit.git
cd dodge-this-shit
npm install
npm start
# Open http://localhost:3000
```

### Multiplayer with Friends
```bash
# Start the combined server (includes multiplayer)
npm start
# Open http://localhost:3000 in multiple browsers
# Click "🎮 Multiplayer" button to create/join lobbies
```

### Alternative Methods
```bash
# Docker (includes multiplayer)
docker-compose up -d

# Single-player only
npm run single

# Multiplayer server only
npm run multiplayer

# Quick scripts
./start.sh          # Linux/Mac
start.bat           # Windows
```

## 🚀 Major Features

### Progressive Difficulty
- **Each round gets 10% harder** (faster enemies, more spawns)
- **Enemy health increases** every 3 rounds
- **Pattern complexity scales** with round number
- **Special abilities unlock** after round 10
- **Visual themes change** every 5 rounds

### Multiplayer Lobby System
- **Create/Join lobbies** with up to 4 players
- **Real-time synchronization** of player movements
- **In-game chat** system
- **Score tracking** and leaderboards
- **Ready system** with auto-start when all players ready
- **Host migration** if host disconnects

### Enhanced Gameplay
- **30-second rounds** with timer display
- **5 enemy spawn patterns**: Single, Row, Column, Staggered, Wave
- **4 enemy types**: Basic, Fast, Tank, Splitter
- **Player abilities**: Dash (Space bar), Trail effects
- **Visual feedback**: Hit effects, elimination animations, score popups

## 🏗️ Project Structure
```
dodge-this-shit-game/
├── combined-server.js     # Combined HTTP + WebSocket server
├── multiplayer-server.js  # WebSocket multiplayer server
├── multiplayer-client.js  # Browser multiplayer client
├── server.js             # Single-player HTTP server
├── index.html            # Main HTML file
├── style.css             # Game styling
├── game.js              # Enhanced game logic (multiplayer + difficulty)
├── player.js            # Player class with multiplayer support
├── enemy.js             # Enemy class with progressive stats
├── level.js             # Level/difficulty management
├── package.json         # Updated with WebSocket dependency
├── Dockerfile           # Docker container (now includes multiplayer)
├── docker-compose.yml   # Docker deployment
├── start.sh / start.bat # Platform start scripts
├── DEPLOYMENT.md        # Deployment guide
└── README.md
```

## Future Enhancements

- [ ] Power-ups (temporary invincibility, slow time, etc.)
- [ ] Different enemy types with unique behaviors
- [ ] Boss levels
- [x] **Multiplayer mode** ✓ **COMPLETE!**
- [ ] Mobile touch controls
- [ ] Level editor
- [ ] Achievements system

## Credits

**Author**: Serenoa  
**Inspired by**: The Warcraft 3 custom map "Dodge This Shit"



## License

MIT License - feel free to use and modify!