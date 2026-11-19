// Golden Hour Cover Studio — entry program.
//
// Hands the app in: copies app/ and screenshots/ from this repository to
// the output directory and writes output/dossier.json with buildDossier
// from the vendored make.fun library. Standard library only; the same
// bytes come out on every run. Outside the grader, MAKEFUN_OUTPUT_DIR
// stands in for /output.
//
// No font file is bundled: captions use the browser's system font stack
// ('DejaVu Sans', Arial, Helvetica, sans-serif, bold), so there is no
// binary asset for the transcript gate to doubt.

import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// Caps from the bounty: the dossier text cap, at most 4 screenshots of
// at most 256 KiB each, app/ at most 993 entries and 48 MiB, and the
// dossier itself at most 1.5 MiB.
const TEXT_MAX_BYTES = 163840;
const SHOT_MAX = 4;
const SHOT_MAX_BYTES = 256 * 1024;
const APP_MAX_FILES = 993;
const APP_MAX_BYTES = 48 * 1024 * 1024;
const DOSSIER_MAX_BYTES = Math.floor(1.5 * 1024 * 1024);
const INDEX_MAX_BYTES = 1024 * 1024;

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

function abort(message: string): never {
  throw new Error(`main.ts: ${message}`);
}

// Every regular file below a directory, relative paths in code-unit order.
// A symlink is refused outright: the gate wants plain files only, and a
// link a stat call follows would slip past the check unnoticed.
function filesUnder(dir: string): string[] {
  const found: string[] = [];
  const walk = (at: string, rel: string): void => {
    for (const name of readdirSync(at).sort()) {
      const full = join(at, name);
      const relPath = rel ? `${rel}/${name}` : name;
      const st = lstatSync(full);
      if (st.isSymbolicLink()) abort(`symlink not allowed: ${relPath}`);
      if (st.isDirectory()) walk(full, relPath);
      else if (st.isFile()) found.push(relPath);
      else abort(`not a plain file: ${relPath}`);
    }
  };
  walk(dir, '');
  return found;
}

function isPng(bytes: Buffer): boolean {
  return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

function isJpeg(bytes: Buffer): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

// --- pre-validation: fail early, naming the offending file -----------

const appDir = join(repoRoot, 'app');
const shotDir = join(repoRoot, 'screenshots');

if (!existsSync(join(appDir, 'index.html'))) abort('app/index.html is missing');
const indexBytes = statSync(join(appDir, 'index.html')).size;
if (indexBytes > INDEX_MAX_BYTES) abort(`app/index.html is ${indexBytes} bytes, over the 1 MiB cap`);

const appFiles = filesUnder(appDir);
if (appFiles.length > APP_MAX_FILES) abort(`app/ holds ${appFiles.length} files, over the 993 cap`);
let appBytes = 0;
for (const rel of appFiles) appBytes += statSync(join(appDir, rel)).size;
if (appBytes > APP_MAX_BYTES) abort(`app/ is ${appBytes} bytes, over the 48 MiB cap`);

const shotFiles = existsSync(shotDir) ? filesUnder(shotDir) : [];
if (shotFiles.length < 3 || shotFiles.length > SHOT_MAX) {
  abort(`screenshots/ holds ${shotFiles.length} files, need 3 to 4`);
}
for (const rel of shotFiles) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(rel)) abort(`bad screenshot name: ${rel}`);
  const bytes = readFileSync(join(shotDir, rel));
  if (bytes.length > SHOT_MAX_BYTES) abort(`screenshot ${rel} is ${bytes.length} bytes, over the 256 KiB cap`);
  if (!isPng(bytes) && !isJpeg(bytes)) abort(`screenshot ${rel} is neither a whole PNG nor a whole JPEG`);
}

// --- copy, then write the dossier ------------------------------------

mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, 'app'), { recursive: true });
cpSync(shotDir, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: TEXT_MAX_BYTES,
  screenshots: { max: SHOT_MAX, max_bytes: SHOT_MAX_BYTES },
  app_max_files: APP_MAX_FILES,
  app_max_bytes: APP_MAX_BYTES,
  app_path_max_bytes: 1000,
});
if (dossier.length > DOSSIER_MAX_BYTES) abort(`dossier.json is ${dossier.length} bytes, over the 1.5 MiB cap`);
writeFileSync(join(outDir, 'dossier.json'), dossier);

const outFiles = filesUnder(outDir).length;
console.log(
  `golden-hour-cover-studio: copied ${appFiles.length} app files (${appBytes} bytes) ` +
  `and ${shotFiles.length} screenshots; dossier.json ${dossier.length} bytes; ` +
  `${outFiles} files in ${outDir}`,
);
