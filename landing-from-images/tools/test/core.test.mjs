import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import sharp from 'sharp';
import { startServer } from '../serve.mjs';
import { inventory } from '../inventory.mjs';
import { crop } from '../crop.mjs';

function request(url, pathname, options = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const req = http.request({ hostname: target.hostname, port: target.port, path: pathname, ...options }, response => {
      let body = ''; response.on('data', data => body += data); response.on('end', () => resolve({ status: response.statusCode, body, headers: response.headers }));
    });
    req.on('error', reject); req.end();
  });
}

test('servidor entrega paths com espaços, bloqueia escape, links externos e escrita', async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'landing-server-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const root = path.join(temp, 'site');
  await mkdir(root); await writeFile(path.join(root, 'index.html'), '<h1>ok</h1>');
  await writeFile(path.join(root, 'com espaço.css'), 'body{}');
  await writeFile(path.join(temp, 'secret.html'), 'secret');
  await symlink(temp, path.join(root, 'external'), process.platform === 'win32' ? 'junction' : 'dir');
  const server = await startServer({ root }); t.after(() => server.close());
  assert.equal((await request(server.url, '/')).body, '<h1>ok</h1>');
  assert.equal((await request(server.url, '/com%20espa%C3%A7o.css')).status, 200);
  for (const pathname of ['/../secret.html', '/%2e%2e/secret.html', '/%2e%2e%5csecret.html', '/external/secret.html', '/.env', '/package.json', '/C:/Windows/win.ini']) {
    assert.equal((await request(server.url, pathname)).status, 403, pathname);
  }
  assert.equal((await request(server.url, '/%', {})).status, 400);
  assert.equal((await request(server.url, '/', { method: 'POST' })).status, 405);
  assert.equal((await request(server.url, '/', { headers: { host: 'evil.example' } })).status, 403);
  assert.equal((await request(server.url, '/', { method: 'HEAD' })).body, '');
  assert.equal((await request(server.url, '/missing.html')).status, 404);
});

test('inventário preserva decisões, crop respeita EXIF e registra origem sem ampliação', async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'landing-images-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const source = path.join(temp, 'referência original.jpg');
  await sharp({ create: { width: 120, height: 80, channels: 3, background: '#b74731' } }).jpeg().withMetadata({ orientation: 6 }).toFile(source);
  const original = await readFile(source);
  const map = path.join(temp, 'map.json');
  const first = await inventory([source], map);
  assert.equal(first.images[0].width, 120); assert.equal(first.images[0].orientedWidth, 80);
  assert.equal(first.images[0].order, null);
  first.images[0].order = 2; first.images[0].decision = { source: 'user', reason: 'Sequência declarada' };
  await writeFile(map, JSON.stringify(first));
  assert.equal((await inventory([source], map)).images[0].order, 2);
  const args = { source, out: path.join(temp, 'recorte.webp'), rect: '10,20,40,60', log: path.join(temp, 'crops.json'), width: 20 };
  const result = await crop(args);
  assert.equal(result.outputWidth, 20); assert.equal(result.outputHeight, 30);
  assert.equal(result.sourceSha256, first.images[0].sha256);
  assert.equal(result.creativeGeneration, false);
  assert.deepEqual(await readFile(source), original);
  assert.equal(JSON.parse(await readFile(args.log, 'utf8')).length, 1);
  await assert.rejects(crop(args), /EEXIST/);
  await assert.rejects(crop({ ...args, width: 41 }), /width/);
  await assert.rejects(crop({ ...args, rect: '70,0,40,60' }), /ultrapassa/);
  await assert.rejects(crop({ ...args, out: source }), /distintos/);
});

test('projeto em pasta com espaços e acentos: inventário, recorte em pastas novas e originais intactos', async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'Meus Projetos ção '));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const refs = path.join(temp, 'Minha Landing', 'Referências do cliente');
  await mkdir(refs, { recursive: true });
  const source = path.join(refs, 'parte 01 – hero.png');
  await sharp({ create: { width: 300, height: 200, channels: 3, background: '#205c56' } }).png().toFile(source);
  const original = await readFile(source);
  const map = path.join(temp, 'Minha Landing', '.work', 'mapa de referências.json');
  const found = await inventory([source], map);
  assert.equal(found.images[0].width, 300);
  const log = path.join(temp, 'Minha Landing', '.work', 'recortes.json');
  const out = path.join(temp, 'Minha Landing', 'assets', 'imagens novas', 'foto principal.webp');
  const result = await crop({ source, out, rect: '20,10,200,150', log });
  assert.equal(result.outputWidth, 200);
  assert.equal((await sharp(out).metadata()).format, 'webp');
  assert.equal(JSON.parse(await readFile(log, 'utf8'))[0].sourceSha256, found.images[0].sha256);
  assert.deepEqual(await readFile(source), original, 'o original deve permanecer byte a byte');
});
