/**
 * Persistent save data — shared by the local-first IndexedDB store and the
 * cloud sync layer. `version` enables migrations; `updatedAt` drives the
 * last-write-wins merge when an account is linked.
 */

import type {
  AchievementId,
  BranchId,
  CharacterId,
  GameSettings,
  UpgradeId,
} from "./types.js";

export const SAVE_VERSION = 1;

export interface SaveStats {
  runs: number;
  bestScore: number;
  totalKills: number;
}

export interface SaveData {
  version: number;
  /** Epoch ms of last write; used for last-write-wins sync. */
  updatedAt: number;
  gold: number;
  runePointsTotal: number;
  runeAllocation: Record<BranchId, number>;
  shopUpgrades: Record<UpgradeId, number>;
  unlockedCharacters: CharacterId[];
  achievements: AchievementId[];
  /** Gates Extra Difficulty in Normal mode. */
  normalCleared: boolean;
  settings: GameSettings;
  stats: SaveStats;
}

/** A brand-new save for a first-time (guest) player. */
export function createDefaultSave(now: number = Date.now()): SaveData {
  return {
    version: SAVE_VERSION,
    updatedAt: now,
    gold: 0,
    runePointsTotal: 1,
    runeAllocation: { melee: 0, ranged: 0, aoe: 0, utility: 0 },
    shopUpgrades: {},
    unlockedCharacters: ["wanderer"],
    achievements: [],
    normalCleared: false,
    settings: {
      aimMode: "assisted",
      masterVolume: 0.8,
    },
    stats: {
      runs: 0,
      bestScore: 0,
      totalKills: 0,
    },
  };
}

/**
 * Migrate an older save to the current schema. New fields are filled from the
 * default save so older clients/payloads keep working. Extend per version bump.
 */
export function migrateSave(raw: Partial<SaveData> | null | undefined): SaveData {
  const base = createDefaultSave();
  if (!raw) return base;

  return {
    ...base,
    ...raw,
    version: SAVE_VERSION,
    runeAllocation: { ...base.runeAllocation, ...raw.runeAllocation },
    shopUpgrades: { ...base.shopUpgrades, ...raw.shopUpgrades },
    settings: { ...base.settings, ...raw.settings },
    stats: { ...base.stats, ...raw.stats },
  };
}

/** Last-write-wins merge of two saves (local vs cloud). */
export function mergeSaves(a: SaveData, b: SaveData): SaveData {
  return a.updatedAt >= b.updatedAt ? a : b;
}
