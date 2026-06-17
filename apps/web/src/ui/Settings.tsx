import type { AimMode } from "@survivor/shared";
import { useSave } from "../save/SaveContext.js";

const AIM_MODES: { value: AimMode; title: string; blurb: string }[] = [
  {
    value: "assisted",
    title: "Assisted Aim",
    blurb: "The game auto-targets the nearest enemy. Just focus on moving (WASD).",
  },
  {
    value: "manual",
    title: "Manual Aim",
    blurb: "You aim — weapons fire toward your mouse cursor. More control, more skill.",
  },
];

export function Settings({ onBack }: { onBack: () => void }) {
  const { save, updateSettings } = useSave();
  if (!save) return null;

  const { aimMode, masterVolume } = save.settings;

  return (
    <div className="screen settings-screen">
      <h1>Settings</h1>

      <section className="settings-section">
        <h2>Aiming</h2>
        <p className="subtle">
          Pick how you want to aim. This is saved and used for every run — no need to choose each time.
        </p>
        <div className="aim-options">
          {AIM_MODES.map((mode) => (
            <button
              key={mode.value}
              className={`aim-option ${aimMode === mode.value ? "selected" : ""}`}
              onClick={() => updateSettings({ aimMode: mode.value })}
            >
              <span className="aim-title">{mode.title}</span>
              <span className="aim-blurb">{mode.blurb}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2>Audio</h2>
        <label className="slider-row">
          <span>Master volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={masterVolume}
            onChange={(e) => updateSettings({ masterVolume: Number(e.target.value) })}
          />
          <span className="slider-value">{Math.round(masterVolume * 100)}%</span>
        </label>
      </section>

      <section className="settings-section">
        <h2>Controls</h2>
        <p className="subtle">Move with W A S D. Weapons fire automatically on their own cooldown.</p>
      </section>

      <button className="primary" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
