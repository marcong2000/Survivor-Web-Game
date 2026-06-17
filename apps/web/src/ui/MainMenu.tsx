import type { GameMode } from "@survivor/shared";
import { useSave } from "../save/SaveContext.js";

export function MainMenu({
  onPlay,
  onSettings,
  onGmMode,
}: {
  onPlay: (mode: GameMode) => void;
  onSettings: () => void;
  onGmMode: () => void;
}) {
  const { save } = useSave();
  if (!save) return null;

  return (
    <div className="screen main-menu">
      <h1 className="title">SURVIVOR</h1>
      <p className="subtitle">A roguelike survival run. Stay alive, grow stronger.</p>

      <div className="stat-strip">
        <span>🪙 {save.gold}</span>
        <span>🔷 {save.runePointsTotal}</span>
        <span>🏆 Best {save.stats.bestScore}</span>
      </div>

      <div className="menu-buttons">
        <button className="primary" onClick={() => onPlay("normal")}>
          Play — Normal
        </button>
        <button className="primary" onClick={() => onPlay("unlimited")}>
          Play — Unlimited
        </button>
        <button className="secondary" onClick={onSettings}>
          Settings
        </button>
        <button className="secondary" onClick={onGmMode}>
          GM Mode (test)
        </button>
      </div>

      <p className="hint">
        Aim mode: <strong>{save.settings.aimMode === "assisted" ? "Assisted" : "Manual"}</strong> ·
        change it in Settings
      </p>
    </div>
  );
}
