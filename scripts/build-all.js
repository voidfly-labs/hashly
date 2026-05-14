import { execSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APPS = ['crckit', 'md5kit', 'sha3kit', 'keccalc', 'shafile', 'ripemd', 'xxhash'];

function buildApp(app) {
  execSync('npx vite build', {
    stdio: 'inherit',
    cwd: ROOT,
    env: { ...process.env, APP: app },
  });
}

function zipApp(app) {
  const distDir = join(ROOT, 'dist', app);
  const srcDir = join(distDir, 'src');
  if (existsSync(srcDir)) rmSync(srcDir, { recursive: true });
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
