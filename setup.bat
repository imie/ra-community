@echo off
REM RA Community Management System - Quick Start Script (Windows)
REM This script sets up the development environment

echo.
echo 🚀 RA Community Management System - Setup
echo ==========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed.
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed!
echo.

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from template...
    copy .env.example .env
    echo ✅ .env file created. Please review and update with your values.
) else (
    echo ℹ️  .env file already exists. Skipping...
)

echo.
echo 🐳 Building Docker images...
docker-compose build

echo.
echo ✅ Setup complete!
echo.
echo 📚 Next steps:
echo 1. Edit .env file with your configuration
echo 2. Run: docker-compose up -d
echo 3. Access the application:
echo    - Web: http://localhost:3000
echo    - API: http://localhost:8000
echo    - API Docs: http://localhost:8000/docs
echo.
echo For more information, see docs/architecture/PROJECT_STRUCTURE.md
echo.
pause
