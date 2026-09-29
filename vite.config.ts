import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Editors built on Electron (Cursor, VS Code) export this into their terminals; if the
// spawned Electron inherits it, it runs as plain Node and `electron.app` is undefined.
delete process.env.ELECTRON_RUN_AS_NODE;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: "electron/main.ts",
      },
      preload: {
        input: {
          preload: path.join(__dirname, "electron/preload.ts"),
        },
      },
      renderer: {},
    }),
  ],
  build: {
    target: "esnext",
  },
});
