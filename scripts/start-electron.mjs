import { spawn } from "node:child_process";
import electronPath from "electron";

// Editors built on Electron (Cursor, VS Code) export this into their terminals; if the
// spawned Electron inherits it, it runs as plain Node and `electron.app` is undefined.
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, [".", "--no-sandbox", ...process.argv.slice(2)], {
  stdio: "inherit",
  env,
});
child.on("exit", (code) => process.exit(code ?? 0));
