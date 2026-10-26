import path from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { describeImage } from './inventory.mjs';
import { main, number, parseArgs, writeJson } from './lib/cli.mjs';

const MAX_WIDTH = 1200;

function parseRect(value, name, image) {
  if (value === undefined) return undefined;
  const values = value.split(',').map(item => item.trim());
  if (values.length !== 4) throw new Error(`${name} deve conter x,y,largura,altura.`);
  const [left, top, width, height] = values.map((item, index) => number(item, `${name}[${index}]`, { min: index < 2 ? 0 : 1 }));
  if (left + width > image.orientedWidth || top + height > image.orientedHeight) throw new Error(`${name} ultrapassa a imagem orientada (${image.orientedWidth}×${image.orientedHeight}).`);
  return { left, top, width, height };
}

async function region(image, rect, width) {
  let pipeline = sharp(image.file).autoOrient();
  if (rect) pipeline = pipeline.extract(rect);
  const { data, info } = await pipeline.flatten({ background: '#ffffff' }).resize({ width }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

const luma = (data, index) => 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];

/**
 * Compara a região da referência do usuário com a captura do site. O resultado é
 * evidência AUXILIAR: antialiasing, fontes e fotos recomprimidas geram diferenças
 * inevitáveis, e nenhum limite aqui aprova a fidelidade. O agente abre o lado a lado.
 */
export async function compare({ reference, capture, out, name = 'comparacao', refRect, capRect, grid = '6x6' }) {
  if (!reference || !capture || !out) throw new Error('Informe --reference, --capture e --out.');
  if (!/^[\w.-]+$/.test(name)) throw new Error('--name deve conter apenas letras, números, ponto, hífen ou sublinhado.');
  const [columns, rows] = grid.split('x').map((item, index) => number(item, `grid[${index}]`, { min: 1, max: 24 }));
  const ref = await describeImage(reference);
  const cap = await describeImage(capture);
  const referenceRect = parseRect(refRect, '--ref-rect', ref);
  const captureRect = parseRect(capRect, '--cap-rect', cap);
  const width = Math.min(referenceRect?.width ?? ref.orientedWidth, MAX_WIDTH);
  const left = await region(ref, referenceRect, width);
  const right = await region(cap, captureRect, width);
  const height = Math.min(left.height, right.height);
  const outputDirectory = path.resolve(out);
  const sideBySide = path.join(outputDirectory, `${name}-lado-a-lado.png`);
  const heatmap = path.join(outputDirectory, `${name}-diferenca.png`);
  for (const file of [sideBySide, heatmap]) {
    if ([ref.file, cap.file].some(input => input.toLowerCase() === file.toLowerCase())) throw new Error('As saídas não podem sobrescrever as imagens de entrada.');
  }
  await mkdir(outputDirectory, { recursive: true });

  const cellSums = new Float64Array(columns * rows);
  const cellCounts = new Uint32Array(columns * rows);
  const differences = new Uint8Array(width * height);
  const histogram = new Uint32Array(256);
  let total = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 3;
      const difference = Math.round(Math.abs(luma(left.data, index) - luma(right.data, index)));
      differences[y * width + x] = Math.min(255, difference * 4);
      histogram[difference]++;
      total += difference;
      const cell = Math.min(rows - 1, Math.floor(y * rows / height)) * columns + Math.min(columns - 1, Math.floor(x * columns / width));
      cellSums[cell] += difference; cellCounts[cell]++;
    }
  }
  let seen = 0; let p95 = 0;
  for (let value = 0; value < 256; value++) { seen += histogram[value]; if (seen >= width * height * 0.95) { p95 = value; break; } }
  const cells = [...cellSums].map((sum, index) => ({
    column: index % columns + 1, row: Math.floor(index / columns) + 1, meanLumaDifference: Number((sum / cellCounts[index] / 255).toFixed(4)),
    area: { x: Math.round((index % columns) * width / columns), y: Math.round(Math.floor(index / columns) * height / rows), width: Math.round(width / columns), height: Math.round(height / rows) }
  })).sort((a, b) => b.meanLumaDifference - a.meanLumaDifference);

  const crop = buffer => sharp(buffer.data, { raw: { width: buffer.width, height: buffer.height, channels: 3 } }).extract({ left: 0, top: 0, width, height }).png().toBuffer();
  const gap = 12;
  await sharp({ create: { width: width * 2 + gap, height, channels: 3, background: '#808080' } })
    .composite([{ input: await crop(left), left: 0, top: 0 }, { input: await crop(right), left: width + gap, top: 0 }])
    .png().toFile(sideBySide);
  await sharp(differences, { raw: { width, height, channels: 1 } }).png().toFile(heatmap);

  return {
    name, auxiliary: true, fidelityEstablished: false,
    note: 'Evidência auxiliar. Abra o lado a lado (referência à esquerda, captura à direita) e decida visualmente.',
    reference: { file: ref.file, sha256: ref.sha256, rect: referenceRect ?? 'imagem inteira' },
    capture: { file: cap.file, sha256: cap.sha256, rect: captureRect ?? 'imagem inteira' },
    comparedSize: { width, height },
    heightMismatch: Math.abs(left.height - right.height) / Math.max(left.height, right.height) > 0.02 ? { reference: left.height, capture: right.height } : null,
    meanLumaDifference: Number((total / (width * height) / 255).toFixed(4)),
    p95LumaDifference: Number((p95 / 255).toFixed(4)),
    worstCells: cells.slice(0, 3),
    outputs: { sideBySide, heatmap }
  };
}

main(import.meta.url, async () => {
  const { options, files } = parseArgs(process.argv.slice(2), ['reference', 'capture', 'out', 'name', 'ref-rect', 'cap-rect', 'grid', 'log']);
  if (files.length) throw new Error('Use as opções nomeadas de compare.mjs.');
  const result = await compare({ reference: options.reference, capture: options.capture, out: options.out, name: options.name, refRect: options['ref-rect'], capRect: options['cap-rect'], grid: options.grid });
  if (options.log) {
    let entries = [];
    try { entries = JSON.parse(await readFile(options.log, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!Array.isArray(entries)) throw new Error('O log de comparações deve ser um array.');
    await writeJson(options.log, [...entries.filter(entry => entry.name !== result.name), result]);
  }
  console.log(JSON.stringify(result, null, 2));
});
