# Media Catalog

Assets for README and docs.

## Logo
- `logo.svg` — 🖨️ toner wordmark (monospace, white on transparent)

All assets live in `.readme/` to keep the repo root clean.

## Screenshots

Generated via ANSI -> aha (HTML) -> Chrome headless (2x retina PNG). Demo components in `demos/`.

### Hero
- `hero.png` — counter + progress + spinner running together

### Components
- `box-layout.png` — Box with borders, padding, nested boxes, all border styles
- `input.png` — Input component with cursor
- `select.png` — Select list with indicator on selected item
- `progress.png` — ProgressBar at various percentages
- `tabs.png` — Tabs with active tab highlighted

## Re-recording

```bash
bash .readme/record.sh              # all demos
bash .readme/record.sh select-demo  # single demo
```

## Notes
- Background: #1e1e1e (Apple Terminal style)
- Retina: 2x device scale factor
- Width: 700px CSS (1400px actual) for GitHub README
