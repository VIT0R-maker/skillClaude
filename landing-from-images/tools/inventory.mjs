import path from 'node:path';
import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import sharp from 'sharp';
import { main, parseArgs, writeJson } from './lib/cli.mjs';

export async function describeImage(file) {
  const source = await realpath(path.resolve(file));
  const data = await readFile(source);
  const metadata = await sharp(data).metadata();
  const rotated = [5, 6, 7, 8].includes(metadata.orientation);
  return {
    file: source, sha256: createHash('sha256').update(data).digest('hex'),
    format: metadata.format, width: metadata.width, height: metadata.height,
    orientation: metadata.orientation || 1,
    orientedWidth: rotated ? metadata.height : metadata.width,
    orientedHeight: rotated ? metadata.width : metadata.height
  };
}

export async function inventory(files, out) {
  if (!files.length) throw new Error('Informe ao menos uma imagem. A ordem dos argumentos não define a ordem editorial.');
  let previous = { version: 1, images: [] };
  try { previous = JSON.parse(await readFile(out, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!Array.isArray(previous.images)) throw new Error('Inventário existente deve conter images[].');
  const images = [...previous.images];
  for (const file of files) {
    const info = await describeImage(file);
    const index = images.findIndex(item => item.file === info.file);
    const old = index < 0 ? { device: null, sections: [], order: null, matches: [], decision: null, overlaps: [], notes: [] } : images[index];
    const entry = { ...old, ...info };
    if (index < 0) images.push(entry); else images[index] = entry;
  }
  const result = { ...previous, version: 1, updatedAt: new Date().toISOString(), inspectionRequired: true, images };
  await writeJson(out, result);
  return result;
}

main(import.meta.url, async () => {
  const { options, files } = parseArgs(process.argv.slice(2), ['out']);
  if (!options.out) throw new Error('Uso: node inventory.mjs --out .work/reference-map.json "referência.png" [...imagens]');
  await inventory(files, options.out);
  console.log(`Dimensões registradas em ${path.resolve(options.out)}. Examine cada imagem e preencha ordem, dispositivo, seções, correspondências e origem da decisão.`);
});
