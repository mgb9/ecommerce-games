import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// React app: src/ui holds the screens (generated/ for cases 1–8, field/ for
// case 9, shared building blocks alongside). The case-generation engine in
// src/engine is pure, seeded and dependency-free (no React, no I/O) so it
// can be unit-tested in isolation.
export default defineConfig({
  plugins: [react()],
});
