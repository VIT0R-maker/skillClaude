import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { describeImage } from './inventory.mjs';
import { main, number, parseArgs, writeJson } from './lib/cli.mjs';

export async function crop({ source, out, rect, log, width }) {
  if (!source || !out || !log || !rect) throw new Error('Informe --source, --out, --rect x,y,w,h e --log.');
  const values = Array.isArray(rect) ? rect : rect.split(',').map(value => value.trim());
  if (values.length !== 4) throw new Error('rect deve conter x,y,largura,altura.');
  const [left, top, cropWidth, height] = values.map((value, i) => number(value, `rect[${i}]`, { min: i < 2 ? 0 : 1 }));
  const image = await describeImage(source);
  if (left + cropWidth > image.orientedWidth || top + height > image.orientedHeight) throw new Error('Recorte ultrapassa a imagem orientada.');
  const outputWidth = width === undefined ? cropWidth : number(width, 'width', { max: cropWidth });
  const destination = path.resolve(out);
  if (destination.toLowerCase() === image.file.toLowerCase() || path.resolve(log).toLowerCase() === image.file.toLowerCase() || path.resolve(log).toLowerCase() === destination.toLowerCase()) {
    throw new Error('Origem, saída e log devem ser arquivos distintos.');
  }
  const extension = path.extname(destination).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp', '.avif'].includes(extension)) throw new Error('Saída deve ser PNG, JPEG, WebP ou AVIF.');
  let entries = [];
  try { entries = JSON.parse(await readFile(log, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!Array.isArray(entries)) throw new Error('O log de recortes deve ser um array.');
  const format = extension === '.jpg' ? 'jpeg' : extension.slice(1);
  const { data, info } = await sharp(image.file).autoOrient().extract({ left, top, width: cropWidth, height }).resize({ width: outputWidth, withoutEnlargement: true }).toFormat(format).toBuffer({ resolveWithObject: true });
  await mkdir(path.dirname(destination), { recursive: true });
  // wx preserva qualquer arquivo existente, inclusive um link para o original.
  await writeFile(destination, data, { flag: 'wx' });
  const entry = {
    source: image.file, sourceSha256: image.sha256, sourceWidth: image.width, sourceHeight: image.height,
    coordinateSpace: 'pixels após orientação EXIF', rect: { left, top, width: cropWidth, height },
    output: destination, outputWidth: info.width, outputHeight: info.height,
    creativeGeneration: false, visualInspectionRequired: true, createdAt: new Date().toISOString()
  };
  await writeJson(log, [...entries, entry]);
  return entry;
}

main(import.meta.url, async () => {
  const { options, files } = parseArgs(process.argv.slice(2), ['source', 'out', 'rect', 'log', 'width']);
  if (files.length) throw new Error('Use as opções nomeadas de crop.mjs.');
  console.log(JSON.stringify(await crop(options), null, 2));
});
