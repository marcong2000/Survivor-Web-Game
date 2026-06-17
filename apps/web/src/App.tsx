import { useState } from "react";
import type { GameMode } from "@survivor/shared";
import { DEFAULT_CHARACTER_ID } from "./data/characters.js";
import { DEFAULT_MAP_ID } from "./data/maps.js";
import type { RunConfig } from "./game/types.js";
import { useSave } from "./save/SaveContext.js";
import { GameView } from "./ui/GameView.js";
import { GmSetup } from "./ui/GmSetup.js";
import { MainMenu } from "./ui/MainMenu.js";
import { Settings } from "./ui/Settings.js";

type Screen = "menu" | "settings" | "gm" | "playing";

export function App() {
  const { save, loading } = useSave();
  const [screen, setScreen] = useState<Screen>("menu");
  const [runConfig, setRunConfig] = useState<RunConfig | null>(null);

  if (loading || !save) {
    return <div className="screen loading">Loading…</div>;
  }

  const startRun = (mode: GameMode) => {
    setRunConfig({
      characterId: DEFAULT_CHARACTER_ID,
      mapId: DEFAULT_MAP_ID,
      mode,
      aimMode: save.settings.aimMode,
    });
    setScreen("playing");
  };

  if (screen === "playing" && runConfig) {
    return (
      <GameView
        runConfig={runConfig}
        onExit={() => {
          setRunConfig(null);
          setScreen("menu");
        }}
      />
    );
  }

  if (screen === "settings") {
    return <Settings onBack={() => setScreen("menu")} />;
  }

  if (screen === "gm") {
    return (
      <GmSetup
        onStart={(config) => {
          setRunConfig(config);
          setScreen("playing");
        }}
        onBack={() => setScreen("menu")}
      />
    );
  }

  return (
    <MainMenu
      onPlay={startRun}
      onSettings={() => setScreen("settings")}
      onGmMode={() => setScreen("gm")}
    />
  );
}
