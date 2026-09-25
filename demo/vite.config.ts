import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  oxc: { jsx: { runtime: "automatic" } },
  server: { port: 5199 },
  resolve: {
    alias: {
      goemoji: fileURLToPath(new URL("../src/index.ts", import.meta.url)),
    },
  },
});
