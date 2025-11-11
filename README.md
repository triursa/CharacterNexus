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

To edit character names, race, and subrace and to rename image basenames directly in the repository, run the local admin:

```powershell
npm run admin
```

Then open <http://localhost:5174> in your browser. You can:

- Edit Name, Race, Subrace.
- Change the image base name (snake_case recommended). On save, both the image file in `public/images/` and the markdown file in `src/content/characters/` are updated. Collisions are handled by appending `-1`, `-2`, etc.
- Changes are written immediately to files; review with `git status` and commit when ready.

## GitHub Pages setup

The site is deployed automatically on push to `main` via `.github/workflows/deploy.yml`.

In `astro.config.mjs`, set `site` to your Pages URL (e.g., `https://<your-username>.github.io/CharacterNexus/`).

## Conventions

- Image base names use snake_case.
- Duplicate names receive `-1`, `-2`, etc.
- Dark theme only.

## Roadmap

- UI polish and animations
- Better tag UX (grouping, analytics)
- Optional CSV/JSON export of character data
