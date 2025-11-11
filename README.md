# CharacterNexus

Character Nexus is a display of all the characters used in TTRPG or that I've created for various projects. I'd like to create a graphical way to rename these, convert them all to webp, store them in the repository, and display the characters with profiles and tags from where the characters are from.

I've seeded the repository with the "Raw Images" folder. This is a start of all the characters that are in there.

I'd like an easy way to adjust what the projects I've used are and what's available.

I want dark mode first.

I want it sleek. 

I want the github pages of this repository to look cool and modern to display the sorted data and allow people to filter the characters, and download the images in webp or png form.

## Stack and decisions

- Frontend: Astro (static export) with Tailwind CSS (dark-only)
- Data: Markdown files with frontmatter (one per character)
- Images: WebP stored in `public/images`, PNG downloads generated on-the-fly in the browser
- Processing: GitHub Actions runs an image pipeline on pushes to `main`
- Deployment: GitHub Pages via Actions

## Repository structure

- `Raw Images/` — drop your source images here (jpg, png, webp). Subfolders are OK.
- `public/images/` — auto-generated WebP outputs (committed by CI).
- `src/content/characters/*.md` — character metadata and description (auto-stubbed by CI if missing).
- `src/pages/` — site pages, including character list and detail page.

## Character metadata (frontmatter)

Each character is a Markdown file: `src/content/characters/<imageFileBase>.md`

Frontmatter fields:

- `name` (string)
- `race` (string; e.g., Human, Elf, Dwarf, including subraces)
- `tags` (string[])
- `projects` (string[])
- `imageFileBase` (string; snake_case, without extension, matches file in `public/images`)

Example:

```md
---
name: "Arin Brightblade"
race: "Human"
tags: ["fighter", "noble"]
projects: ["ttrpg_campaign_alpha"]
imageFileBase: "arin_brightblade"
---
```

You can add a description under the frontmatter; it will render on the character page.

## How the pipeline works

1. Push images to `Raw Images/` (any subfolder).
2. GitHub Actions runs `scripts/process-images.mjs`:
   - Converts to WebP (`public/images/<snake_case>.webp`)
   - Ensures snake_case naming, resolves collisions by appending `-1`, `-2`, ...
   - Creates a Markdown stub in `src/content/characters/` if missing
3. The action commits the generated files back to the repo (skipping CI), then builds and deploys the site to Pages.

Note: You can run the processing locally if desired:

```powershell
npm install
npm run process:images
npm run dev
```

## Local development

```powershell
# First time
npm install

# Start dev server
npm run dev

# Build
npm run build
```

Open the dev server URL shown in your terminal. The homepage lists characters with search and tag/project filters. Click a card for details and download options.

## Admin GUI (local)

Run the local admin to curate characters:

```powershell
npm run admin
```

Open <http://localhost:5174>.

Features:

- Edit Name, Race, Subrace using dropdowns populated with a canonical (simplified) D&D race/subrace list.
- Basename auto-computed as: `race_subrace_name` (omits empty parts) in snake_case; uniqueness handled by suffixes (`-1`, `-2`, ...).
- Image file (`public/images/<base>.webp`) and markdown file (`src/content/characters/<base>.md`) rename together when the computed base changes.
- Delete a character (markdown + corresponding image) via the Delete button (confirmation required).
- Inline status feedback per row.

Workflow after edits/deletions:

```powershell
git status
git add .
git commit -m "chore: update characters"
git push
```

## GitHub Pages setup

The site is deployed automatically on push to `main` via `.github/workflows/deploy.yml`.

In `astro.config.mjs`, set `site` to your Pages URL (e.g., `https://<your-username>.github.io/CharacterNexus/`).

## Conventions

- Image base names use snake_case and follow `race_subrace_name` when set via Admin.
- Duplicate bases receive `-1`, `-2`, etc.
- Dark theme only.

## Roadmap

- UI polish and animations
- Better tag UX (grouping, analytics)
- Optional CSV/JSON export of character data
