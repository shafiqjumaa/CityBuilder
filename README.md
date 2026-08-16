# Urbanova — City Builder 3D (Phase 1)

A from-scratch, browser-based 3D city builder using Three.js — original
assets and UI, not a copy of any existing game.

## ⚠️ How to run (important)

This project uses ES Modules (`import`/`export`). Browsers **block ES
module imports over `file://`** for security reasons, so double-clicking
`index.html` will show a blank page / console errors. You need a tiny
local server — pick whichever you have installed, it takes one command:

```bash
# Option A — Python (usually pre-installed on Mac/Linux)
cd city-builder
python3 -m http.server 8000
# then open http://localhost:8000

# Option B — Node.js
cd city-builder
npx serve .
# then open the URL it prints

# Option C — VS Code
# Install the "Live Server" extension, right-click index.html → "Open with Live Server"
```

Three.js itself loads from a CDN (jsdelivr) via an import map in
`index.html`, so you need an internet connection the first time (browser
caches it after that).

## What's implemented (Phase 1)

- Three.js scene, renderer, ACES tone mapping, shadows, fog
- Procedural terrain with gentle undulation + buildable grid overlay
- Water body along the north edge, low-poly instanced trees, boundary posts
- Isometric-start orbit camera: drag to orbit, right-drag/middle to pan,
  wheel to zoom, **WASD/arrow keys** to pan, clamped to map bounds
- Dark glassmorphism UI: top stat bar (money/population/happiness/income),
  bottom toolbar (9 tools, non-functional placeholders for now), game
  clock with Play/Pause/Fast-forward driving a Day/Month/Year calendar
- Debug overlay (press **F3**) showing FPS, draw calls, triangles
- Save/Load skeleton (localStorage) for time + stats
- Full modular architecture already scaffolded for every future system
  (roads, zoning, buildings, citizens, traffic, economy, utilities,
  services) as stub classes with TODOs, so later phases plug in cleanly
  without rewrites

## Not yet implemented (later phases)

Road building tool, zoning paint tool, auto-growing buildings, population
simulation, jobs, taxes/economy, electricity/water networks, garbage,
services coverage, traffic/pathfinding, day-night cycle, events,
mini-map data, and full save/load of all systems. See the numbered
phases in the original spec — this build stops at the end of Phase 1
as requested, ready for Phase 2 (roads).

## Controls

| Action                | Input                              |
|------------------------|-------------------------------------|
| Orbit camera            | Right-click drag                     |
| Pan camera              | Middle-click drag / WASD / arrows    |
| Zoom                    | Mouse wheel                          |
| Select a tool           | Click a toolbar icon                 |
| Place a road            | Select Roads tool → click start → click end |
| Cancel road placement   | Esc                                  |
| Delete a road tile      | Select Demolish tool → click the tile |
| Toggle debug overlay    | F3                                    |

Left-click is reserved for tool actions (building/selecting/demolishing),
which is why camera orbit/pan moved to right/middle mouse button — this
avoids fighting between "I'm placing a road" and "I'm rotating the camera."

## What's implemented (Phase 4 + partial Phase 6 — Buildings, Traffic, Pedestrians)

- **15 building types** (5 residential, 5 commercial, 5 industrial), each
  with a distinct footprint size (1×1 up to 3×2 cells), height, and
  procedurally-modeled low-poly shape — houses, shops with awnings,
  glass towers, factories with chimneys, an industrial complex with silos
- **Auto-growth**: zoned cells that touch a road slowly develop into
  buildings each in-game day (a handful of attempts per day, so the city
  fills in gradually instead of all at once)
- **Vehicle traffic**: cars follow the road network, count auto-scales
  with the number of buildings in the city
- **Pedestrian NPCs**: small figures walk the sidewalk edge of roads,
  count auto-scales with population
- Population is now derived live from residential building capacity
- Click a building with the Select tool to see its info panel
