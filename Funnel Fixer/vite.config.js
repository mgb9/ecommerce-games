import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Single-file React artifact. The funnel engine is kept pure, seeded and
// dependency-free (no React, no I/O) so it can be unit-tested in isolation
// and ported into the same Vite repo as Marketplace Tycoon / Conversion Lab.
export default defineConfig({
  plugins: [react()],
});
