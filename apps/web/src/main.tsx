import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { SaveProvider } from "./save/SaveContext.js";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

// Note: React StrictMode is intentionally omitted — its double-invoked effects
// would create and destroy the Phaser game twice on mount, which fights the
// canvas lifecycle. The game manages its own teardown in GameView.
createRoot(root).render(
  <SaveProvider>
    <App />
  </SaveProvider>,
);
