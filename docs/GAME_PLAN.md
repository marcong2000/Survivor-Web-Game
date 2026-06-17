# Survivor Web Game — Design & Planning

> A browser-based roguelike survival game inspired by *Vampire Survivors*, hosted on Cloudflare.
> This document records the full design and the phased implementation roadmap.

---

## 1. Overview

A single-player, top-down roguelike "survivor" game. The player auto-fights endless waves of
monsters, collects XP to level up, chooses weapon upgrades each level, and progresses across runs
through persistent meta-progression (gold shop, rune tree, unlockable characters). Progress is saved
locally and, once a player links an account, synced to the cloud so it follows them across devices.

### Confirmed technical decisions
| Area | Decision |
|------|----------|
| Game engine | **Phaser 3** (2D HTML5: physics, sprites, scenes, input, audio) |
| UI stack | **React + Vite + TypeScript** (menus, HUD, shop, rune tree); Phaser canvas embedded |
| Auth | **Guest-first** — play immediately, progress saved anonymously; optionally link a **Google** account later to sync |
| Hosting | **Cloudflare** — Pages (SPA) + Worker (API) + D1 (database) |
| Build approach | **Phased** — ship a playable MVP vertical slice first, then layer systems in |
| Art | **CC0 / placeholder** art for the MVP (generated shapes now; swap for a free sprite pack like Kenney later) |
| Platform | **Desktop-first** (keyboard + mouse); touch/mobile controls deferred to polish |
| Movement | **WASD** keys |
| Aiming | Player-selectable **Manual** (fire toward cursor) vs **Assisted** (auto-target nearest); a persistent **Settings-tab** choice, not a per-run prompt |

---

## 2. Architecture (Cloudflare-native)

```
Browser (React + Vite SPA, Phaser canvas embedded)
   │   - Game simulation runs fully client-side (single-player)
   │   - Local-first saves in IndexedDB; sync to cloud when account is linked
   ▼
Cloudflare Pages  ───────────────►  static SPA hosting
   │
   ▼
Cloudflare Worker (API: /api/*)   ── Hono router
   │   - Auth: Google OAuth code exchange, session cookie / JWT
   │   - Save load/store with last-write-wins conflict resolution
   ▼
Cloudflare D1 (SQLite)            Cloudflare KV (optional: sessions / cache)
   - users, saves, unlocks
```

**Rationale:** the game is single-player, so all simulation stays in the browser — no server tick, no
Durable Objects needed for the MVP. The Worker + D1 exist purely for accounts and save sync, keeping
the project comfortably within Cloudflare free tiers and low-latency.

### Repository layout (monorepo, npm workspaces)
```
/                      package.json (workspaces), README, wrangler.toml
/docs                  GAME_PLAN.md (this file), later: per-system design notes
/packages
  /shared              TS types shared client <-> worker: SaveData, RuneNode, WeaponDef, ...
/apps
  /web                 React + Vite + Phaser (the game client)
    /src
      /ui              React components: menus, HUD, shop, rune tree, character select
      /game            Phaser: scenes, systems (ECS-lite), entities, weapons
      /data            content definitions (weapons, maps, bosses, runes, characters)
      /save            local-first save layer (IndexedDB) + cloud sync client
  /worker              Cloudflare Worker: /api/auth, /api/save
```

### Supporting tech
- **Hono** — tiny, Cloudflare-first, typed router for the Worker.
- **Drizzle ORM** (or plain SQL) over **D1** for users/saves.
- **IndexedDB** (via `idb`) for local-first saves, so guests never lose progress.
- **Zod** — validate save payloads at the Worker boundary (basic anti-tamper sanity checks).
- **Vitest** for unit tests; **Playwright** optional later for smoke E2E.

---

## 3. Game Design

### 3.1 Controls & aiming (desktop-first)
- **Movement:** WASD (diagonals normalized).
- **Aim mode** — a persistent setting chosen in the **Settings tab** (not asked per run):
  - **Manual** — weapons fire toward the mouse cursor; the player aims.
  - **Assisted** — the game auto-targets (nearest enemy); the player only moves. Beginner-friendly,
    Vampire-Survivors-like.
- Weapons fire on their own cooldown in both modes; the aim mode only changes *direction*.
- Stored as `settings.aimMode` in the save, so it persists across sessions (and syncs with an account).

