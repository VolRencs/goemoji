import { defineConfig } from "tsdown";

const lint = Boolean(process.env.LINT_PACKAGE);

export default defineConfig({
  entry: {
    index: "src/index.ts",
    discord: "src/discord.ts",
    styles: "src/styles.css",
  },
  format: "esm",
  target: "es2022",
  platform: "browser",
  dts: true,
  minify: true,
  sourcemap: true,
  clean: true,
  css: { fileName: "styles.css", minify: true },
  publint: lint,
  attw: lint ? { excludeEntrypoints: ["./styles.css"] } : false,
});
