import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import chalk from 'chalk';

interface Config {
  PORT: number;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  DATABASE_TYPE: 'sqlite' | 'postgresql';
  DATABASE_URL: string;
  SESSION_SECRET: string;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function generateRandomString(length: number): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function checkInstallation(): Promise<boolean> {
  try {
    const packageLockExists = fs.existsSync('package-lock.json');
    const nodeModulesExists = fs.existsSync('node_modules');
    const envExists = fs.existsSync('.env');
    
    return packageLockExists && nodeModulesExists && envExists;
  } catch (error) {
    return false;
  }
}

async function getConfiguration(): Promise<Config> {
  console.log(chalk.cyan('\n=== Personal Bank System Setup ===\n'));

  const port = parseInt(await question(chalk.yellow('Enter the port number (default: 3000): '))) || 3000;
  const adminEmail = await question(chalk.yellow('Enter admin email: '));
  const adminPassword = await question(chalk.yellow('Enter admin password: '));
  
  const dbType = (await question(chalk.yellow('Choose database type (sqlite/postgresql) [default: sqlite]: '))).toLowerCase() || 'sqlite';
  
  let dbUrl = '';
  if (dbType === 'postgresql') {
    dbUrl = await question(chalk.yellow('Enter PostgreSQL connection URL: '));
  } else {
    dbUrl = 'file:./dev.db';
  }

  const sessionSecret = await generateRandomString(32);

  return {
    PORT: port,
    ADMIN_EMAIL: adminEmail,
    ADMIN_PASSWORD: adminPassword,
    DATABASE_TYPE: dbType as 'sqlite' | 'postgresql',
    DATABASE_URL: dbUrl,
    SESSION_SECRET: sessionSecret
  };
}

async function updatePrismaSchema(dbType: 'sqlite' | 'postgresql'): Promise<void> {
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  let schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  schemaContent = schemaContent.replace(
    /provider = ".*"/,
    `provider = "${dbType}"`
  );
  
  fs.writeFileSync(schemaPath, schemaContent);
}

async function createEnvFile(config: Config): Promise<void> {
  const envContent = `
PORT=${config.PORT}
ADMIN_EMAIL=${config.ADMIN_EMAIL}
ADMIN_PASSWORD=${config.ADMIN_PASSWORD}
DATABASE_URL=${config.DATABASE_URL}
SESSION_SECRET=${config.SESSION_SECRET}
`;

  fs.writeFileSync('.env', envContent.trim());
}

async function main() {
  try {
    console.clear();
    
    // Check if already installed
    const isInstalled = await checkInstallation();
    if (isInstalled) {
      const reinstall = await question(chalk.yellow('System appears to be already installed. Reinstall? (y/N): '));
      if (reinstall.toLowerCase() !== 'y') {
        console.log(chalk.green('Setup cancelled.'));
        process.exit(0);
      }
    }

    // Get configuration
    const config = await getConfiguration();

    console.log(chalk.cyan('\nStarting installation...\n'));

    // Update Prisma schema
    console.log(chalk.blue('Updating database configuration...'));
    await updatePrismaSchema(config.DATABASE_TYPE);

    // Create .env file
    console.log(chalk.blue('Creating environment file...'));
    await createEnvFile(config);

    // Install dependencies
    console.log(chalk.blue('Installing dependencies...'));
    execSync('npm install', { stdio: 'inherit' });

    // Generate Prisma client
    console.log(chalk.blue('Generating database client...'));
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Run migrations
    console.log(chalk.blue('Running database migrations...'));
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });

    // Seed database
    console.log(chalk.blue('Seeding database...'));
    execSync('npm run db:seed', { stdio: 'inherit' });

    // Build application
    console.log(chalk.blue('Building application...'));
    execSync('npm run build', { stdio: 'inherit' });

    console.log(chalk.green('\n✅ Installation completed successfully!'));
    console.log(chalk.cyan('\nYou can now start the application with:'));
    console.log(chalk.yellow('npm start'));

  } catch (error) {
    console.error(chalk.red('\n❌ Installation failed:'), error);
  } finally {
    rl.close();
  }
}

main(); 