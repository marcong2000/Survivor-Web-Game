import type { AimMode, CharacterId, GameMode, MapId } from "@survivor/shared";
import type { UpgradeOption } from "../data/upgrades.js";

/** Everything the Phaser game needs to start a run. */
export interface RunConfig {
  characterId: CharacterId;
  mapId: MapId;
  mode: GameMode;
  aimMode: AimMode;
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
