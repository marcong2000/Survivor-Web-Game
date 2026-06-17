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
          {event.options.map((opt) => (
            <button key={opt.id} className="choice" onClick={() => onChoose(opt.id)}>
              <span className="choice-name">{opt.name}</span>
              <span className="choice-desc">{opt.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
