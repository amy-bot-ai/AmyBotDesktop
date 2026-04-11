/**
 * Path Utilities
 * Cross-platform path resolution helpers
 */
import { createRequire } from 'node:module';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync, readFileSync, realpathSync } from 'fs';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);

type ElectronAppLike = Pick<typeof import('electron').app, 'isPackaged' | 'getPath' | 'getAppPath'>;

export {
  quoteForCmd,
  needsWinShell,
  prepareWinSpawn,
  normalizeNodeRequirePathForNodeOptions,
  appendNodeRequireToNodeOptions,
} from './win-shell';

function getElectronApp() {
  if (process.versions?.electron) {
    return (require('electron') as typeof import('electron')).app;
  }

  const fallbackUserData = process.env.AMYBOT_USER_DATA_DIR?.trim() || join(homedir(), '.amybot');
  const fallbackAppPath = process.cwd();
  const fallbackApp: ElectronAppLike = {
    isPackaged: false,
    getPath: (name) => {
      if (name === 'userData') return fallbackUserData;
      return fallbackUserData;
    },
    getAppPath: () => fallbackAppPath,
  };
  return fallbackApp;
}

/**
 * Expand ~ to home directory
 */
export function expandPath(path: string): string {
  if (path.startsWith('~')) {
    return path.replace('~', homedir());
  }
  return path;
}

/**
 * Get OpenClaw config directory
 */
export function getOpenClawConfigDir(): string {
  return join(homedir(), '.openclaw');
}

/**
 * Get OpenClaw skills directory
 */
export function getOpenClawSkillsDir(): string {
  return join(getOpenClawConfigDir(), 'skills');
}

/**
 * Get AmyBot config directory
 */
export function getAmyBotConfigDir(): string {
  return join(homedir(), '.amybot');
}

/**
 * Get AmyBot logs directory
 */
export function getLogsDir(): string {
  return join(getElectronApp().getPath('userData'), 'logs');
}

/**
 * Get AmyBot data directory
 */
export function getDataDir(): string {
  return getElectronApp().getPath('userData');
}

/**
 * Ensure directory exists
 */
export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Get resources directory (for bundled assets)
 */
export function getResourcesDir(): string {
  if (getElectronApp().isPackaged) {
    return join(process.resourcesPath, 'resources');
  }
  return join(__dirname, '../../resources');
}

/**
 * Get preload script path
 */
export function getPreloadPath(): string {
  return join(__dirname, '../preload/index.js');
}

/**
 * Find openclaw installed globally on the system.
 * Checks npm global root, nvm paths, and resolves from `which openclaw`.
 * Returns the package directory if found, null otherwise.
 */
function findGlobalOpenClawDir(): string | null {
  // 1. Try npm/pnpm global root
  const globalRoots: string[] = [];
  try {
    const npmRoot = execSync('npm root -g', { encoding: 'utf8', timeout: 5000 }).trim();
    if (npmRoot) globalRoots.push(npmRoot);
  } catch { /* npm not found or failed */ }
  try {
    const pnpmHome = process.env.PNPM_HOME;
    if (pnpmHome) globalRoots.push(join(pnpmHome, 'node_modules'));
  } catch { /* ignore */ }

  for (const root of globalRoots) {
    // Check both @amybot/openclaw (private fork) and openclaw (upstream)
    for (const pkgName of ['@amybot/openclaw', 'openclaw']) {
      const candidate = join(root, ...pkgName.split('/'));
      if (existsSync(join(candidate, 'package.json'))) return candidate;
    }
  }

  // 2. Try resolving from `which openclaw` / `where openclaw`
  try {
    const whichCmd = process.platform === 'win32' ? 'where openclaw' : 'which openclaw';
    const binPath = execSync(whichCmd, { encoding: 'utf8', timeout: 5000 }).trim().split('\n')[0];
    if (binPath) {
      // Resolve symlink to get the real binary path
      let realBin = binPath;
      try { realBin = realpathSync(binPath); } catch { /* use as-is */ }
      // Walk up from the binary to find the package.json
      // Typical layout: /usr/local/lib/node_modules/openclaw/bin/openclaw -> package.json 2 levels up
      for (let up = 1; up <= 4; up++) {
        let dir = realBin;
        for (let i = 0; i < up; i++) dir = dirname(dir);
        if (existsSync(join(dir, 'package.json'))) {
          try {
            const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));
            if (pkg.name === '@amybot/openclaw' || pkg.name === 'openclaw') return dir;
          } catch { /* continue */ }
        }
      }
    }
  } catch { /* which/where not found or openclaw not on PATH */ }

  // 3. Common nvm/fnm paths
  const home = homedir();
  const nvmCandidates = [
    join(home, '.nvm', 'versions', 'node'),
    join(home, '.fnm', 'node-versions'),
  ];
  for (const nvmBase of nvmCandidates) {
    if (!existsSync(nvmBase)) continue;
    try {
      // Look in first found node version's lib/node_modules/openclaw
      const versions = realpathSync(nvmBase);
      const candidate = join(versions, 'lib', 'node_modules', 'openclaw');
      if (existsSync(join(candidate, 'package.json'))) return candidate;
    } catch { /* ignore */ }
  }

  return null;
}

