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

// Canonical list of D&D races and subraces (simplified)
const RACES = {
  dragonborn: [],
  dwarf: ['hill', 'mountain'],
  elf: ['high', 'wood', 'drow', 'eladrin'],
  gnome: ['forest', 'rock'],
  halfling: ['lightfoot', 'stout'],
  human: [],
  tiefling: [],
  half_orc: [],
  half_elf: [],
  aasimar: ['protector', 'scourge', 'fallen'],
  genasi: ['air', 'earth', 'fire', 'water'],
  goliath: [],
  tabaxi: [],
  firbolg: [],
  kenku: [],
  tortle: [],
  yuan_ti: [],
  triton: [],
  goblin: [],
  hobgoblin: [],
  bugbear: [],
  kobold: [],
  lizardfolk: [],
  warforged: [],
  changeling: [],
  kalashtar: [],
  shifter: [],
  orc: [],
  gith: ['githyanki', 'githzerai'],
};

app.get('/api/meta/races', (req, res) => {
  res.json({ races: RACES });
});

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

// Delete character: removes markdown and matching image if exists
app.post('/api/characters/delete', async (req, res) => {
  const { base } = req.body || {};
  if (!base) return res.status(400).json({ error: 'base is required' });
  try {
    const mdPath = path.join(contentDir, base + '.md');
    const imgPath = path.join(imagesDir, base + '.webp');
    if (await fileExists(mdPath)) await fs.unlink(mdPath);
    if (await fileExists(imgPath)) await fs.unlink(imgPath);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/characters/update', async (req, res) => {
  const { originalBase, name, race, subrace } = req.body || {};
  if (!originalBase) return res.status(400).json({ error: 'originalBase is required' });
  try {
    const mdPath = path.join(contentDir, originalBase + '.md');
    if (!(await fileExists(mdPath))) return res.status(404).json({ error: 'Character markdown not found' });

    const raw = await fs.readFile(mdPath, 'utf8');
    const parsed = matter(raw);
    const data = parsed.data || {};
    const oldImageBase = data.imageFileBase || originalBase;

    // Compute target base from naming convention: race_subrace_name
    const parts = [race || '', subrace || '', name || ''].filter(Boolean);
    let computed = parts.join('_');
    if (!computed) computed = originalBase; // fallback
    let targetBase = toSnakeCase(computed);
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
