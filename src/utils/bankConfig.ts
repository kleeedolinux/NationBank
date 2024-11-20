import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(__dirname, '../config/bank.json');

interface BankConfig {
  bankName: string;
}

export function getBankConfig(): BankConfig {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return config;
  } catch (error) {
    // Return default config if file doesn't exist
    return { bankName: 'Personal Bank' };
  }
}

export function updateBankConfig(config: Partial<BankConfig>): void {
  const currentConfig = getBankConfig();
  const newConfig = { ...currentConfig, ...config };
  
  // Ensure directory exists
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
}