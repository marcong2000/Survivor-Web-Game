import type { HudState } from "../game/types.js";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Hud({ hud, onQuit }: { hud: HudState; onQuit: () => void }) {
  const hpPct = hud.maxHp > 0 ? (hud.hp / hud.maxHp) * 100 : 0;
  const xpPct = hud.xpToNext > 0 ? (hud.xp / hud.xpToNext) * 100 : 0;

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-timer">{formatTime(hud.time)}</div>
        <div className="hud-kills">☠ {hud.kills}</div>
        <button className="hud-quit" onClick={onQuit}>
          Quit
        </button>
      </div>

      <div className="hud-bars">
        <div className="bar bar-xp">
          <div className="bar-fill xp" style={{ width: `${xpPct}%` }} />
          <span className="bar-label">Lv {hud.level}</span>
        </div>
        <div className="bar bar-hp">
          <div className="bar-fill hp" style={{ width: `${hpPct}%` }} />
          <span className="bar-label">
            {hud.hp} / {hud.maxHp}
          </span>
        </div>
      </div>
    </div>
  );
}
