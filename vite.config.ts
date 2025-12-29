import { defineConfig } from "vite";

export default defineConfig({
  base: "./", // IMPORTANT for GitHub Pages
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
