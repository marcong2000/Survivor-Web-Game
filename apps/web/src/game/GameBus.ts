import Phaser from "phaser";
import type { HudState, LevelUpEvent, RunResult } from "./types.js";

/**
 * A tiny typed event bus bridging the React UI and the Phaser game. React
 * subscribes to game-driven events (HUD ticks, level-up, run-end) and emits
 * player decisions (chosen upgrade) back to the active scene.
 *
 * A single shared instance keeps the wiring trivial for a single-player game.
 */
export interface GameBusEvents {
  hud: (state: HudState) => void;
  levelup: (event: LevelUpEvent) => void;
  runend: (result: RunResult) => void;
  /** React -> game: the upgrade the player picked on the level-up screen. */
  "choose-upgrade": (optionId: string) => void;
  /** React -> game: request to abandon the current run. */
  "quit-run": () => void;
}

class GameBus extends Phaser.Events.EventEmitter {
  emitTyped<K extends keyof GameBusEvents>(
    event: K,
    ...args: Parameters<GameBusEvents[K]>
  ): boolean {
    return this.emit(event, ...args);
  }

  onTyped<K extends keyof GameBusEvents>(event: K, fn: GameBusEvents[K], ctx?: unknown): this {
    return this.on(event, fn as (...args: unknown[]) => void, ctx);
  }

  offTyped<K extends keyof GameBusEvents>(event: K, fn: GameBusEvents[K], ctx?: unknown): this {
    return this.off(event, fn as (...args: unknown[]) => void, ctx);
  }
}

export const gameBus = new GameBus();
