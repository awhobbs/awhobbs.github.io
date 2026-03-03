# CLAUDE.md

## Site Overview
Andrew Hobbs's personal academic website at **hobbservations.com**.

## Tech Stack
- **Framework**: Jekyll with the [al-folio](https://github.com/alshedivat/al-folio) theme
- **Deployment**: GitHub Pages via GitHub Actions (master branch builds to gh-pages)
- **Domain**: hobbservations.com (custom domain)
- **Repo**: https://github.com/awhobbs/awhobbs.github.io

## Key Directories & Files
- `_bibliography/papers.bib` — Master publication list (BibTeX). This drives the publications displayed on the site via jekyll-scholar.
- `_pages/about.md` — Homepage content. Includes selected publications via `selected_papers.liquid`.
- `_projects/` — Research project pages (markdown with YAML frontmatter).
- `_layouts/bib.liquid` — Template for rendering individual publication entries (handles PDF, DOI, abstract buttons).
- `_includes/selected_papers.liquid` — Queries papers.bib for `selected={true}` entries to show on homepage.
- `assets/pdf/` — PDF files for papers and CV. Referenced in papers.bib via `pdf=` field; template prepends `/assets/pdf/`.
- `_config.yml` — Jekyll config. Scholar settings (first_name, last_name) used to bold Andrew's name in author lists.

## Publications
- Add papers to `_bibliography/papers.bib`
- Set `selected={true}` to show on homepage
- Add `pdf={filename.pdf}` to link a PDF button (file goes in `assets/pdf/`)
- Add `doi={...}` for a DOI button
- Types: `@article` for published, `@unpublished` for working papers

## PDF Redirect Note
`assets/pdf/Gender_and_the_Decision_to_Insure.pdf` was the old filename for the insurance framing working paper. It was replaced with the current version so that old external links still work. The canonical filename going forward is `Insurance_Framing_and_Demand.pdf`.

## Deploy Workflow
- `.github/workflows/deploy.yml` triggers on pushes to master
- **Path filter**: only triggers when matching files change (`.html`, `.liquid`, `.md`, `.yml`, `.bib`, `assets/**`, `Gemfile`)
- `.bib` was added to the path filter (March 2026) — previously bib-only commits didn't trigger builds
- Use `gh workflow run deploy.yml --ref master` to trigger manually if needed

## Build
```bash
bundle exec jekyll serve  # local preview
# Pushes to master trigger GitHub Actions deploy
```

## Gotchas
- `enable_publication_thumbnails` is set to `false` in `_config.yml`. Turning it on adds an empty left column that indents publications.
- The `max_author_limit` is set to 3 in `_config.yml` with a "click to expand" for longer author lists.
