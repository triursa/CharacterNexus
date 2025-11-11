import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

// Heuristic: if base name length > 60 chars, shorten by taking first 6 meaningful tokens or first 40 chars.
// Maintain uniqueness with incremental suffix if needed.

const repoRoot = process.cwd();
const imagesDir = path.join(repoRoot, 'public', 'images');
const contentDir = path.join(repoRoot, 'src', 'content', 'characters');

function tokenize(name) {
  return name.split('_').filter(Boolean);
}

function generateShort(tokens) {
  if (tokens.length <= 6) return tokens.join('_');
  return tokens.slice(0, 6).join('_');
}

async function fileExists(p){ try { await fs.access(p); return true; } catch { return false; } }

async function uniqueBase(base) {
  let candidate = base;
  let i = 1;
  while (await fileExists(path.join(imagesDir, candidate + '.webp'))) {
    candidate = `${base}-${i++}`;
  }
  return candidate;
}

async function run() {
  const entries = await fs.readdir(imagesDir);
  const long = entries.filter(f => f.endsWith('.webp') && f.length > 70); // filename length threshold
  if (long.length === 0) {
    console.log('No long filenames to shorten.');
    return;
  }

  for (const file of long) {
    const full = path.join(imagesDir, file);
    const baseName = file.slice(0, -5); // remove .webp
    const tokens = tokenize(baseName);
    let short = generateShort(tokens);
    if (short.length > 40) short = short.slice(0, 40);
    short = short.toLowerCase();
    if (short !== baseName) {
      short = await uniqueBase(short);
      const newPath = path.join(imagesDir, short + '.webp');
      await fs.rename(full, newPath);
      // Update corresponding markdown file
      const mdPath = path.join(contentDir, baseName + '.md');
      if (await fileExists(mdPath)) {
        const raw = await fs.readFile(mdPath, 'utf8');
        const parsed = matter(raw);
        parsed.data.imageFileBase = short;
        const newMdPath = path.join(contentDir, short + '.md');
        const output = matter.stringify(parsed.content, parsed.data);
        await fs.writeFile(newMdPath, output, 'utf8');
        await fs.unlink(mdPath);
        console.log(`Renamed ${file} -> ${short}.webp and updated markdown.`);
      } else {
        console.warn(`Markdown file for ${baseName} not found.`);
      }
    }
  }
}

run().catch(err => { console.error(err); process.exit(1); });
