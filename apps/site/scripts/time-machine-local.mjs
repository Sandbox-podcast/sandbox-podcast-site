import { spawn } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
if (args.length > 1 || (args[0] && !/^--port=\d{4,5}$/.test(args[0])))
  throw new Error('Usage : time-machine-local.mjs [--port=3000]');
const port = args[0] ? Number(args[0].slice(7)) : 3000;
if (port < 1024 || port > 65535) throw new Error('Port local invalide.');

const child = spawn(
  process.execPath,
  [
    fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url)),
    'dev',
    '--webpack',
    '--hostname',
    '127.0.0.1',
    '--port',
    String(port),
  ],
  {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    stdio: 'inherit',
    env: { ...process.env },
  },
);

child.on('error', (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
process.on('SIGINT', () => {
  child.kill('SIGINT');
});
process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});
