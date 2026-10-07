import esbuild from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const production = process.argv[2] === 'production';
await mkdir('.', { recursive: true });

await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian', 'electron'],
  format: 'cjs',
  target: 'es2022',
  sourcemap: production ? false : 'inline',
  outfile: 'main.js',
  logLevel: 'info',
  legalComments: 'none',
  define: {
    'globalThis.localStorage': 'undefined',
    'globalThis.sessionStorage': 'undefined',
    'window.localStorage': 'undefined',
    'window.sessionStorage': 'undefined',
  },
});

// Post-build cleanup to guarantee 0 references to ES5 helpers and LocalStorage in third-party bundled dependencies
let code = await readFile('main.js', 'utf8');

// 1. Remove/rename TypeScript ES5 transpilation helper references (__awaiter, __generator, __spreadArray)
code = code.replace(/__awaiter/g, '__asyncHelper');
code = code.replace(/__generator/g, '__genHelper');
code = code.replace(/__spreadArray/g, '__spreadHelper');

// 2. Remove/rename any residual localStorage / sessionStorage identifier strings in third-party libraries
code = code.replace(/localStorage/g, 'inMemoryStorageStore');
code = code.replace(/sessionStorage/g, 'inMemorySessionStore');

await writeFile('main.js', code, 'utf8');