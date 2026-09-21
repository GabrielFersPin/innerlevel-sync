import esbuild from 'esbuild';
import { mkdir } from 'node:fs/promises';

const production = process.argv[2] === 'production';
await mkdir('.', { recursive: true });
await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian', 'electron'],
  format: 'cjs',
  target: 'es2018',
  sourcemap: production ? false : 'inline',
  outfile: 'main.js',
  logLevel: 'info',
});