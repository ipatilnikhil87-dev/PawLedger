import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

console.log('🐾 Starting PawLedger Client and Server...');

const children = [];

function startProcess(name, dir, args, prefixColor) {
  const resetColor = '\x1b[0m';
  const prefix = `${prefixColor}[${name}]${resetColor} `;

  const proc = spawn(npmCmd, args, {
    cwd: path.resolve(__dirname, dir),
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  proc.stdout.on('data', (data) => {
    const lines = data.toString().split(/\r?\n/);
    lines.forEach((line) => {
      if (line.trim()) console.log(`${prefix}${line}`);
    });
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().split(/\r?\n/);
    lines.forEach((line) => {
      if (line.trim()) console.error(`${prefix}${line}`);
    });
  });

  proc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`${prefix}Exited with code ${code}`);
    }
  });

  children.push(proc);
  return proc;
}

startProcess('Client', 'client', ['run', 'dev'], '\x1b[36m');
startProcess('Server', 'server', ['run', 'dev'], '\x1b[33m');

function cleanup() {
  console.log('\n🐾 Shutting down PawLedger services...');
  for (const child of children) {
    if (child && !child.killed && child.pid) {
      if (isWin) {
        try {
          spawn('taskkill', ['/pid', child.pid.toString(), '/f', '/t']);
        } catch {
          child.kill('SIGTERM');
        }
      } else {
        child.kill('SIGTERM');
      }
    }
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', () => {
  for (const child of children) {
    if (child && !child.killed) {
      child.kill();
    }
  }
});
