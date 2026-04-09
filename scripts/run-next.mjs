import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, symlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const localNodeModules = path.join(projectRoot, "node_modules");
const localNextBin = path.join(localNodeModules, "next", "dist", "bin", "next");
const useLocalInstall = isHealthyFile(localNextBin);
const depsRoot = useLocalInstall ? null : readDepsRoot();
const depsNodeModules = useLocalInstall ? localNodeModules : path.join(depsRoot, "node_modules");
const workspaceRoot = path.join(
  os.tmpdir(),
  "voice-journal-sheet-app-workspace",
  `${Date.now()}-${process.pid}`
);
const nextBin = useLocalInstall ? localNextBin : path.join(depsNodeModules, "next", "dist", "bin", "next");
const nextCommand = process.argv[2] ?? "";

if (!isHealthyFile(nextBin)) {
  console.error("Shared dependencies are missing or corrupted.");
  console.error("Run `npm run setup:deps` in this project first.");
  process.exit(1);
}

if (!useLocalInstall) {
  syncWorkspace();
}

const env = {
  ...process.env,
  NODE_PATH: process.env.NODE_PATH
    ? `${depsNodeModules}${path.delimiter}${process.env.NODE_PATH}`
    : depsNodeModules
};

const result = spawnSync(process.execPath, [nextBin, ...process.argv.slice(2)], {
  cwd: useLocalInstall ? projectRoot : workspaceRoot,
  stdio: "inherit",
  env,
  shell: false
});

if (!useLocalInstall && nextCommand !== "dev" && nextCommand !== "start") {
  rmSync(workspaceRoot, { recursive: true, force: true });
}

process.exit(result.status ?? 1);

function syncWorkspace() {
  mkdirSync(workspaceRoot, { recursive: true });
  symlinkSync(depsNodeModules, path.join(workspaceRoot, "node_modules"), "junction");

  for (const entry of [
    "app",
    "lib",
    "public",
    "data",
    ".data",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next-env.d.ts",
    "next.config.ts",
    ".eslintrc.json",
    ".env.local",
    ".env.example"
  ]) {
    const source = path.join(projectRoot, entry);
    const destination = path.join(workspaceRoot, entry);

    if (!existsSync(source)) {
      continue;
    }

    cpSync(source, destination, {
      recursive: true,
      force: true
    });
  }
}

function isHealthyFile(filePath) {
  return existsSync(filePath) && statSync(filePath).size > 0;
}

function readDepsRoot() {
  const stateFile = path.join(projectRoot, ".data", "runtime", "deps-path.json");

  if (!existsSync(stateFile)) {
    console.error("Shared dependencies are missing.");
    console.error("Run `npm run setup:deps` in this project first.");
    process.exit(1);
  }

  const raw = readFileSync(stateFile, "utf8");
  const parsed = JSON.parse(raw);

  if (!parsed.depsRoot) {
    console.error("Dependency state is invalid.");
    console.error("Run `npm run setup:deps` in this project again.");
    process.exit(1);
  }

  return parsed.depsRoot;
}
