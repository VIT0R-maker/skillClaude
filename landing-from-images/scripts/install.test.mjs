import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defaultDestination, installSkill, parseFrontmatter, projectDestination, resolveDestination, skillProblems } from './install.mjs';

const VALID = '---\nname: landing-from-images\ndescription: fixture\ndisable-model-invocation: true\n---\nVersion one\n';

async function fixture(t) {
  const temporary = await fs.mkdtemp(path.join(process.env.LANDING_FROM_IMAGES_TEST_TMP || os.tmpdir(), 'landing installer test '));
  t.after(() => fs.rm(temporary, { recursive: true, force: true }));
  const source = path.join(temporary, 'repository', 'landing-from-images');
  const destination = path.join(temporary, 'personal', '.claude', 'skills');
  await fs.mkdir(source, { recursive: true });
  await fs.writeFile(path.join(source, 'SKILL.md'), VALID);
  return { temporary, source, destination, target: path.join(destination, 'landing-from-images') };
}

async function linkForTest(t, target, link) {
  try { await fs.symlink(target, link, process.platform === 'win32' ? 'junction' : 'dir'); return true; }
  catch (error) {
    if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) throw error;
    t.skip(`Este ambiente não permite criar links/junctions (${error.code}).`);
    return false;
  }
}

test('destinos: pessoal em ~/.claude/skills, projeto em .claude/skills; nunca .agents', () => {
  assert.equal(defaultDestination(), path.join(os.homedir(), '.claude', 'skills'));
  assert.equal(projectDestination(path.join('C:', 'Projetos', 'Minha Landing')), path.join(path.resolve('C:', 'Projetos', 'Minha Landing'), '.claude', 'skills'));
  assert.ok(!defaultDestination().includes('.agents'));
  assert.equal(resolveDestination({}), defaultDestination());
  assert.equal(resolveDestination({ scope: 'project', projectDir: 'x' }), projectDestination('x'));
  assert.throws(() => resolveDestination({ dest: 'a', scope: 'project' }), /--dest/);
  assert.throws(() => resolveDestination({ projectDir: 'x' }), /--project-dir/);
  assert.throws(() => resolveDestination({ scope: 'global' }), /--scope/);
});

test('frontmatter: escalares, aspas e blocos dobrados; validação contra as regras do Claude Code', () => {
  const folded = '---\nname: "landing-from-images"\ndescription: >-\n  Primeira linha\n  segunda linha.\ndisable-model-invocation: true\nargument-hint: "[imagens]"\n---\ncorpo';
  const meta = parseFrontmatter(folded);
  assert.equal(meta.name, 'landing-from-images');
  assert.equal(meta.description, 'Primeira linha segunda linha.');
  assert.deepEqual(skillProblems(folded), []);
  assert.deepEqual(skillProblems(VALID), []);
  assert.match(skillProblems(VALID.replace('name: landing-from-images', 'name: outra'))[0], /name deve ser/);
  assert.ok(skillProblems(VALID.replace('disable-model-invocation: true\n', '')).some(item => /disable-model-invocation/.test(item)));
  assert.ok(skillProblems(VALID.replace('description: fixture\n', '')).some(item => /description é obrigatória/.test(item)));
  assert.ok(skillProblems(VALID.replace('fixture', 'x'.repeat(1600))).some(item => /1536/.test(item)));
  assert.ok(skillProblems(`${VALID}${'linha\n'.repeat(600)}`).some(item => /500 linhas/.test(item)));
  assert.ok(skillProblems(`\n${VALID}`).some(item => /primeira linha/.test(item)));
  assert.ok(skillProblems('---\nname: synced\ndescription: x\ndisable-model-invocation: true\n---\n', 'synced').some(item => /reservado/.test(item)));
});

