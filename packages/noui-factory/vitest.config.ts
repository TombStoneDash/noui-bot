import { defineConfig } from "vitest/config";

export default defineConfig({
  // An inline PostCSS config stops Vite from loading the Next.js app's
  // postcss.config.mjs at the repo root, whose Tailwind plugin is not a
  // dependency of this package.
  css: { postcss: {} },
});
