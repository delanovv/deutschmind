import "dotenv/config";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL не настроен");
const directory = path.resolve("backups");
fs.mkdirSync(directory, { recursive: true });
const output = path.join(directory, `deutschmind-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`);
const child = spawn("pg_dump", ["--format=custom", "--file", output, process.env.DATABASE_URL], { stdio: "inherit" });
child.on("exit", (code) => {
  if (code) process.exit(code);
  console.log(`Backup created: ${output}`);
});
