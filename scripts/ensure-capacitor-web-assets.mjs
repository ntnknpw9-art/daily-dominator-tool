import { existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const platform = process.env.CAPACITOR_PLATFORM_NAME ?? '';
const shouldBuild = platform === 'ios' || platform === 'android' || platform === '';

if (process.env.CAP_ENV !== 'production') {
  console.log('Skipping local Capacitor web asset build; native debug uses the live Lovable URL.');
  process.exit(0);
}

if (!shouldBuild) {
  process.exit(0);
}

const distDir = path.resolve('dist');
const assetsDir = path.join(distDir, 'assets');
const hasIndex = existsSync(path.join(distDir, 'index.html'));
const hasAssets = existsSync(assetsDir) && readdirSync(assetsDir).some((file) => /\.(js|css)$/.test(file));

if (hasIndex && hasAssets) {
  console.log('Capacitor web assets are ready.');
  process.exit(0);
}

console.log('Capacitor web assets are missing; building before native sync...');

const result = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}