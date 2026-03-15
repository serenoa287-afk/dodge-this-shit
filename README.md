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

## Development

### Prerequisites
- Modern web browser
- Code editor

### Setup
1. Clone the repository
2. Open `index.html` in your browser
3. Start playing!

### Project Structure
```
dodge-this-shit-game/
├── index.html          # Main HTML file
├── style.css          # Game styling
├── game.js           # Main game logic
├── player.js         # Player character class
├── enemy.js          # Enemy class and types
├── level.js          # Level management
├── assets/           # Images, sounds, fonts
│   ├── sprites/
│   ├── sounds/
│   └── fonts/
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

Inspired by the Warcraft 3 custom map "Dodge This Shit".

## License

MIT License - feel free to use and modify!