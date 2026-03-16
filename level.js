// Level manager class
class LevelManager {
    constructor() {
        this.currentLevel = 1;
        this.levelEffects = [];
        this.levelUnlocks = new Map();
        
        this.initializeLevels();
    }
    
    initializeLevels() {
        // Define level effects and unlocks
        this.levelEffects = [
            { level: 1, description: "Basic enemies, slow speed" },
            { level: 2, description: "Slightly faster enemies" },
            { level: 3, description: "More enemies spawn" },
            { level: 4, description: "Fast enemy type unlocked" },
            { level: 5, description: "Enemies spawn more frequently" },
            { level: 6, description: "Tank enemy type unlocked" },
            { level: 7, description: "Multiple enemy types spawn" },
            { level: 8, description: "Splitter enemy type unlocked" },
            { level: 9, description: "All enemy types, increased speed" },
            { level: 10, description: "BOSS WAVE - Special patterns" },
            { level: 11, description: "Post-boss: All types, max speed" },
            { level: 15, description: "Enemies gain homing ability" },
            { level: 20, description: "ULTIMATE CHALLENGE" }
        ];
        
        // Define level unlocks
        this.levelUnlocks.set(4, 'fast');
        this.levelUnlocks.set(6, 'tank');
        this.levelUnlocks.set(8, 'splitter');
        this.levelUnlocks.set(10, 'boss');
    }
    
    applyLevelEffects(level) {
        this.currentLevel = level;
        
        // Log level up
        console.log(`Level ${level} reached!`);
        
        // Find effects for this level
        const effects = this.levelEffects.filter(effect => effect.level === level);
        effects.forEach(effect => {
            console.log(`Effect: ${effect.description}`);
        });
        
        // Check for unlocks
        if (this.levelUnlocks.has(level)) {
            const unlock = this.levelUnlocks.get(level);
            console.log(`Unlocked: ${unlock} enemy type!`);
        }
    }
    
    getLevelMultipliers() {
        return {
            enemySpeed: 1 + (this.currentLevel - 1) * 0.05, // Reduced from 0.1
            enemySpawnRate: 1 + (this.currentLevel - 1) * 0.08, // Reduced from 0.15
            enemyHealth: 1 + Math.floor((this.currentLevel - 1) / 5) * 0.3, // Reduced from 0.5, slower scaling
            enemySize: 1 + (this.currentLevel - 1) * 0.03, // Reduced from 0.05
            scoreMultiplier: 1 + (this.currentLevel - 1) * 0.15 // Reduced from 0.2
        };
    }
    
    getLevelDescription(level = this.currentLevel) {
        const effect = this.levelEffects.find(e => e.level === level);
        return effect ? effect.description : "Unknown level";
    }
    
    getUnlockedEnemyTypes() {
        const unlocked = ['basic']; // Basic is always unlocked
        
        for (const [unlockLevel, type] of this.levelUnlocks) {
            if (this.currentLevel >= unlockLevel && type !== 'boss') {
                unlocked.push(type);
            }
        }
        
        return unlocked;
    }
    
    isBossLevel() {
        return this.currentLevel % 10 === 0; // Boss every 10 levels
    }
    
    getBossPattern(level) {
        if (!this.isBossLevel()) return null;
        
        const bossPatterns = [
            { // Level 10
                name: "The Spiral",
                description: "Enemies spawn in spiral patterns",
                specialEffect: "Rotating spawn points"
            },
            { // Level 20
                name: "The Swarm",
                description: "Massive enemy swarms from all sides",
                specialEffect: "Increased spawn rate 300%"
            },
            { // Level 30
                name: "The Vortex",
                description: "Enemies create vortex patterns",
                specialEffect: "Pull effect towards center"
            }
        ];
        
        const bossIndex = Math.floor(level / 10) - 1;
        return bossPatterns[bossIndex] || bossPatterns[0];
    }
    
    reset() {
        this.currentLevel = 1;
    }
    
    // Level progression rewards
    getLevelReward(level) {
        const rewards = {
            5: { score: 5000, message: "Level 5 Bonus!" },
            10: { score: 20000, message: "BOSS DEFEATED!" },
            15: { score: 50000, message: "Level 15 Achievement!" },
            20: { score: 100000, message: "ULTIMATE CHALLENGE COMPLETE!" }
        };
        
        return rewards[level] || { score: level * 1000, message: `Level ${level} Complete!` };
    }
    
    // Difficulty scaling
    getDifficultyScale() {
        if (this.currentLevel <= 3) return "Easy";
        if (this.currentLevel <= 6) return "Medium";
        if (this.currentLevel <= 9) return "Hard";
        if (this.currentLevel <= 12) return "Very Hard";
        if (this.currentLevel <= 15) return "Insane";
        return "Impossible";
    }
    
    // Visual theme based on level
    getLevelTheme() {
        const themes = [
            { level: 1, background: "#000000", grid: "#00ffea" },
            { level: 5, background: "#0a0a2a", grid: "#0088ff" },
            { level: 10, background: "#2a0000", grid: "#ff0000" },
            { level: 15, background: "#2a2a00", grid: "#ffff00" },
            { level: 20, background: "#002a2a", grid: "#00ffff" }
        ];
        
        // Find the closest theme for current level
        let selectedTheme = themes[0];
        for (const theme of themes) {
            if (this.currentLevel >= theme.level) {
                selectedTheme = theme;
            }
        }
        
        return selectedTheme;
    }
}