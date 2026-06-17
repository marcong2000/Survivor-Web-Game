import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { createGameConfig } from "../game/config.js";
import { gameBus } from "../game/GameBus.js";
import type { HudState, LevelUpEvent, RunConfig, RunResult } from "../game/types.js";
import { useSave } from "../save/SaveContext.js";
import { Hud } from "./Hud.js";
import { LevelUpOverlay } from "./LevelUpOverlay.js";
import { RunEndOverlay } from "./RunEndOverlay.js";

/**
 * Mounts the Phaser game for a single run and renders the React overlays
 * (HUD, level-up, run-end) driven by `gameBus` events. Unmounting destroys
 * the game, so returning to the menu and starting again is a clean slate.
 */
export function GameView({ runConfig, onExit }: { runConfig: RunConfig; onExit: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [levelUp, setLevelUp] = useState<LevelUpEvent | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const { applyRunResult } = useSave();
  const resultAppliedRef = useRef(false);

  useEffect(() => {
    const onHud = (state: HudState) => setHud(state);
    const onLevelUp = (event: LevelUpEvent) => setLevelUp(event);
    const onRunEnd = (res: RunResult) => {
      setLevelUp(null);
      setResult(res);
      if (!resultAppliedRef.current) {
        resultAppliedRef.current = true;
        applyRunResult(res);
      }
    };

    gameBus.onTyped("hud", onHud);
    gameBus.onTyped("levelup", onLevelUp);
    gameBus.onTyped("runend", onRunEnd);

    const game = new Phaser.Game(createGameConfig(containerRef.current!, runConfig));

    return () => {
      gameBus.offTyped("hud", onHud);
      gameBus.offTyped("levelup", onLevelUp);
      gameBus.offTyped("runend", onRunEnd);
      game.destroy(true);
    };
  }, [runConfig, applyRunResult]);

  const handleChoose = (optionId: string) => {
    setLevelUp(null);
    gameBus.emitTyped("choose-upgrade", optionId);
  };

  return (
    <div className="game-view">
      <div ref={containerRef} className="game-canvas" />
      {hud && !result && <Hud hud={hud} onQuit={() => gameBus.emitTyped("quit-run")} />}
      {levelUp && !result && <LevelUpOverlay event={levelUp} onChoose={handleChoose} />}
      {result && <RunEndOverlay result={result} onContinue={onExit} />}
    </div>
  );
}
