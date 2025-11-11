import express from 'express';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const app = express();
app.use(express.json());

const repoRoot = process.cwd();
const contentDir = path.join(repoRoot, 'src', 'content', 'characters');
const imagesDir = path.join(repoRoot, 'public', 'images');

// Serve admin UI and images
app.use('/images', express.static(imagesDir, { fallthrough: true }));
app.use('/', express.static(path.join(repoRoot, 'admin', 'public')));

function toSnakeCase(base) {
  return base
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function uniqueBase(base) {
  let candidate = base;
  let i = 1;
  while (await fileExists(path.join(imagesDir, candidate + '.webp')) || await fileExists(path.join(contentDir, candidate + '.md'))) {
    candidate = `${base}-${i++}`;
  }
  return candidate;
}

async function loadCharacters() {
  const files = await fs.readdir(contentDir);
  const items = [];
  for (const f of files) {
    if (!f.endsWith('.md')) continue;
    const base = f.slice(0, -3);
    const full = path.join(contentDir, f);
    const raw = await fs.readFile(full, 'utf8');
    const parsed = matter(raw);
    const data = parsed.data || {};
    const imageBase = data.imageFileBase || base;
    const hasImage = fssync.existsSync(path.join(imagesDir, imageBase + '.webp'));
    items.push({
      filename: f,
      base,
      imageFileBase: imageBase,
      name: data.name || '',
      race: data.race || '',
      subrace: data.subrace || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      projects: Array.isArray(data.projects) ? data.projects : [],
      imageUrl: `/images/${imageBase}.webp`,
      hasImage,
    });
  }
  // sort by name or base
  items.sort((a,b) => (a.name||a.base).localeCompare(b.name||b.base));
  return items;
}

app.get('/api/characters', async (req, res) => {
  try {
    const items = await loadCharacters();
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/characters/update', async (req, res) => {
  const { originalBase, name, race, subrace, newBase } = req.body || {};
  if (!originalBase) return res.status(400).json({ error: 'originalBase is required' });
  try {
    const mdPath = path.join(contentDir, originalBase + '.md');
    if (!(await fileExists(mdPath))) return res.status(404).json({ error: 'Character markdown not found' });

    const raw = await fs.readFile(mdPath, 'utf8');
    const parsed = matter(raw);
    const data = parsed.data || {};
    const oldImageBase = data.imageFileBase || originalBase;

    let targetBase = newBase && newBase.trim() ? toSnakeCase(newBase.trim()) : originalBase;
    if (targetBase !== originalBase) {
      targetBase = await uniqueBase(targetBase);
    }

    // Rename image if base changed and image exists
    if (targetBase !== oldImageBase) {
      const oldImagePath = path.join(imagesDir, oldImageBase + '.webp');
      if (await fileExists(oldImagePath)) {
        const newImagePath = path.join(imagesDir, targetBase + '.webp');
        await fs.rename(oldImagePath, newImagePath);
      }
    }

    // Update frontmatter
    parsed.data.imageFileBase = targetBase;
    if (typeof name === 'string') parsed.data.name = name;
    if (typeof race === 'string') parsed.data.race = race;
    if (typeof subrace === 'string') parsed.data.subrace = subrace;

    const newMd = matter.stringify(parsed.content || '', parsed.data);

    // Rename markdown file if base changed
    const newMdPath = path.join(contentDir, targetBase + '.md');
    if (targetBase !== originalBase) {
      await fs.writeFile(newMdPath, newMd, 'utf8');
      await fs.unlink(mdPath);
    } else {
      await fs.writeFile(mdPath, newMd, 'utf8');
    }

    res.json({ ok: true, updatedBase: targetBase });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 5174;
app.listen(port, () => {
  console.log(`Admin UI running at http://localhost:${port}`);
});
