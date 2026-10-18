import { spawnSync } from 'node:child_process';
import console from 'node:console';
import { mkdir } from 'node:fs/promises';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { join } from 'node:path';

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const localDirectory = join(appRoot, '.local');
const environmentDirectory = join(localDirectory, 'news-translator-venv');
const modelsDirectory = join(localDirectory, 'news-translator-models');
const sentenceModelDirectory = join(localDirectory, 'news-translator-sbd');
const basePython = process.env['SANDBOX_NEWS_SETUP_PYTHON'] ?? 'python';
const argosVersion = '1.11.0';
const python =
  process.platform === 'win32'
    ? join(environmentDirectory, 'Scripts', 'python.exe')
    : join(environmentDirectory, 'bin', 'python');

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    cwd: appRoot,
    env,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} s'est arrêté avec le code ${result.status ?? 'inconnu'}.`);
}

await mkdir(localDirectory, { recursive: true });
const version = spawnSync(basePython, ['--version'], { encoding: 'utf8', windowsHide: true });
if (version.error || version.status !== 0)
  throw new Error('Python 3.10 à 3.13 est requis. Définis SANDBOX_NEWS_SETUP_PYTHON si besoin.');
const versionText = `${version.stdout ?? ''}${version.stderr ?? ''}`;
const match = /Python (\d+)\.(\d+)/u.exec(versionText);
if (!match || Number(match[1]) !== 3 || Number(match[2]) < 10 || Number(match[2]) > 13)
  throw new Error(
    `Version Python non prise en charge : ${versionText.trim()}. Utilise Python 3.10 à 3.13.`,
  );

run(basePython, ['-m', 'venv', environmentDirectory]);
run(python, [
  '-m',
  'pip',
  'install',
  '--quiet',
  '--disable-pip-version-check',
  `argostranslate==${argosVersion}`,
]);
await mkdir(modelsDirectory, { recursive: true });
await mkdir(sentenceModelDirectory, { recursive: true });
run(python, ['scripts/news-translation-setup.py'], {
  ...process.env,
  ARGOS_DEVICE_TYPE: 'cpu',
  ARGOS_CHUNK_TYPE: 'MINISBD',
  ARGOS_PACKAGES_DIR: modelsDirectory,
  SANDBOX_NEWS_SBD_DIR: sentenceModelDirectory,
  XDG_DATA_HOME: join(localDirectory, 'argos-runtime', 'data'),
  XDG_CONFIG_HOME: join(localDirectory, 'argos-runtime', 'config'),
  XDG_CACHE_HOME: join(localDirectory, 'argos-runtime', 'cache'),
});
console.log(`Moteur local prêt. Modèles conservés dans ${localDirectory}`);
