# walltracker
Tracking animals, aircraft and more on a ceiling

Walltracker starts as a local-first ceiling projection for live aircraft. It uses
your browser location, a configurable radius, a MapLibre map, and a sun-aware
visual theme that shifts between dawn, day, dusk, and night.

## Getting Started

```bash
nvm use 25
npm run dev
```

Open `http://localhost:3000` and allow browser location access.

## Supply Chain Notes

- Dependencies are pinned with exact versions in `package.json`.
- Installs should use `--ignore-scripts` unless a package is intentionally being
  allowed to run lifecycle scripts.
- `postcss` is overridden to `8.5.10` to avoid a known advisory in the version
  pulled by Next.
- Run `npm audit signatures` and `npm audit --audit-level=moderate` before
  trusting dependency changes.

## Map Style

The app defaults to OpenFreeMap's hosted style. To test another MapLibre style,
set:

```bash
NEXT_PUBLIC_MAP_STYLE_URL="https://example.com/style.json"
```
