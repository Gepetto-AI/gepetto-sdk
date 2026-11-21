// Builds dist/: index.js (ESM) + index.d.ts, index.cjs (CommonJS) + index.d.cts. Zero runtime dependencies.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const tsc = new URL('../node_modules/typescript/bin/tsc', import.meta.url).pathname;
if (!fs.existsSync(tsc)) {
  console.error('TypeScript is missing: run `npm install` first.');
  process.exit(1);
}
fs.rmSync('dist', { recursive: true, force: true });
execFileSync(process.execPath, [tsc, '-p', 'tsconfig.json'], { stdio: 'inherit' });
execFileSync(process.execPath, [tsc, '-p', 'tsconfig.json', '--module', 'CommonJS', '--moduleResolution', 'Node10', '--declaration', 'false', '--outDir', 'dist/cjs'], { stdio: 'inherit' });
fs.renameSync('dist/cjs/index.js', 'dist/index.cjs');
fs.rmSync('dist/cjs', { recursive: true, force: true });
fs.copyFileSync('dist/index.d.ts', 'dist/index.d.cts');
console.log('dist/: index.js, index.cjs, index.d.ts, index.d.cts');
