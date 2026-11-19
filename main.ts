// Golden Hour Cover Studio — hand-in program for gta6-cover-art-01 (Node 22, standard
// library only). The entry is the static web app in this repository's app/ folder, plus the
// screenshots/ folder with renders of the app at work. This program copies both folders
// into the output directory and writes dossier.json there, the summary the judge reads,
// using the vendored make.fun library under vendor/.
//
// Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The grader sets /output itself and runs the program twice; both runs must write the
// same bytes, so nothing here depends on the clock, randomness, or the machine.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The repository root is the directory holding this file; the output directory is
// /output inside the grader, or MAKEFUN_OUTPUT_DIR anywhere else.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const targetDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps for this bounty (from the kit's gate): the dossier text holds
// at most 160 KiB, at most 4 screenshots of at most 256 KiB each, and app/ holds at
// most 993 entries and 48 MiB, with no path over 1,000 bytes.
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

// The screenshots a hand-in needs: 3 or 4 PNG or JPEG files, each at most 256 KiB.
// Checked here, before the dossier is built, so a bad screenshot fails with a
// message naming the file instead of a bare error from the library.
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

function checkScreenshots(dir: string): void {
  const shots = readdirSync(dir).filter((name) => !name.startsWith('.')).sort();
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`screenshots/: holds ${shots.length} images, need 3 or 4`);
  }
  for (const name of shots) {
    const path = join(dir, name);
    const bytes = readFileSync(path);
    if (bytes.length > 262144) {
      throw new Error(`screenshots/${name}: ${bytes.length} bytes, over the 256 KiB cap`);
    }
    const isPng = PNG_MAGIC.every((b, i) => bytes[i] === b);
    const isJpeg = JPEG_MAGIC.every((b, i) => bytes[i] === b);
    if (!isPng && !isJpeg) {
      throw new Error(`screenshots/${name}: neither a PNG nor a JPEG`);
    }
  }
}

// How many plain files a folder tree holds (directories excluded), for the summary.
function countFiles(dir: string): number {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    total += statSync(path).isDirectory() ? countFiles(path) : 1;
  }
  return total;
}

mkdirSync(targetDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(targetDir, 'app'), { recursive: true });
mkdirSync(join(targetDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(targetDir, 'screenshots'), { recursive: true });
}
checkScreenshots(join(targetDir, 'screenshots'));

const dossier = buildDossier(targetDir, dossierCaps);
writeFileSync(join(targetDir, 'dossier.json'), dossier);

console.log(
  `handed in ${countFiles(join(targetDir, 'app'))} app files and ` +
    `${countFiles(join(targetDir, 'screenshots'))} screenshots, ` +
    `dossier.json ${dossier.length} bytes`,
);
