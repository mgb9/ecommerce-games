import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Single-player runs the React app in the browser; the engine stays
// dependency-free so the same code can later run on a PartyKit server.
export default defineConfig({
  plugins: [react()],
});
