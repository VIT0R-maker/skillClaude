import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { EXIT_NO_BROWSER, setupTools } from './setup-tools.mjs';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const silent = () => {};

async function temporaryProject(t, ...segments) {
  const temporary = await fs.mkdtemp(path.join(process.env.LANDING_FROM_IMAGES_TEST_TMP || os.tmpdir(), 'landing setup test '));
  t.after(() => fs.rm(temporary, { recursive: true, force: true }));
  const project = path.join(temporary, ...(segments.length ? segments : ['Meus Projetos', 'Minha Landing']));
  return { temporary, project, kit: path.join(project, '.landing-tools') };
}

const exists = async file => fs.access(file).then(() => true, () => false);

test('copia somente as ferramentas necessárias para um projeto com espaços e recopia apenas o que mudou', async t => {
  const { project, kit } = await temporaryProject(t);
  const first = await setupTools({ project, skipInstall: true, log: silent });
  assert.equal(first.exitCode, 0);
  for (const file of ['package.json', 'package-lock.json', 'verify.mjs', 'inventory.mjs', 'crop.mjs', 'compare.mjs', 'serve.mjs', path.join('lib', 'cli.mjs'), path.join('lib', 'browser.mjs')]) {
    assert.ok(await exists(path.join(kit, file)), file);
  }
  for (const omitted of ['node_modules', 'test', 'fixture', '.work']) assert.equal(await exists(path.join(kit, omitted)), false, omitted);
  const second = await setupTools({ project, skipInstall: true, log: silent });
  assert.deepEqual(second.copied, []);
  await fs.writeFile(path.join(kit, 'serve.mjs'), '// alterado localmente');
  const third = await setupTools({ project, skipInstall: true, log: silent });
  assert.deepEqual(third.copied, ['serve.mjs']);
  assert.match(await fs.readFile(path.join(kit, 'serve.mjs'), 'utf8'), /startServer/);
});

