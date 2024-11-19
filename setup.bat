@echo off
cls
echo Starting Personal Bank System Setup...

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed! Please install Node.js first.
    echo Download from: https://nodejs.org
    pause
    exit /b 1
)

:: Check if TypeScript is installed globally
npm i

:: Install required setup dependencies
echo Installing setup dependencies...
npm install --no-save typescript ts-node chalk @types/node

:: Run the setup script
echo Running setup script...
npx ts-node scripts/setup.ts

if %ERRORLEVEL% NEQ 0 (
    echo Setup failed! Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo Setup completed! You can now start the application with: npm start
pause 