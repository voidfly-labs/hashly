import { execSync } from 'node:child_process';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APPS_META } from './apps-meta.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APPS = Object.keys(APPS_META);

function buildApp(app) {
  execSync('npx vite build', {
    stdio: 'inherit',
    cwd: ROOT,
    env: { ...process.env, APP: app },
  });
}

function zipApp(app) {
  const distDir = join(ROOT, 'dist', app);
  execSync(`zip -r ${app}.zip . -x ${app}.zip`, { stdio: 'inherit', cwd: distDir });
  console.log(`  zip      ${app}.zip → dist/${app}/`);
}

async function main() {
  for (const app of APPS) {
    console.log(`\n▶  building ${app}…`);
    buildApp(app);
    zipApp(app);
  }

  console.log('\n✓  all apps built\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
