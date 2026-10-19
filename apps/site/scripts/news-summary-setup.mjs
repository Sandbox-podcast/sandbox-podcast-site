import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { join } from 'node:path';

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const localDirectory = join(appRoot, '.local');
const environmentDirectory = join(localDirectory, 'news-summarizer-venv');
const modelDirectory = join(localDirectory, 'news-summary-model');
const modelPath = join(modelDirectory, 'Qwen3-4B-Instruct-2507-Q4_K_M.gguf');
const modelUrl =
  'https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF/resolve/a06e946bb6b655725eafa393f4a9745d460374c9/Qwen3-4B-Instruct-2507-Q4_K_M.gguf';
const modelSha256 = '3605803b982cb64aead44f6c1b2ae36e3acdb41d8e46c8a94c6533bc4c67e597';
const pythonBase = process.env['SANDBOX_NEWS_SUMMARY_SETUP_PYTHON'] ?? 'python';
const python = join(
  environmentDirectory,
  process.platform === 'win32' ? 'Scripts' : 'bin',
  process.platform === 'win32' ? 'python.exe' : 'python',
);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: appRoot,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} s'est arrêté avec le code ${result.status ?? 'inconnu'}.`);
}

async function downloadModel() {
  try {
    const existing = await stat(modelPath);
    if (existing.size > 2_000_000_000 && (await fileSha256(modelPath)) === modelSha256) return;
    await rm(modelPath, { force: true });
  } catch {
    // Le modèle n'a pas encore été téléchargé.
  }
  const response = await globalThis.fetch(modelUrl, {
    redirect: 'follow',
    signal: globalThis.AbortSignal.timeout(30 * 60_000),
  });
  if (!response.ok || !response.body)
    throw new Error(`Téléchargement du modèle impossible (HTTP ${response.status}).`);
  const temporary = `${modelPath}.part`;
  await rm(temporary, { force: true });
  const hash = createHash('sha256');
  let bytes = 0;
  const counter = new Transform({
    transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > 3_000_000_000) {
        callback(new Error('Le fichier du modèle dépasse la taille maximale prévue.'));
        return;
      }
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  try {
    await pipeline(response.body, counter, createWriteStream(temporary));
    if (hash.digest('hex') !== modelSha256)
      throw new Error('La somme SHA-256 du modèle Qwen ne correspond pas.');
    if (bytes < 2_000_000_000) throw new Error('Le fichier du modèle Qwen est incomplet.');
    await rename(temporary, modelPath);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

async function fileSha256(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

await mkdir(modelDirectory, { recursive: true });
run(pythonBase, ['-m', 'venv', environmentDirectory]);
run(python, [
  '-m',
  'pip',
  'install',
  '--disable-pip-version-check',
  '--only-binary=llama-cpp-python',
  '--extra-index-url',
  'https://abetlen.github.io/llama-cpp-python/whl/cpu',
  'llama-cpp-python==0.3.36',
]);
await downloadModel();
globalThis.console.log(`Générateur local prêt : ${modelPath}`);