test('.gitignore: cria, acrescenta de forma idempotente, preserva o conteúdo e respeita --no-gitignore', async t => {
  const { project } = await temporaryProject(t);
  await fs.mkdir(project, { recursive: true });
  await fs.writeFile(path.join(project, '.gitignore'), 'dist/\n.work\n');
  const first = await setupTools({ project, skipInstall: true, log: silent });
  assert.deepEqual(first.gitignore, ['.landing-tools/', 'node_modules/']);
  const content = await fs.readFile(path.join(project, '.gitignore'), 'utf8');
  assert.match(content, /^dist\/\n\.work\n/);
  assert.equal((content.match(/\.landing-tools\//g) || []).length, 1);
  assert.deepEqual((await setupTools({ project, skipInstall: true, log: silent })).gitignore, []);
  const other = await temporaryProject(t, 'outro');
  await setupTools({ project: other.project, skipInstall: true, gitignore: false, log: silent });
  assert.equal(await exists(path.join(other.project, '.gitignore')), false);
  const fresh = await temporaryProject(t, 'novo');
  await setupTools({ project: fresh.project, skipInstall: true, log: silent });
  assert.match(await fs.readFile(path.join(fresh.project, '.gitignore'), 'utf8'), /\.landing-tools\/\n\.work\/\nnode_modules\/\n$/);
});

test('recusa projeto vazio, raiz do disco, pasta pessoal e a própria pasta da skill', async t => {
  const { temporary } = await temporaryProject(t);
  for (const project of ['', '   ', path.parse(temporary).root, os.homedir(), path.dirname(scriptsDir), path.join(path.dirname(scriptsDir), 'sub'), path.dirname(path.dirname(scriptsDir))]) {
    await assert.rejects(setupTools({ project, skipInstall: true, log: silent }), undefined, `projeto: "${project}"`);
  }
});

test('instala dependências com npm ci no kit, usa o navegador encontrado e pula o que já está pronto', async t => {
  const { project, kit } = await temporaryProject(t);
  const calls = [];
  const runner = (command, args, { cwd }) => {
    calls.push({ command, args: args.join(' ').slice(0, 40), cwd });
    return command === 'node' ? { status: 0, stdout: '{"source":"Microsoft Edge instalado","version":"150.0"}\n', stderr: '' } : { status: 0, stdout: '', stderr: '' };
  };
  const result = await setupTools({ project, runner, log: silent });
  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.browser, { source: 'Microsoft Edge instalado', version: '150.0' });
  assert.deepEqual(calls.map(call => call.command), ['npm', 'node']);
  assert.ok(calls.every(call => call.cwd === kit));
  assert.match(calls[0].args, /^ci --no-audit --no-fund/);
  const pinned = JSON.parse(await fs.readFile(path.join(kit, 'package.json'), 'utf8')).dependencies;
  for (const [name, version] of Object.entries(pinned)) {
    await fs.mkdir(path.join(kit, 'node_modules', name), { recursive: true });
    await fs.writeFile(path.join(kit, 'node_modules', name, 'package.json'), JSON.stringify({ name, version }));
  }
  calls.length = 0;
  const again = await setupTools({ project, runner, log: silent });
  assert.equal(again.dependencies, 'já instaladas');
  assert.deepEqual(calls.map(call => call.command), ['node']);
  assert.ok(await exists(path.join(kit, 'setup.json')));
});

test('sem navegador: tenta instalar o Chromium, e se continuar indisponível sinaliza código 3, sem fingir cobertura', async t => {
  const { project, kit } = await temporaryProject(t);
  const calls = [];
  const runner = (command, args) => {
    calls.push(`${command} ${args[0]}`);
    return command === 'node' ? { status: 1, stdout: '', stderr: 'Nenhum navegador pôde ser iniciado\n' } : { status: 0, stdout: '', stderr: '' };
  };
  const messages = [];
  const result = await setupTools({ project, runner, log: message => messages.push(message) });
  assert.equal(result.exitCode, EXIT_NO_BROWSER);
  assert.equal(result.browser, null);
  assert.deepEqual(calls, ['npm ci', 'node --input-type=module', 'npx playwright', 'node --input-type=module']);
  assert.ok(messages.some(message => /NÃO podem ser executadas/.test(message)));
  assert.equal(JSON.parse(await fs.readFile(path.join(kit, 'setup.json'), 'utf8')).exitCode, EXIT_NO_BROWSER);
});

test('falha do npm ci interrompe com mensagem útil, sem declarar o kit pronto', async t => {
  const { project } = await temporaryProject(t);
  const runner = () => ({ status: 1, stdout: '', stderr: 'ENOTFOUND registry.npmjs.org\n' });
  await assert.rejects(setupTools({ project, runner, log: silent }), /npm ci falhou[\s\S]*ENOTFOUND/);
});

test('CLI: ajuda, ausência de --project e execução real só de cópia em caminho com espaços', async t => {
  const { project, kit } = await temporaryProject(t);
  const script = path.join(scriptsDir, 'setup-tools.mjs');
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', windowsHide: true });
  assert.equal(run('--help').status, 0);
  assert.equal(run().status, 1);
  assert.equal(run('--desconhecida').status, 1);
  const copied = run('--project', project, '--skip-install');
  assert.equal(copied.status, 0, copied.stderr);
  assert.match(copied.stdout, /Kit atualizado/);
  assert.ok(await exists(path.join(kit, 'verify.mjs')));
});

test('integração real (npm ci + navegador), somente com LANDING_TEST_INSTALL=1 e rede', { skip: process.env.LANDING_TEST_INSTALL !== '1' && 'defina LANDING_TEST_INSTALL=1 para instalar de verdade' }, async t => {
  const { project, kit } = await temporaryProject(t);
  const result = await setupTools({ project, log: silent });
  assert.equal(result.dependencies, 'instaladas');
  assert.ok(await exists(path.join(kit, 'node_modules', 'playwright')));
  assert.ok(result.browser?.source, 'um navegador utilizável deve ter sido encontrado');
});