test('instala somente a variante e omite dependências, segredos e saídas de teste', async (t) => {
  const { source, destination, target } = await fixture(t);
  const other = path.join(destination, 'other-skill');
  await fs.mkdir(other, { recursive: true });
  await fs.writeFile(path.join(other, 'keep.txt'), 'unchanged');
  for (const name of ['node_modules', '.test-output', 'test-results', 'playwright-report', '.landing-tools', '.work']) {
    await fs.mkdir(path.join(source, name));
    await fs.writeFile(path.join(source, name, 'ignore.txt'), 'omit');
  }
  await fs.writeFile(path.join(source, '.env.local'), 'do not copy');
  await fs.writeFile(path.join(source, 'README.md'), 'install instructions');
  const result = await installSkill({ source, destination });
  assert.deepEqual(result, { destination: target, backup: null });
  assert.equal(await fs.readFile(path.join(other, 'keep.txt'), 'utf8'), 'unchanged');
  assert.deepEqual((await fs.readdir(target)).sort(), ['README.md', 'SKILL.md']);
  assert.deepEqual((await fs.readdir(destination)).sort(), ['landing-from-images', 'other-skill']);
});

test('recusa substituir sem --update; a atualização guarda backup fora da raiz, protegido do Git, sem aparecer como skill', async (t) => {
  const { source, destination, target } = await fixture(t);
  await installSkill({ source, destination });
  await fs.writeFile(path.join(target, 'custom.txt'), 'personal customization');
  await fs.writeFile(path.join(source, 'README.md'), 'version two');
  await assert.rejects(installSkill({ source, destination }), /--update/);
  assert.equal(await fs.readFile(path.join(target, 'custom.txt'), 'utf8'), 'personal customization');
  const result = await installSkill({ source, destination, update: true });
  assert.equal(await fs.readFile(path.join(result.backup, 'custom.txt'), 'utf8'), 'personal customization');
  assert.equal(await fs.readFile(path.join(target, 'README.md'), 'utf8'), 'version two');
  await assert.rejects(fs.access(path.join(target, 'custom.txt')));
  const backupRoot = path.dirname(result.backup);
  assert.equal(path.dirname(backupRoot), path.dirname(destination));
  assert.equal(path.basename(backupRoot), '.landing-from-images-backups');
  assert.equal(await fs.readFile(path.join(backupRoot, '.gitignore'), 'utf8'), '*\n');
  assert.deepEqual(await fs.readdir(destination), ['landing-from-images']);
});

test('instalação por projeto cria .claude/skills no projeto e mantém o backup dentro de .claude, ignorado pelo Git', async (t) => {
  const { temporary, source } = await fixture(t);
  const project = path.join(temporary, 'Meus Projetos', 'Minha Landing');
  const destination = projectDestination(project);
  const first = await installSkill({ source, destination });
  assert.equal(first.destination, path.join(project, '.claude', 'skills', 'landing-from-images'));
  const second = await installSkill({ source, destination, update: true });
  assert.equal(path.dirname(path.dirname(second.backup)), path.join(project, '.claude'));
  assert.deepEqual(await fs.readdir(path.join(project, '.claude', 'skills')), ['landing-from-images']);
});

test('recusa SKILL.md inválido para o Claude Code sem tocar numa instalação existente', async (t) => {
  const { source, destination, target } = await fixture(t);
  await installSkill({ source, destination });
  await fs.writeFile(path.join(source, 'SKILL.md'), VALID.replace('disable-model-invocation: true\n', ''));
  await assert.rejects(installSkill({ source, destination, update: true }), /disable-model-invocation/);
  assert.match(await fs.readFile(path.join(target, 'SKILL.md'), 'utf8'), /Version one/);
  await assert.rejects(fs.access(path.join(path.dirname(destination), '.landing-from-images-backups')));
});

test('recusa origem igual ao destino, destino aninhado, raízes e pastas alheias existentes', async (t) => {
  const { source, destination, target } = await fixture(t);
  for (const root of [path.dirname(source), path.join(source, 'nested'), path.parse(source).root, os.homedir()]) {
    await assert.rejects(installSkill({ source, destination: root, update: true }));
  }
  await fs.mkdir(target, { recursive: true });
  await fs.writeFile(path.join(target, 'keep.txt'), 'unrelated');
  await assert.rejects(installSkill({ source, destination, update: true }));
  assert.equal(await fs.readFile(path.join(target, 'keep.txt'), 'utf8'), 'unrelated');
});

