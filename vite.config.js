import { defineConfig } from "vite";

export default defineConfig({
  base: "./", // relative paths, so it works from any folder or sub-path
  build: {
    outDir: "dist",
    minify: true, // JS + CSS are minified (this is also the default)
    sourcemap: false, // don't ship source maps, so the original source isn't exposed
  },
});
