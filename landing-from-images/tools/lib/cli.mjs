import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';

export function parseArgs(argv, allowed) {
  const options = {};
  const files = [];
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i];
    if (item === '--') { files.push(...argv.slice(i + 1)); break; }
    if (!item.startsWith('--')) { files.push(item); continue; }
    const key = item.slice(2);
    if (!allowed.includes(key)) throw new Error(`Opção desconhecida: ${item}`);
    if (options[key] !== undefined) throw new Error(`Opção repetida: ${item}`);
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error(`Informe o valor de ${item}`);
    options[key] = value;
  }
  return { options, files };
}

export function number(value, name, { min = 1, max = 100000, integer = true } = {}) {
  const result = Number(value);
  if (!Number.isFinite(result) || result < min || result > max || (integer && !Number.isInteger(result))) {
    throw new Error(`${name} deve ser ${integer ? 'inteiro' : 'número'} entre ${min} e ${max}.`);
  }
  return result;
}

export async function writeJson(file, value) {
  await mkdir(path.dirname(path.resolve(file)), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function main(moduleUrl, action) {
  if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === moduleUrl) {
    action().catch(error => { console.error(error.message); process.exitCode = 1; });
  }
}
