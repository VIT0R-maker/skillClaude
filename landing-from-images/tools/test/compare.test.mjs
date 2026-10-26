import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import sharp from 'sharp';
import { compare } from '../compare.mjs';

async function image(file, { width = 240, height = 120, background = '#f4efe6', blocks = [], orientation } = {}) {
  let pipeline = sharp({ create: { width, height, channels: 3, background } }).composite(
    blocks.map(({ x, y, w, h, color }) => ({ input: { create: { width: w, height: h, channels: 3, background: color } }, left: x, top: y }))
  ).jpeg({ quality: 100 });
  if (orientation) pipeline = pipeline.withMetadata({ orientation });
  await pipeline.toFile(file);
  return file;
}

test('imagens iguais: diferença nula, saídas geradas e nunca declara fidelidade', async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'landing compare '));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const reference = await image(path.join(temp, 'referência.jpg'), { blocks: [{ x: 20, y: 20, w: 60, h: 40, color: '#205c56' }] });
  const capture = await image(path.join(temp, 'captura.jpg'), { blocks: [{ x: 20, y: 20, w: 60, h: 40, color: '#205c56' }] });
  const result = await compare({ reference, capture, out: path.join(temp, 'saída'), name: 'hero' });
  assert.equal(result.meanLumaDifference, 0);
  assert.equal(result.fidelityEstablished, false);
  assert.equal(result.auxiliary, true);
  assert.equal(result.heightMismatch, null);
  const side = await sharp(result.outputs.sideBySide).metadata();
  assert.equal(side.width, 240 * 2 + 12);
  assert.equal(side.height, 120);
});

test('bloco deslocado: a célula mais diferente localiza a região e a média deixa de ser nula', async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'landing compare '));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const reference = await image(path.join(temp, 'ref.jpg'), { blocks: [{ x: 180, y: 70, w: 50, h: 40, color: '#111111' }] });
  const capture = await image(path.join(temp, 'cap.jpg'));
  const result = await compare({ reference, capture, out: temp, name: 'cta', grid: '4x2' });
  assert.ok(result.meanLumaDifference > 0.01);
  assert.deepEqual([result.worstCells[0].column, result.worstCells[0].row], [4, 2]);
});

test('recortes por região, tamanhos diferentes e EXIF: compara região equivalente e sinaliza altura divergente', async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'landing compare '));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const reference = await image(path.join(temp, 'ref.jpg'), { width: 400, height: 300, blocks: [{ x: 0, y: 100, w: 400, h: 100, color: '#205c56' }] });
  const capture = await image(path.join(temp, 'cap.jpg'), { width: 200, height: 400, blocks: [{ x: 0, y: 50, w: 200, h: 50, color: '#205c56' }] });
  const result = await compare({ reference, capture, out: temp, name: 'faixa', refRect: '0,100,400,100', capRect: '0,50,200,50' });
  assert.ok(result.meanLumaDifference < 0.02, String(result.meanLumaDifference));
  const uneven = await compare({ reference, capture, out: temp, name: 'altura', refRect: '0,0,400,300', capRect: '0,0,200,100' });
  // A captura 200×100 é levada à largura comum de 400, ficando com 200 de altura.
  assert.deepEqual(uneven.heightMismatch, { reference: 300, capture: 200 });
  const rotated = await image(path.join(temp, 'rot.jpg'), { width: 120, height: 80, orientation: 6 });
  const orientedRegion = await compare({ reference: rotated, capture: rotated, out: temp, name: 'exif', refRect: '0,0,80,120', capRect: '0,0,80,120' });
  assert.equal(orientedRegion.meanLumaDifference, 0);
});

test('entradas inválidas são recusadas e as imagens originais nunca são sobrescritas', async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'landing compare '));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const reference = await image(path.join(temp, 'ref.jpg'));
  const before = await readFile(reference);
  await assert.rejects(compare({ reference, capture: reference, out: temp, refRect: '200,0,100,50' }), /ultrapassa/);
  await assert.rejects(compare({ reference, capture: reference, out: temp, name: '../fora' }), /--name/);
  await assert.rejects(compare({ reference, capture: path.join(temp, 'ausente.png'), out: temp }));
  await assert.rejects(compare({ reference, out: temp }), /Informe/);
  assert.deepEqual(await readFile(reference), before);
});