/**
 * Get OpenClaw package directory.
 * Resolution order:
 * 1. Production (packaged): resources/openclaw bundled with the app
 * 2. Development: node_modules/openclaw (if present — optional)
 * 3. Global system install (npm/pnpm global, resolved via `which openclaw`)
 */
export function getOpenClawDir(): string {
  if (getElectronApp().isPackaged) {
    return join(process.resourcesPath, 'openclaw');
  }
  // Development: check local node_modules first
  const devDir = join(__dirname, '../../node_modules/@amybot/openclaw');
  if (existsSync(devDir)) return devDir;

  // Fall back to global system install
  return findGlobalOpenClawDir() ?? devDir;
}

/**
 * Get OpenClaw package directory resolved to a real path.
 * Useful when consumers need deterministic module resolution under pnpm symlinks.
 */
export function getOpenClawResolvedDir(): string {
  const dir = getOpenClawDir();
  if (!existsSync(dir)) {
    return dir;
  }
  try {
    return realpathSync(dir);
  } catch {
    return dir;
  }
}

/**
 * Get OpenClaw entry script path (openclaw.mjs)
 */
export function getOpenClawEntryPath(): string {
  return join(getOpenClawDir(), 'openclaw.mjs');
}

/**
 * Get ClawHub CLI entry script path (clawdhub.js)
 */
export function getClawHubCliEntryPath(): string {
  return join(getElectronApp().getAppPath(), 'node_modules', 'clawhub', 'bin', 'clawdhub.js');
}

/**
 * Get ClawHub CLI binary path (node_modules/.bin)
 */
export function getClawHubCliBinPath(): string {
  const binName = process.platform === 'win32' ? 'clawhub.cmd' : 'clawhub';
  return join(getElectronApp().getAppPath(), 'node_modules', '.bin', binName);
}

/**
 * Check if OpenClaw package exists
 */
export function isOpenClawPresent(): boolean {
  const dir = getOpenClawDir();
  const pkgJsonPath = join(dir, 'package.json');
  return existsSync(dir) && existsSync(pkgJsonPath);
}

/**
 * Check if OpenClaw is built (has dist folder)
 * For the npm package, this should always be true since npm publishes the built dist.
 */
export function isOpenClawBuilt(): boolean {
  const dir = getOpenClawDir();
  const distDir = join(dir, 'dist');
  const hasDist = existsSync(distDir);
  return hasDist;
}

/**
 * Get OpenClaw status for environment check
 */
export interface OpenClawStatus {
  packageExists: boolean;
  isBuilt: boolean;
  entryPath: string;
  dir: string;
  version?: string;
  /** Where openclaw was found: 'bundled' | 'local' | 'global' | 'not-found' */
  source?: 'bundled' | 'local' | 'global' | 'not-found';
}

export function getOpenClawStatus(): OpenClawStatus {
  const dir = getOpenClawDir();
  let version: string | undefined;

  // Try to read version from package.json
  try {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      version = pkg.version;
    }
  } catch {
    // Ignore version read errors
  }

  // Determine install source
  let source: OpenClawStatus['source'] = 'not-found';
  if (getElectronApp().isPackaged) {
    source = 'bundled';
  } else {
    const devDir = join(__dirname, '../../node_modules/@amybot/openclaw');
    if (existsSync(devDir) && existsSync(join(devDir, 'package.json'))) {
      source = 'local';
    } else if (findGlobalOpenClawDir() !== null) {
      source = 'global';
    }
  }

  const status: OpenClawStatus = {
    packageExists: isOpenClawPresent(),
    isBuilt: isOpenClawBuilt(),
    entryPath: getOpenClawEntryPath(),
    dir,
    version,
    source,
  };

  try {
    const { logger } = require('./logger') as typeof import('./logger');
    logger.info('OpenClaw status:', status);
  } catch {
    // Ignore logger bootstrap issues in non-Electron contexts such as unit tests.
  }
  return status;
}
