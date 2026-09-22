import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    discord: "src/discord.ts",
    styles: "src/styles.css",
  },
  format: ["esm"],
  target: "es2022",
  dts: { entry: { index: "src/index.ts", discord: "src/discord.ts" } },
  minify: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "react/jsx-runtime"],
});
