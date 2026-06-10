#!/bin/bash

# RA Community Management System - Quick Start Script
# This script sets up the development environment

set -e

echo "🚀 RA Community Management System - Setup"
echo "=========================================="

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js is not installed. It's needed for the workspace setup."
fi

echo "✅ Prerequisites check passed!"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please review and update with your values."
else
    echo "ℹ️  .env file already exists. Skipping..."
fi

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose build

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Run: npm run docker:up"
echo "3. Access the application:"
echo "   - Web: http://localhost:3000"
echo "   - API: http://localhost:8000"
echo "   - API Docs: http://localhost:8000/docs"
echo ""
echo "For more information, see docs/architecture/PROJECT_STRUCTURE.md"
