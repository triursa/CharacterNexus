import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const repoRoot = path.resolve(process.cwd());
const rawDir = path.join(repoRoot, 'Raw Images');
const outDir = path.join(repoRoot, 'public', 'images');
const contentDir = path.join(repoRoot, 'src', 'content', 'characters');

const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function toSnakeCase(base) {
  return base
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

async function ensureDir(p) { await fs.mkdir(p, { recursive: true }); }

async function listFiles(dir) {
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    if (e && e.code === 'ENOENT') {
      // Directory doesn't exist; treat as empty set.
      return [];
    }
    throw e;
  }
  const files = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...await listFiles(p));
    else files.push(p);
  }
  return files;
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function uniqueBase(base) {
  let candidate = base;
  let i = 1;
  while (await fileExists(path.join(outDir, candidate + '.webp'))) {
    candidate = `${base}-${i++}`;
  }
  return candidate;
}

async function convertAll() {
  await ensureDir(outDir);
  await ensureDir(contentDir);

  const all = await listFiles(rawDir);
  if (all.length === 0) {
    console.log('No raw images found ("Raw Images" missing or empty). Skipping conversion.');
    return;
  }
  const images = all.filter(p => allowedExt.has(path.extname(p).toLowerCase()));
  const seen = new Set();

  for (const src of images) {
    const baseName = path.basename(src, path.extname(src));
    let base = toSnakeCase(baseName);
    // handle collision within a single run
    let candidate = base;
    let i = 1;
    while (seen.has(candidate) || await fileExists(path.join(outDir, candidate + '.webp'))) {
      candidate = `${base}-${i++}`;
    }
    base = candidate;
    seen.add(base);

    const outPath = path.join(outDir, base + '.webp');

    const image = sharp(src, { failOn: 'none' });
    await image
      .webp({ quality: 85, effort: 5 })
      .toFile(outPath);

    const mdPath = path.join(contentDir, base + '.md');
    if (!(await fileExists(mdPath))) {
      const frontmatter = `---\nname: \"\"\nrace: \"\"\ntags: []\nprojects: []\nimageFileBase: \"${base}\"\n---\n`;
      await fs.writeFile(mdPath, frontmatter, 'utf8');
    }
  }
}

convertAll().then(() => {
  console.log('Image processing complete.');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
