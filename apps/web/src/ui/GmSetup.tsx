import { useState } from "react";
import type { AimMode, GameMode, PlayerStats, WeaponId } from "@survivor/shared";
import { CHARACTERS, DEFAULT_CHARACTER_ID } from "../data/characters.js";
import { DEFAULT_MAP_ID } from "../data/maps.js";
import { WEAPONS } from "../data/weapons.js";
import type { RunConfig } from "../game/types.js";
import { useSave } from "../save/SaveContext.js";

interface WeaponPick {
  enabled: boolean;
  level: number;
  evolved: boolean;
}

const STAT_FIELDS: { key: keyof PlayerStats; label: string; step: number }[] = [
  { key: "maxHp", label: "Max HP", step: 10 },
  { key: "attack", label: "Attack (×)", step: 0.1 },
  { key: "moveSpeed", label: "Move Speed", step: 10 },
  { key: "pickupRadius", label: "Pickup Radius", step: 5 },
  { key: "xpGain", label: "XP Gain (×)", step: 0.1 },
  { key: "luck", label: "Luck", step: 1 },
];

/**
 * GM (Game Master / test) mode setup. Lets you hand-pick character stats, which
 * weapons to equip and at what level, player level, mode, and aim mode, then
 * launches a run with exactly that loadout — no grinding required.
 */
export function GmSetup({
  onStart,
  onBack,
}: {
  onStart: (config: RunConfig) => void;
  onBack: () => void;
}) {
  const { save } = useSave();
  const defaultStats = CHARACTERS[DEFAULT_CHARACTER_ID].startStats;
  const startWeaponId = CHARACTERS[DEFAULT_CHARACTER_ID].startWeaponId;

  const [stats, setStats] = useState<PlayerStats>({ ...defaultStats });
  const [startLevel, setStartLevel] = useState(1);
  const [mode, setMode] = useState<GameMode>("unlimited");
  const [aimMode, setAimMode] = useState<AimMode>(save?.settings.aimMode ?? "assisted");
  const [picks, setPicks] = useState<Record<WeaponId, WeaponPick>>(() => {
    const init: Record<WeaponId, WeaponPick> = {};
    for (const id of Object.keys(WEAPONS)) {
      init[id] = { enabled: id === startWeaponId, level: 1, evolved: false };
    }
    return init;
  });

  const setStat = (key: keyof PlayerStats, value: number) =>
    setStats((s) => ({ ...s, [key]: value }));

  const setPick = (id: WeaponId, patch: Partial<WeaponPick>) =>
    setPicks((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  const selectedWeapons = Object.entries(picks)
    .filter(([, p]) => p.enabled)
    .map(([weaponId, p]) => ({ weaponId, level: p.level, evolved: p.evolved }));

  const start = () => {
    onStart({
      characterId: DEFAULT_CHARACTER_ID,
      mapId: DEFAULT_MAP_ID,
      mode,
      aimMode,
      gm: {
        stats,
        startLevel,
        weapons: selectedWeapons,
      },
    });
  };

  return (
    <div className="screen gm-screen">
      <h1>GM Mode</h1>
      <p className="subtle">Hand-pick a loadout and jump straight into testing.</p>

      <section className="settings-section">
        <h2>Character stats</h2>
        <div className="gm-stat-grid">
          {STAT_FIELDS.map((f) => (
            <label key={f.key} className="gm-field">
              <span>{f.label}</span>
              <input
                type="number"
                step={f.step}
                value={stats[f.key]}
                onChange={(e) => setStat(f.key, Number(e.target.value))}
              />
            </label>
          ))}
          <label className="gm-field">
            <span>Start Level</span>
            <input
              type="number"
              min={1}
              step={1}
              value={startLevel}
              onChange={(e) => setStartLevel(Math.max(1, Number(e.target.value)))}
            />
          </label>
        </div>
      </section>

      <section className="settings-section">
        <h2>Weapons</h2>
        <p className="subtle">Tick the weapons to equip and set each one's level.</p>
        <div className="gm-weapons">
          {Object.values(WEAPONS).map((w) => {
            const pick = picks[w.id];
            return (
              <div key={w.id} className={`gm-weapon ${pick.enabled ? "on" : ""}`}>
                <label className="gm-weapon-head">
                  <input
                    type="checkbox"
                    checked={pick.enabled}
                    onChange={(e) => setPick(w.id, { enabled: e.target.checked })}
                  />
                  <span className="gm-weapon-name">{w.name}</span>
                </label>
                <label className="gm-weapon-level">
                  <span>Lv</span>
                  <input
                    type="number"
                    min={1}
                    max={w.maxLevel}
                    step={1}
                    value={pick.level}
                    disabled={!pick.enabled}
                    onChange={(e) => {
                      const level = Math.min(w.maxLevel, Math.max(1, Number(e.target.value)));
                      // Evolution requires max level; drop it if leveling back down.
                      setPick(w.id, { level, evolved: pick.evolved && level >= w.maxLevel });
                    }}
                  />
                  <span className="gm-weapon-max">/ {w.maxLevel}</span>
                </label>
                {w.evolution && (
                  <label className="gm-weapon-evolved">
                    <input
                      type="checkbox"
                      checked={pick.evolved}
                      disabled={!pick.enabled}
                      // Evolving implies a maxed weapon, so snap level to max.
                      onChange={(e) =>
                        setPick(w.id, {
                          evolved: e.target.checked,
                          level: e.target.checked ? w.maxLevel : pick.level,
                        })
                      }
                    />
                    <span>
                      Start evolved <em>({w.evolution.name})</em>
                    </span>
                  </label>
                )}
                <p className="gm-weapon-desc">{w.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="settings-section">
        <h2>Run options</h2>
        <div className="gm-stat-grid">
          <label className="gm-field">
            <span>Mode</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as GameMode)}>
              <option value="unlimited">Unlimited</option>
              <option value="normal">Normal</option>
            </select>
          </label>
          <label className="gm-field">
            <span>Aim</span>
            <select value={aimMode} onChange={(e) => setAimMode(e.target.value as AimMode)}>
              <option value="assisted">Assisted</option>
              <option value="manual">Manual</option>
            </select>
          </label>
        </div>
      </section>

      <div className="gm-actions">
        <button className="secondary" onClick={onBack}>
          Back
        </button>
        <button className="primary" onClick={start} disabled={selectedWeapons.length === 0}>
          Start Test Run
        </button>
      </div>
      {selectedWeapons.length === 0 && (
        <p className="subtle">Select at least one weapon to start.</p>
      )}
    </div>
  );
}
