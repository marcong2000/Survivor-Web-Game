import type { AimMode, CharacterId, GameMode, MapId, PlayerStats, WeaponId } from "@survivor/shared";
import type { UpgradeOption } from "../data/upgrades.js";

/**
 * A hand-picked test loadout for GM (Game Master / debug) mode. When present on
 * a RunConfig, the GameScene ignores the character's defaults and starts the run
 * with exactly these stats, weapons, and level — for fast, targeted testing.
 */
export interface GmLoadout {
  stats: PlayerStats;
  /** Weapons the player starts with, each at the chosen level (optionally evolved). */
  weapons: { weaponId: WeaponId; level: number; evolved?: boolean }[];
  /** Player level to start at (affects the XP-to-next curve only). */
  startLevel: number;
}

/** Everything the Phaser game needs to start a run. */
export interface RunConfig {
  characterId: CharacterId;
  mapId: MapId;
  mode: GameMode;
  aimMode: AimMode;
  /** Present only for GM/test runs. */
  gm?: GmLoadout;
}

/** Live values pushed to the React HUD each frame (throttled). */
export interface HudState {
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpToNext: number;
  kills: number;
  /** Elapsed run time in seconds. */
  time: number;
}

/** Emitted when the player levels up; the run pauses until a choice is made. */
export interface LevelUpEvent {
  level: number;
  options: UpgradeOption[];
}

/** Emitted when the run ends (death or victory). */
export interface RunResult {
  victory: boolean;
  kills: number;
  time: number;
  level: number;
  /** Score converted to currency rewards. */
  score: number;
  goldEarned: number;
  runePointsEarned: number;
}

export type { UpgradeOption };
