import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { exit } from 'node:process';

const contentDir = path.join(process.cwd(), 'src', 'content', 'characters');

const REQUIRED = ['imageFileBase'];
const OPTIONAL = ['name', 'race', 'tags', 'projects'];

function isEmptyValue(val) {
  if (val === undefined || val === null) return true;
  if (Array.isArray(val) && val.length === 0) return true;
  if (typeof val === 'string' && val.trim() === '') return true;
  return false;
}

async function validate() {
  const files = await fs.readdir(contentDir);
  let failures = 0;
  for (const f of files) {
    if (!f.endsWith('.md')) continue;
    const full = path.join(contentDir, f);
    const raw = await fs.readFile(full, 'utf8');
    const parsed = matter(raw);
    const data = parsed.data;

    // Check required fields
    for (const field of REQUIRED) {
      if (isEmptyValue(data[field])) {
        console.error(`[FAIL] ${f}: missing required field '${field}'`);
        failures++;
      }
    }

    // Basic sanity: imageFileBase should match filename base
    const base = f.replace(/\.md$/, '');
    if (data.imageFileBase && data.imageFileBase !== base) {
      console.error(`[FAIL] ${f}: imageFileBase (${data.imageFileBase}) does not match filename base (${base})`);
      failures++;
    }

    // Suggest improvements
    if (!isEmptyValue(data.name) && data.name.length < 3) {
      console.warn(`[WARN] ${f}: name is very short, consider expanding.`);
    }
    if (Array.isArray(data.tags) && data.tags.some(t => t.includes(' '))) {
      console.warn(`[WARN] ${f}: tags contain spaces; consider kebab-case tokens.`);
    }
  }

  if (failures > 0) {
    console.error(`\nValidation failed: ${failures} issue(s) found.`);
    exit(1);
  } else {
    console.log('Validation passed.');
  }
}

validate().catch(err => { console.error(err); exit(1); });
