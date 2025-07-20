#!/bin/bash

clear

echo -e "\e[94m=== NationBank System Setup ===\e[0m"

# Check if Node.js is installed
echo
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
  echo -e "\e[31mNode.js is not installed! Please install Node.js first.\e[0m"
  echo "Download from: https://nodejs.org"
  read -p "Press enter to exit..."
  exit 1
fi
echo -e "\e[32m√ Node.js is installed\e[0m"

# Check if .env exists (installation check)
if [ -f ".env" ]; then
  read -p "System appears to be already installed. Reinstall? (y/N): " REINSTALL
  if [[ ! "$REINSTALL" =~ ^[Yy]$ ]]; then
    echo -e "\e[32mSetup cancelled.\e[0m"
    read -p "Press enter to exit..."
    exit 0
  fi
fi

# Get configuration
echo
read -p "Enter the port number (default: 3000): " PORT
PORT=${PORT:-3000}

read -p "Enter admin email: " ADMIN_EMAIL

while true; do
  read -s -p "Enter admin password (min 8 chars): " ADMIN_PASSWORD
  echo
  if [ ${#ADMIN_PASSWORD} -ge 8 ]; then
    break
  else
    echo "Password too short, please enter at least 8 characters."
  fi
done

read -p "Choose database type (sqlite/postgresql) [default: sqlite]: " DB_TYPE
DB_TYPE=${DB_TYPE:-sqlite}

if [[ "$DB_TYPE" == "postgresql" ]]; then
  read -p "Enter PostgreSQL connection URL: " DATABASE_URL
else
  DB_TYPE="sqlite"
  DATABASE_URL="file:./dev.db"
fi

# Generate random session secret
CHARS='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
SESSION_SECRET=""
for i in {1..32}; do
  SESSION_SECRET+=${CHARS:RANDOM%${#CHARS}:1}
done

# Create necessary directories
mkdir -p prisma public src

# Create/Update Prisma schema
echo
echo "Creating Prisma schema..."
cat > prisma/schema.prisma << EOF
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "$DB_TYPE"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  publicId      String    @unique @default(uuid())
  email         String    @unique
  password      String
  name          String
  isAdmin       Boolean   @default(false)
  isApproved    Boolean   @default(false)
  balance       Float     @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sentTransactions     Transaction[] @relation("sender")
  receivedTransactions Transaction[] @relation("receiver")
  loans               Loan[]
  investments         Investment[]
}

model Transaction {
  id          String   @id @default(uuid())
  amount      Float
  senderId    String
  receiverId  String
  type        String
  description String?
  createdAt   DateTime @default(now())
  sender      User     @relation("sender", fields: [senderId], references: [id])
  receiver    User     @relation("receiver", fields: [receiverId], references: [id])
}

model Investment {
  id             String   @id @default(uuid())
  userId         String
  amount         Float
  rate           Float
  term           Int
  status         String
  expectedReturn Float
  createdAt      DateTime @default(now())
  maturityDate   DateTime
  user           User     @relation(fields: [userId], references: [id])
}

model Loan {
  id          String   @id @default(uuid())
  userId      String
  amount      Float
  rate        Float
  term        Int
  status      String
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])
}

model SystemConfig {
  id            String   @id @default(uuid())
  currencySymbol String  @default("$")
  cdiRate       Float    @default(0)
  incomeTaxRate Float    @default(0)
  updatedAt     DateTime @updatedAt
}
EOF

# Create .env file
echo
echo "Creating environment file..."
cat > .env << EOF
PORT=$PORT
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
DATABASE_URL=$DATABASE_URL
SESSION_SECRET=$SESSION_SECRET
EOF

# Install dependencies
echo
echo "Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
  echo -e "\e[31mFailed to install dependencies\e[0m"
  read -p "Press enter to exit..."
  exit 1
fi
echo -e "\e[32m√ Dependencies installed\e[0m"

# Generate initial migration
echo
echo "Creating initial migration..."
npx prisma migrate dev --name init
if [ $? -ne 0 ]; then
  echo -e "\e[31mFailed to create initial migration\e[0m"
  read -p "Press enter to exit..."
  exit 1
fi
echo -e "\e[32m√ Initial migration created\e[0m"

# Generate Prisma client
echo
echo "Generating Prisma client..."
npx prisma generate
if [ $? -ne 0 ]; then
  echo -e "\e[31mFailed to generate Prisma client\e[0m"
  read -p "Press enter to exit..."
  exit 1
fi
echo -e "\e[32m√ Prisma client generated\e[0m"

# Seed database
echo
echo "Seeding database..."
npm run db:seed
if [ $? -ne 0 ]; then
  echo -e "\e[31mFailed to seed database\e[0m"
  read -p "Press enter to exit..."
  exit 1
fi
echo -e "\e[32m√ Database seeded\e[0m"

# Start application
echo
echo "Starting application..."
echo 'If you want to run the application in production mode, run "npm run dev".'
npm run dev

echo
echo -e "\e[32m✅ Installation completed successfully!\e[0m"
echo -e "\e[94mYou can now start the application with:\e[0m"
echo -e "\e[93mnpm start\e[0m"
read -p "Press enter to exit..."
exit 0