test('rejeita junctions no destino e na origem sem alterar o diretório apontado', async (t) => {
  const { temporary, source, destination } = await fixture(t);
  const external = path.join(temporary, 'external');
  await fs.mkdir(external);
  await fs.writeFile(path.join(external, 'keep.txt'), 'external data');
  await fs.mkdir(path.dirname(destination), { recursive: true });
  if (!(await linkForTest(t, external, destination))) return;
  await assert.rejects(installSkill({ source, destination }), /junction/);
  await fs.unlink(destination);
  if (!(await linkForTest(t, external, path.join(source, 'linked')))) return;
  await assert.rejects(installSkill({ source, destination }), /junction/);
  assert.deepEqual(await fs.readdir(external), ['keep.txt']);
});

test('rejeita junctions dentro de uma instalação existente antes de movê-la para backup', async (t) => {
  const { temporary, source, destination, target } = await fixture(t);
  await installSkill({ source, destination });
  const external = path.join(temporary, 'external');
  await fs.mkdir(external);
  if (!(await linkForTest(t, external, path.join(target, 'linked')))) return;
  await assert.rejects(installSkill({ source, destination, update: true }), /junction/);
  assert.ok((await fs.lstat(target)).isDirectory());
  await assert.rejects(fs.access(path.join(path.dirname(destination), '.landing-from-images-backups')));
});

test('não remove um lock de instalação pré-existente nem altera a skill instalada', async (t) => {
  const { source, destination, target } = await fixture(t);
  await installSkill({ source, destination });
  const lock = path.join(destination, '.landing-from-images.install.lock');
  await fs.writeFile(lock, 'another installer');
  await assert.rejects(installSkill({ source, destination, update: true }), /lock/);
  assert.equal(await fs.readFile(lock, 'utf8'), 'another installer');
  assert.match(await fs.readFile(path.join(target, 'SKILL.md'), 'utf8'), /Version one/);
});

test('CLI: padrão pessoal em HOME, caminhos com espaços, escopo de projeto e recusa de opções inválidas', async (t) => {
  const { temporary, source, destination, target } = await fixture(t);
  await fs.mkdir(path.join(source, 'scripts'));
  const executable = path.join(source, 'scripts', 'install.mjs');
  await fs.copyFile(fileURLToPath(new URL('./install.mjs', import.meta.url)), executable);
  const home = path.join(temporary, 'Home Dir');
  await fs.mkdir(home);
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  const run = (...args) => spawnSync(process.execPath, [executable, ...args], { encoding: 'utf8', windowsHide: true, env });
  const help = run('--help');
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /--scope/);
  const personal = run();
  assert.equal(personal.status, 0, personal.stderr);
  assert.match(personal.stdout, /Skill instalada:/);
  assert.match(personal.stdout, /\/reload-skills/);
  assert.ok((await fs.lstat(path.join(home, '.claude', 'skills', 'landing-from-images'))).isDirectory());
  assert.equal(run().status, 1);
  assert.equal(run('--update').status, 0);
  const project = path.join(temporary, 'Meus Projetos', 'Minha Landing');
  const scoped = run('--scope', 'project', '--project-dir', project);
  assert.equal(scoped.status, 0, scoped.stderr);
  assert.ok((await fs.lstat(path.join(project, '.claude', 'skills', 'landing-from-images'))).isDirectory());
  const custom = run('--dest', destination);
  assert.equal(custom.status, 0, custom.stderr);
  assert.ok((await fs.lstat(target)).isDirectory());
  for (const args of [['--unknown'], ['--dest', ''], ['--dest', destination, '--scope', 'project'], ['--project-dir', project], ['--scope', 'global']]) {
    assert.equal(run(...args).status, 1, args.join(' '));
  }
});