### 3.2 Core in-run loop
1. Player moves (WASD); weapons fire automatically, aimed by the chosen aim mode.
2. Killing a monster drops **XP gems collected only when the player is within pickup radius** of the
   death location. A *pickup radius* stat draws gems in from farther away.
3. On level-up the player is **fully healed** and shown **3 random upgrade choices** (level an
   existing weapon, add a new weapon, or boost a stat). See §3.2a for upgrade rarities.
4. A weapon reaching **level 10 evolves** — a *behavioral* change, not just bigger numbers.
   - Reference example: **Boomerang → bounces between up to 5 nearby enemies, prioritizing targets
     that have not yet been bounced.**
5. Each map has a **boss**. Defeating it advances the map (Normal) or ramps difficulty (Unlimited).
6. On death / run-end, the run awards **points → gold + rune points** for meta-progression.

### 3.2a Level-up upgrades, rarity & luck — implemented
Each of the three level-up choices independently rolls a **rarity** that scales its strength:

| Rarity | Stat-boost multiplier | Weapon levels granted |
|--------|----------------------|-----------------------|
| Normal | ×1.0 | +1 |
| Rare | ×1.6 | +2 |
| Epic | ×2.5 | +3 |
| Legendary | ×4.0 | +5 (capped at Lv 10) |

- **Stat boosts available:** Vitality (+Max HP), Swiftness (+% Move Speed), Magnet (+Pickup Radius),
  Might (+% Attack), **Wisdom (+% XP Gain)**.
- **Luck stat** biases the rarity roll toward higher tiers. Weights ≈ `normal 100`,
  `rare 22 + 6·luck`, `epic 7 + 3.5·luck`, `legendary 1.2 + 1.2·luck` (normal is fixed, so its share
  shrinks as luck rises). At luck 0, odds are roughly 74% / 18% / 6% / 1%.
- **Full heal:** leveling up restores the player to full HP.

Implementation: `apps/web/src/data/upgrades.ts` (rarity table, luck-weighted roll, Wisdom, magnitude
helpers); `GameScene` applies the rolled rarity/magnitude and heals on level-up; the level-up overlay
shows each option's rarity. `luck` is part of `PlayerStats` (settable in GM mode; future meta-
progression — gold shop / runes — can raise it).

### 3.3 Modes
- **Normal** — 4 maps, one boss each. Clearing all 4 wins the game. The first full clear unlocks
  **Extra Difficulty**: a layer of modifiers (e.g. *start with −10 Max HP*, tougher enemies, etc.).
- **Unlimited** — endless, ever-scaling difficulty. A pure score / farming mode that never ends.

### 3.4 Meta-progression (persists across runs)
- **Gold shop** — permanent upgrades to *starting* stats: Max HP, Attack, Move Speed, Pickup Radius,
  XP gain, etc. Cost scales per tier.
- **Rune tree** — points allocated across playstyle branches (e.g. **Melee / Ranged / AOE / Utility**).
  Trees **reward focused investment**: threshold bonuses that grow with points-in-branch, so
  committing to one style beats spreading thin. **Re-allocatable per run** at the loadout screen. New
  players start with **1 rune point**; more are earned from run points.
- **Characters** — multiple playable characters, each with distinct starting stats + starting weapon.
  Unlocked via **achievements** (e.g. *"kill the Map 2 boss"* unlocks a character). Achievements are
  tracked in the save.

### 3.5 Content model (data-driven, in `apps/web/src/data`)
Defining content as data (not code) lets new weapons/maps/characters be added without touching the
engine.

```ts
// weapons.ts
interface WeaponDef {
  id: string;
  name: string;
  baseStats: WeaponStats;
  perLevel: WeaponStats[];          // levels 1..10
  evolution: { trigger: EvolveTrigger; def: WeaponDef };
}

// characters.ts
interface CharacterDef {
  id: string;
  startStats: StartStats;
  startWeaponId: string;
  unlock: UnlockCondition;          // e.g. achievement id, or null = default
}

// maps.ts
interface MapDef {
  id: string;
  theme: string;
  spawnTable: SpawnEntry[];
  bossId: string;
  clearCondition: ClearCondition;   // boss defeated / survive time
}
// plus: bosses.ts, runes.ts (tree nodes + branch bonuses), achievements.ts
```

