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

## Quick Start

### Play Immediately
```bash
# Clone the repository
git clone https://github.com/serenoa287-afk/dodge-this-shit.git
cd dodge-this-shit

# Start the game server
npm start
# Then open http://localhost:3000 in your browser
```

### Alternative Methods
```bash
# Using Docker
docker-compose up -d

# Using Node.js directly
node server.js

# On Windows
start.bat

# On Linux/Mac
chmod +x start.sh
./start.sh
```

## Development

### Prerequisites
- Node.js 14+ (optional, for server)
- Modern web browser

### Project Structure
```
dodge-this-shit-game/
├── server.js          # Node.js game server
├── index.html         # Main HTML file
├── style.css          # Game styling
├── game.js           # Main game logic
├── player.js         # Player character class
├── enemy.js          # Enemy class and types
├── level.js          # Level management
├── package.json      # Project configuration
├── Dockerfile        # Docker container
├── docker-compose.yml # Docker deployment
├── start.sh          # Linux/Mac start script
├── start.bat         # Windows start script
├── DEPLOYMENT.md     # Deployment guide
└── README.md
```

## Future Enhancements

- [ ] Power-ups (temporary invincibility, slow time, etc.)
- [ ] Different enemy types with unique behaviors
- [ ] Boss levels
- [ ] Multiplayer mode
- [ ] Mobile touch controls
- [ ] Level editor
- [ ] Achievements system

## Credits

**Author**: Serenoa  
**Inspired by**: The Warcraft 3 custom map "Dodge This Shit"

## License

MIT License - feel free to use and modify!