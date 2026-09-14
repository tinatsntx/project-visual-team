import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { hostBridge } from "./bridge/hostBridge.js";
import "./styles.css";

// Start listening before React effects so an initial host tool-result cannot
// arrive in the small gap between iframe load and component mount.
hostBridge.start();

const el = document.getElementById("root");
if (el) {
  createRoot(el).render(<App />);
}
