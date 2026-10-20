import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import './build-bridge-text.mjs';
const windows = process.platform === 'win32';
const candidate =
  windows && process.env.ProgramFiles
    ? path.join(process.env.ProgramFiles, 'dotnet', 'dotnet.exe')
    : null;
const dotnet = candidate && fs.existsSync(candidate) ? candidate : 'dotnet';
const run = spawnSync(
  dotnet,
  ['build', 'bridge/Companion.Bridge.csproj', '-c', 'Release', '-o', 'bridge/dist'],
  { stdio: 'inherit', shell: false },
);
if (run.error) throw run.error;
process.exitCode = run.status ?? 1;
