import { spawnSync } from 'node:child_process';

const platform = process.env.CAPACITOR_PLATFORM_NAME ?? '';
const shouldBuild = platform === 'ios' || platform === 'android' || platform === '';

if (!shouldBuild) {
  process.exit(0);
}

console.log('Building fresh Capacitor web assets before native sync...');

const result = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}