### 3.6 Save data shape (`packages/shared`)
```ts
interface SaveData {
  version: number;                       // schema version, for migrations
  updatedAt: number;                     // epoch ms, for last-write-wins sync
  gold: number;
  runePointsTotal: number;
  runeAllocation: Record<string, number>;// branchId -> points
  shopUpgrades: Record<string, number>;  // upgradeId -> tier
  unlockedCharacters: string[];
  achievements: string[];
  normalCleared: boolean;                // gates Extra Difficulty
  settings: { aimMode: 'manual' | 'assisted'; masterVolume: number };
  stats: { runs: number; bestScore: number; totalKills: number };
}
```

### 3.7 GM / test mode (developer tooling) — implemented

A **GM (Game Master) mode** for fast, targeted testing. Reached from a **GM Mode (test)** button on
the main menu, it opens a setup screen where you hand-pick a full loadout before launching a run:

- **Character stats** — Max HP, Attack, Move Speed, Pickup Radius, XP Gain, plus the starting player
  level.
- **Weapons** — tick any subset of the weapon catalogue and set each one's level (1..maxLevel).
- **Run options** — game mode (Normal / Unlimited) and aim mode (Assisted / Manual) overrides.

Implementation: an optional `gm: GmLoadout` field on `RunConfig` (`apps/web/src/game/types.ts`).
When present, `GameScene.create` skips the character defaults and starts the run with exactly the
chosen stats, weapons, levels, and player level. The setup UI lives in `apps/web/src/ui/GmSetup.tsx`.
This is a developer/testing tool and is not part of the meta-progression or save data.

---

## 4. Implementation Roadmap (phased)

### Phase 0 — Project scaffold
- Init monorepo (npm workspaces), Vite + React + TS app, Phaser dependency, Hono Worker.
- `wrangler.toml`, Pages config, basic CI (typecheck + build).
- Commit this design doc (`docs/GAME_PLAN.md`).

### Phase 1 — MVP vertical slice (single-player, no backend)
- One character, one map, one boss; the core survival loop.
- **WASD movement**; weapons honoring the **aim mode** (manual cursor-aim + assisted auto-aim);
  enemy spawner + simple AI; collisions.
- A **Settings tab** to choose and persist `aimMode`; the game reads it at run start.
- XP gems with **proximity pickup**; level-up screen with **3 upgrade choices**.
- Run-end screen with score → gold / rune-point award.
- **Local-first save** in IndexedDB (no account yet). *This is the first playable milestone.*

### Phase 2 — Weapon depth & evolution
- Multiple weapons, per-level scaling, the **level-10 evolution** mechanic (Boomerang bounce as the
  reference implementation), and the upgrade-roller's weapon pool / dedupe logic.

### Phase 3 — Meta-progression
- Gold shop (starting-stat upgrades); **rune tree** with focused-playstyle threshold bonuses;
  per-run re-allocation at a loadout screen.

### Phase 4 — Modes, maps, characters, achievements
- Full Normal mode (4 maps + bosses, win condition), Extra Difficulty modifiers, Unlimited mode.
- Additional characters + achievement-based unlocks.

### Phase 5 — Accounts & cloud sync
- Worker: Google OAuth code exchange, session cookie / JWT, `/api/save` load & store.
- D1 schema (`users`, `saves`, `unlocks`); Zod-validated payloads; last-write-wins merge.
- "Link account" flow: guest → synced; conflict handling.

### Phase 6 — Polish & ship
- Audio, VFX/juice, balance pass, mobile/touch controls, Lighthouse/perf pass.
- Deploy to Cloudflare Pages + Worker; custom domain.

---

## 5. Verification strategy
- **Phase 0:** `npm install` succeeds at root; `npm run build` (web) produces a bundle;
  `npm run typecheck` passes; dev server boots an empty Phaser canvas.
- **Phase 1 (MVP):** play manually — move, kill enemies, confirm XP only collects near the corpse,
  level up and pick from 3 upgrades, defeat the boss, see the run-end gold/rune award; reload the page
  and confirm gold/runes persisted via IndexedDB.
- **Later phases:** Vitest unit tests for damage/level-up/rune-bonus math and the save-merge function;
  Worker tested with `wrangler dev` + a save round-trip against local D1; optional Playwright smoke
  test ("start run → level up → die → reload keeps progress").

---

## 6. Open items
- **Art assets:** use a free CC0/placeholder sprite pack (e.g. Kenney) for the MVP, replace later.
- **Platform target:** desktop-first, or mobile-friendly touch controls from day one?
- **Theme/visual direction:** to be defined.
