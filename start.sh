#!/bin/bash

# Dodge This Shit Game - Start Script
# ===================================

echo "🎮 Starting Dodge This Shit Game Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "⚠️  Warning: Node.js version should be 14 or higher (you have $(node -v))"
fi

# Set port (default: 3000, can be overridden by PORT environment variable)
PORT=${PORT:-3000}

echo "📦 Using Node.js $(node -v)"
echo "🌐 Server will run on port: $PORT"
echo ""

# Start the server
echo "🚀 Starting server..."
echo "=========================================="
echo ""

node server.js