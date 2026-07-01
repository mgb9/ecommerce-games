import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Single-file React artifact running in the browser. The stats engine is
// kept dependency-free and isomorphic (no React, no I/O) so it can be unit
// tested in isolation and, like Marketplace Tycoon's engine, ported later.
export default defineConfig({
  plugins: [react()],
});
