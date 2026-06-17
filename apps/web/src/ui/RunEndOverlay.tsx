import type { RunResult } from "../game/types.js";

export function RunEndOverlay({
  result,
  onContinue,
}: {
  result: RunResult;
  onContinue: () => void;
}) {
  return (
    <div className="overlay">
      <div className="panel runend">
        <h2>{result.victory ? "Victory!" : "You Fell"}</h2>
        <ul className="result-list">
          <li>
            <span>Score</span>
            <span>{result.score}</span>
          </li>
          <li>
            <span>Survived</span>
            <span>
              {Math.floor(result.time / 60)}:{(result.time % 60).toString().padStart(2, "0")}
            </span>
          </li>
          <li>
            <span>Level reached</span>
            <span>{result.level}</span>
          </li>
          <li>
            <span>Kills</span>
            <span>{result.kills}</span>
          </li>
          <li className="reward">
            <span>Gold earned</span>
            <span>+{result.goldEarned}</span>
          </li>
          <li className="reward">
            <span>Rune points</span>
            <span>+{result.runePointsEarned}</span>
          </li>
        </ul>
        <button className="primary" onClick={onContinue}>
          Back to Menu
        </button>
      </div>
    </div>
  );
}
