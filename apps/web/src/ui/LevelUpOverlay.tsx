import { RARITY } from "../data/upgrades.js";
import type { LevelUpEvent } from "../game/types.js";

export function LevelUpOverlay({
  event,
  onChoose,
}: {
  event: LevelUpEvent;
  onChoose: (optionId: string) => void;
}) {
  return (
    <div className="overlay">
      <div className="panel levelup">
        <h2>Level {event.level}!</h2>
        <p className="subtle">Choose an upgrade</p>
        <div className="choices">
          {event.options.map((opt) => {
            const rarity = RARITY[opt.rarity];
            return (
              <button
                key={opt.id}
                className={`choice rarity-${opt.rarity}`}
                style={{ borderColor: rarity.color }}
                onClick={() => onChoose(opt.id)}
              >
                <span className="choice-head">
                  <span className="choice-name">{opt.name}</span>
                  <span className="rarity-badge" style={{ color: rarity.color }}>
                    {rarity.label}
                  </span>
                </span>
                <span className="choice-desc">{opt.description}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
