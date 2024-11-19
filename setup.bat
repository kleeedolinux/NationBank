@echo off
cls
setlocal EnableDelayedExpansion

echo [94m=== NationBank System Setup ===[0m

:: Check if Node.js is installed
echo.
echo Checking Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [31mNode.js is not installed! Please install Node.js first.[0m
    echo Download from: https://nodejs.org
    pause
    exit /b 1
)
echo [32m√ Node.js is installed[0m

:: Check if .env exists (installation check)
if exist ".env" (
    echo.
    set /p REINSTALL="System appears to be already installed. Reinstall? (y/N): "
    if /i "!REINSTALL!" neq "y" (
        echo [32mSetup cancelled.[0m
        pause
        exit /b 0
    )
)

:: Get configuration
echo.
set /p PORT="Enter the port number (default: 3000): " || set PORT=3000
set /p ADMIN_EMAIL="Enter admin email: "
set /p ADMIN_PASSWORD="Enter admin password (min 8 chars): "
set /p DB_TYPE="Choose database type (sqlite/postgresql) [default: sqlite]: " || set DB_TYPE=sqlite

if /i "!DB_TYPE!"=="postgresql" (
    set /p DATABASE_URL="Enter PostgreSQL connection URL: "
) else (
    set DB_TYPE=sqlite
    set DATABASE_URL=file:./dev.db
)

:: Generate random session secret
set "CHARS=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
set "SESSION_SECRET="
for /L %%i in (1,1,32) do call :appendChar
goto :continueSetup

:appendChar
set /a x=%random% %% 62
set SESSION_SECRET=!SESSION_SECRET!!CHARS:~%x%,1!
exit /b

:continueSetup
:: Create necessary directories
if not exist "prisma" mkdir prisma
if not exist "public" mkdir public
if not exist "src" mkdir src

:: Create/Update Prisma schema
echo.
echo Creating Prisma schema...
(
echo generator client {
echo   provider = "prisma-client-js"
echo }
echo.
echo datasource db {
echo   provider = "!DB_TYPE!"
echo   url      = env^("DATABASE_URL"^)
echo }
echo.
echo model User {
echo   id            String    @id @default^(uuid^(^)^)
echo   publicId      String    @unique @default^(uuid^(^)^)
echo   email         String    @unique
echo   password      String
echo   name          String
echo   isAdmin       Boolean   @default^(false^)
echo   isApproved    Boolean   @default^(false^)
echo   balance       Float     @default^(0^)
echo   createdAt     DateTime  @default^(now^(^)^)
echo   updatedAt     DateTime  @updatedAt
echo   sentTransactions     Transaction[] @relation^("sender"^)
echo   receivedTransactions Transaction[] @relation^("receiver"^)
echo   loans               Loan[]
echo   investments         Investment[]
echo }
echo.
echo model Transaction {
echo   id          String   @id @default^(uuid^(^)^)
echo   amount      Float
echo   senderId    String
echo   receiverId  String
echo   type        String
echo   description String?
echo   createdAt   DateTime @default^(now^(^)^)
echo   sender      User     @relation^("sender", fields: [senderId], references: [id]^)
echo   receiver    User     @relation^("receiver", fields: [receiverId], references: [id]^)
echo }
echo.
echo model Investment {
echo   id             String   @id @default^(uuid^(^)^)
echo   userId         String
echo   amount         Float
echo   rate           Float
echo   term           Int
echo   status         String
echo   expectedReturn Float
echo   createdAt      DateTime @default^(now^(^)^)
echo   maturityDate   DateTime
echo   user           User     @relation^(fields: [userId], references: [id]^)
echo }
echo.
echo model Loan {
echo   id          String   @id @default^(uuid^(^)^)
echo   userId      String
echo   amount      Float
echo   rate        Float
echo   term        Int
echo   status      String
echo   createdAt   DateTime @default^(now^(^)^)
echo   user        User     @relation^(fields: [userId], references: [id]^)
echo }
echo.
echo model SystemConfig {
echo   id            String   @id @default^(uuid^(^)^)
echo   currencySymbol String  @default^("$"^)
echo   cdiRate       Float    @default^(0^)
echo   incomeTaxRate Float    @default^(0^)
echo   updatedAt     DateTime @updatedAt
echo }
) > prisma\schema.prisma

:: Create .env file
echo.
echo Creating environment file...
(
echo PORT=!PORT!
echo ADMIN_EMAIL=!ADMIN_EMAIL!
echo ADMIN_PASSWORD=!ADMIN_PASSWORD!
echo DATABASE_URL=!DATABASE_URL!
echo SESSION_SECRET=!SESSION_SECRET!
) > .env



:: Install dependencies
echo.
echo Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [31mFailed to install dependencies[0m
    pause
    exit /b 1
)
echo [32m√ Dependencies installed[0m

:: Generate initial migration
echo.
echo Creating initial migration...
call npx prisma migrate dev --name init
if %ERRORLEVEL% NEQ 0 (
    echo [31mFailed to create initial migration[0m
    pause
    exit /b 1
)
echo [32m√ Initial migration created[0m

:: Generate Prisma client
echo.
echo Generating Prisma client...
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo [31mFailed to generate Prisma client[0m
    pause
    exit /b 1
)
echo [32m√ Prisma client generated[0m

:: Seed database
echo.
echo Seeding database...
call npm run db:seed
if %ERRORLEVEL% NEQ 0 (
    echo [31mFailed to seed database[0m
    pause
    exit /b 1
)
echo [32m√ Database seeded[0m

:: Build application
echo.
echo Starting application...
echo If you want to run the application in production mode, run "npm run dev".
call npm run dev

echo.
echo [32m✅ Installation completed successfully![0m
echo [94mYou can now start the application with:[0m
echo [93mnpm start[0m
pause
exit /b 0