import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Single-file React artifact. The case-generation engine is pure, seeded
// and dependency-free (no React, no I/O) so it can be unit-tested in
// isolation and ported into the same Vite repo as the rest of the suite.
export default defineConfig({
  plugins: [react()],
});
