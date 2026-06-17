/**
 * Core shared types for the game. Content-definition interfaces here are kept
 * deliberately small for the MVP; later phases (weapon evolution, rune trees,
 * achievements) extend them without breaking the save contract.
 */

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

export type CharacterId = string;
export type WeaponId = string;
export type MapId = string;
export type UpgradeId = string;
export type AchievementId = string;
export type BranchId = "melee" | "ranged" | "aoe" | "utility";

// ---------------------------------------------------------------------------
// Player preferences / settings
// ---------------------------------------------------------------------------

/**
 * How weapons are aimed during a run.
 * - `manual`   — the player aims; shots fire toward the mouse cursor.
 * - `assisted` — the game auto-targets (default: nearest enemy in range).
 *
 * Chosen once in the Settings tab and persisted; not asked per run.
 */
export type AimMode = "manual" | "assisted";

export interface GameSettings {
  aimMode: AimMode;
  // Reserved for future use (audio volume, screen shake, etc.).
  masterVolume: number;
}

// ---------------------------------------------------------------------------
// Player stats (used both for base character stats and run-time aggregates)
// ---------------------------------------------------------------------------

export interface PlayerStats {
  maxHp: number;
  /** Flat damage multiplier applied to weapon damage (1 = 100%). */
  attack: number;
  /** Pixels per second. */
  moveSpeed: number;
  /** Radius (px) within which XP gems are collected / drawn in. */
  pickupRadius: number;
  /** XP gain multiplier (1 = 100%). */
  xpGain: number;
  /**
   * Biases level-up upgrade rarities toward higher tiers. 0 = base odds; each
   * point shifts probability mass toward rare/epic/legendary.
   */
  luck: number;
}

// ---------------------------------------------------------------------------
// Content definitions (data-driven; see apps/web/src/data)
// ---------------------------------------------------------------------------

export interface WeaponStats {
  /** Damage per hit, before the player's `attack` multiplier. */
  damage: number;
  /** Seconds between shots. */
  cooldown: number;
  /** Projectile speed in px/s (0 for instant / melee). */
  projectileSpeed: number;
  /** Effective range in px (used by assisted targeting). */
  range: number;
  /** Number of projectiles fired per activation. */
  count: number;
}

/**
 * A weapon's level-10 evolution — the "crazy upgrade" applied when an owned,
 * maxed weapon is evolved. Transforms are multiplicative (`mult`) and/or
 * additive (`add`) on the level-10 stats.
 */
export interface WeaponEvolution {
  name: string;
  description: string;
  mult?: Partial<WeaponStats>;
  add?: Partial<WeaponStats>;
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  description: string;
  /** Stats at level 1. */
  baseStats: WeaponStats;
  /** Additive deltas applied per level above 1 (levels 2..maxLevel). */
  perLevelStats: Partial<WeaponStats>;
  maxLevel: number;
  /** Optional level-10 evolution (the only source of Legendary upgrades). */
  evolution?: WeaponEvolution;
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  description: string;
  startStats: PlayerStats;
  startWeaponId: WeaponId;
  /** `null` = available from the start. */
  unlockCondition: AchievementId | null;
}

export interface MapDef {
  id: MapId;
  name: string;
  theme: string;
  /** Run duration in seconds before the boss spawns (Normal mode). */
  bossSpawnTime: number;
  /** Base enemies spawned per second at the start of the run. */
  baseSpawnRate: number;
}

export type GameMode = "normal" | "unlimited";
