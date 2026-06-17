# Survivor Web Game

A browser-based roguelike survival game inspired by *Vampire Survivors*, built to run on Cloudflare.
Survive waves of monsters, collect XP, pick weapon upgrades each level, and carry progress across
runs via persistent meta-progression.

See [`docs/GAME_PLAN.md`](docs/GAME_PLAN.md) for the full design and the phased roadmap.

## Status

- **Phase 0 — scaffold:** ✅ monorepo, Vite + React + Phaser client, Cloudflare Worker stub.
- **Phase 1 — MVP vertical slice:** ✅ playable single-player run (see below).

## Tech stack

- **Client:** React + Vite + TypeScript, with a [Phaser 3](https://phaser.io) canvas embedded.
- **Worker:** [Hono](https://hono.dev) on Cloudflare Workers (health route only for now; auth + save
  sync land in Phase 5).
- **Shared:** a `@survivor/shared` package holds the `SaveData` contract used by both sides.
- **Saves:** local-first in IndexedDB (via `idb`); cloud sync comes later.

## Monorepo layout

```
packages/shared   shared TypeScript types (SaveData, content defs)
apps/web          the game client (React + Phaser)
apps/worker       Cloudflare Worker API (Hono)
docs/             design + planning
```

## Getting started

```bash
npm install        # install all workspaces
npm run dev         # start the web client (Vite) at http://localhost:5173
```

Other scripts:

```bash
npm run build       # type-check + build the shared package and the web client
npm run typecheck   # type-check every workspace
npm test            # run unit tests (Vitest)
```

## How to play (MVP)

- **Move:** `W` `A` `S` `D`.
- **Aiming:** choose **Assisted** (auto-target nearest enemy) or **Manual** (fire toward the mouse
  cursor) in **Settings**. The choice is saved and used for every run.
- Survive, collect XP gems (only picked up when you get close to where an enemy died), and choose one
  of three upgrades on each level-up. Defeat the boss in Normal mode to win.

## Placeholder art

The MVP uses simple generated shapes as CC0 placeholders so it runs with no external assets. These
will be swapped for a free sprite pack (e.g. Kenney) in the polish phase.
