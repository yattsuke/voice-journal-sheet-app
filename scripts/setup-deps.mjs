import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const depsBaseRoot = path.join(os.tmpdir(), "voice-journal-sheet-app-deps");
const depsRoot = path.join(depsBaseRoot, `${Date.now()}-${process.pid}`);
const stateDir = path.join(projectRoot, ".data", "runtime");
const stateFile = path.join(stateDir, "deps-path.json");

mkdirSync(depsRoot, { recursive: true });
mkdirSync(stateDir, { recursive: true });

for (const file of ["package.json", "package-lock.json"]) {
  const source = path.join(projectRoot, file);
  if (existsSync(source)) {
    copyFileSync(source, path.join(depsRoot, file));
  }
}

const installCommand = existsSync(path.join(projectRoot, "package-lock.json"))
  ? "npm.cmd ci"
  : "npm.cmd install";

const result = process.platform === "win32"
  ? spawnSync("cmd.exe", ["/d", "/s", "/c", installCommand], {
      cwd: depsRoot,
      stdio: "inherit",
      shell: false
    })
  : spawnSync("npm", [existsSync(path.join(projectRoot, "package-lock.json")) ? "ci" : "install"], {
      cwd: depsRoot,
      stdio: "inherit",
      shell: false
    });

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

writeFileSync(
  stateFile,
  JSON.stringify(
    {
      depsRoot,
      updatedAt: new Date().toISOString()
    },
    null,
    2
  )
);

console.log(`Dependencies are ready in ${depsRoot}`);
