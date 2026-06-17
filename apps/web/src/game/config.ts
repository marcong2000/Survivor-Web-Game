import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.js";
import { GameScene } from "./scenes/GameScene.js";
import type { RunConfig } from "./types.js";

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 600;
export const WORLD_SIZE = 3120;

/** Registry key the BootScene reads to learn how to start the run. */
export const RUN_CONFIG_KEY = "runConfig";

export function createGameConfig(
  parent: HTMLElement,
  runConfig: RunConfig,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#1d2b1f",
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    callbacks: {
      preBoot: (game) => {
        game.registry.set(RUN_CONFIG_KEY, runConfig);
      },
    },
    scene: [BootScene, GameScene],
  };
}
