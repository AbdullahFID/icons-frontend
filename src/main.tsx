// main.tsx — the single entry point Vite loads from index.html.
// Mounts the React tree into <div id="root" /> and pulls in global Tailwind styles.
// <StrictMode> is React's dev-only double-invoke check; it catches side-effect bugs early
// and is stripped out of the production build automatically.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
