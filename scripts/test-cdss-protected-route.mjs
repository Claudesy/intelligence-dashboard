// Designed and constructed by Claudesy.
import { spawn } from "node:child_process";

const child = spawn(process.execPath, ["./node_modules/tsx/dist/cli.mjs", "scripts/test-cdss.ts"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});

child.on("error", () => {
  process.exitCode = 1;
});
