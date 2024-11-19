import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import Addon from '../types/Addon';

class AddonLoader {
  private static instance: AddonLoader;
  private addons: Map<string, Addon> = new Map();
  private addonPath: string = path.join(process.cwd(), 'cogs');

  private constructor() {
    if (!fs.existsSync(this.addonPath)) {
      fs.mkdirSync(this.addonPath, { recursive: true });
    }
  }

  static getInstance(): AddonLoader {
    if (!AddonLoader.instance) {
      AddonLoader.instance = new AddonLoader();
    }
    return AddonLoader.instance;
  }

  async loadAddons(): Promise<void> {
    const addonDirs = fs.readdirSync(this.addonPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const dir of addonDirs) {
      const addonDir = path.join(this.addonPath, dir);
      const mainFile = path.join(addonDir, 'main.js');
      
      if (!fs.existsSync(mainFile)) continue;

      const content = fs.readFileSync(mainFile, 'utf8');
      const nameMatch = content.match(/ADDON_NAME\s*=\s*["'](.+?)["']/);
      const versionMatch = content.match(/ADDON_VERSION\s*=\s*["'](.+?)["']/);

      if (!nameMatch || !versionMatch) continue;

      try {
        const addonModule = require(mainFile);
        const addon: Addon = {
          name: nameMatch[1],
          version: versionMatch[1],
          enabled: true,
          path: addonDir,
          routes: addonModule.routes,
          middleware: addonModule.middleware,
          initialize: addonModule.initialize
        };

        this.addons.set(addon.name, addon);
        console.log(`Loaded addon: ${addon.name} v${addon.version}`);
      } catch (error) {
        console.error(`Failed to load addon ${dir}:`, error);
      }
    }
  }

  getAddons(): Map<string, Addon> {
    return this.addons;
  }

  getAddon(name: string): Addon | undefined {
    return this.addons.get(name);
  }
}

export default AddonLoader; 