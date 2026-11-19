// Golden Hour Cover Studio — entry program.
//
// Copies the static app (app/) and the maker's screenshots (screenshots/)
// into the grader's output directory and writes the dossier the scorer
// rebuilds from them. Standard library only, no network, deterministic:
// two runs over the same repository write identical bytes.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The folder this program writes into: the grader's /output, or
// MAKEFUN_OUTPUT_DIR when run by hand outside the grader.
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The repository root is the folder this file lives in.
const REPO_ROOT = dirname(fileURLToPath(import.meta.url));

const SHOT_DIR = join(REPO_ROOT, 'screenshots');
const APP_DIR = join(REPO_ROOT, 'app');
const SHOT_MAX_BYTES = 256 * 1024;
const SHOT_MIN = 3;
const SHOT_MAX = 4;
const INDEX_MAX_BYTES = 1024 * 1024;
const DOSSIER_MAX_BYTES = 1536 * 1024;

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

function fail(message: string): never {
  throw new Error(`golden-hour: ${message}`);
}

// A screenshot is a whole PNG or JPEG inside the size cap. Naming the
// offending file keeps a bad render from failing the whole entry silently.
function checkScreenshots(): string[] {
  if (!existsSync(SHOT_DIR)) fail(`screenshots/ is missing from ${REPO_ROOT}`);
  const names = readdirSync(SHOT_DIR)
    .filter((name) => !name.startsWith('.'))
    .sort();
  if (names.length < SHOT_MIN || names.length > SHOT_MAX) {
    fail(`screenshots/ holds ${names.length} files, the gate wants ${SHOT_MIN} to ${SHOT_MAX}`);
  }
  for (const name of names) {
    const path = join(SHOT_DIR, name);
    const bytes = statSync(path);
    if (!bytes.isFile()) fail(`screenshots/${name} is not a regular file`);
    if (bytes.size > SHOT_MAX_BYTES) {
      fail(`screenshots/${name} is ${bytes.size} bytes, over the ${SHOT_MAX_BYTES} cap`);
    }
    const head = readFileSync(path);
    const isPng = head.subarray(0, 8).equals(PNG_MAGIC);
    const isJpeg = head.subarray(0, 3).equals(JPEG_MAGIC);
    if (!isPng && !isJpeg) fail(`screenshots/${name} is neither a PNG nor a JPEG`);
  }
  return names;
}

// Copy one tree into the output directory, entries in sorted order so the
// run is repeatable. Returns how many files it copied.
function copyTree(fromDir: string, toDir: string): number {
  mkdirSync(toDir, { recursive: true });
  let copied = 0;
  for (const name of readdirSync(fromDir).sort()) {
    const from = join(fromDir, name);
    const to = join(toDir, name);
    if (statSync(from).isDirectory()) {
      copied += copyTree(from, to);
    } else {
      cpSync(from, to);
      copied += 1;
    }
  }
  return copied;
}

function main(): void {
  const indexPath = join(APP_DIR, 'index.html');
  if (!existsSync(indexPath)) {
    fail(`app/index.html is missing from ${REPO_ROOT}`);
  }
  const indexBytes = statSync(indexPath).size;
  if (indexBytes > INDEX_MAX_BYTES) {
    fail(`app/index.html is ${indexBytes} bytes, over the ${INDEX_MAX_BYTES} cap`);
  }
  const shots = checkScreenshots();

  // Start from a clean output directory so stale files can never leak in.
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  const appFiles = copyTree(APP_DIR, join(OUT_DIR, 'app'));
  const shotFiles = copyTree(SHOT_DIR, join(OUT_DIR, 'screenshots'));

  const dossier = buildDossier(resolve(OUT_DIR), {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  if (dossier.length > DOSSIER_MAX_BYTES) {
    fail(`dossier.json is ${dossier.length} bytes, over the ${DOSSIER_MAX_BYTES} cap`);
  }
  writeFileSync(join(OUT_DIR, 'dossier.json'), dossier);

  console.log(
    `golden-hour: wrote ${OUT_DIR} — app/ (${appFiles} files), ` +
      `${shotFiles} screenshots, dossier.json ${dossier.length} bytes`,
  );
}

main();
