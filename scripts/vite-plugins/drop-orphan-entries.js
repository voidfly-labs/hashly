import { readdirSync, readFileSync, rmdirSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

// vite-plugin-html adds its own build inputs next to ours, so a page is an entry twice and
// the second one comes out as a stub chunk (`import "./main-….js"`) that no page loads.
// Which chunks a page loads is only known once the pages are written (Vite adds their script
// tags late), so this runs on the written files. They are still at their source paths then:
// vite-plugin-html moves them to the root in its closeBundle, which is why this plugin has
// to be listed after it.
export function dropOrphanEntries() {
  let outDir;
  return {
    name: 'drop-orphan-entries',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    writeBundle(_options, bundle) {
      const pages = findFiles(outDir, '.html').map((file) => readFileSync(file, 'utf8'));
      for (const file of Object.values(bundle)) {
        if (file.type === 'chunk' && file.isEntry && !pages.some((html) => html.includes(file.fileName))) {
          unlinkSync(join(outDir, file.fileName));
        }
      }
    },
    // The folders the pages were moved out of are left empty.
    closeBundle() {
      removeEmptyDirs(join(outDir, 'src'));
    },
  };
}

function findFiles(dir, extension) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return findFiles(path, extension);
    return path.endsWith(extension) ? [path] : [];
  });
}

function removeEmptyDirs(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) removeEmptyDirs(join(dir, entry.name));
  }
  if (readdirSync(dir).length === 0) rmdirSync(dir);
}
