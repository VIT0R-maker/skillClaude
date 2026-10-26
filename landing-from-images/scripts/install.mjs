#!/usr/bin/env node
import { constants } from 'node:fs';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';

const NAME = 'landing-from-images';
const SOURCE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const EXCLUDED = new Set([
  'node_modules', '.git', '.cache', '.work', '.tmp', '.test-output', 'coverage',
  'test-results', 'playwright-report', 'blob-report', 'Thumbs.db', '.DS_Store', '.landing-tools',
]);
const RESERVED_NAMES = new Set(['synced', 'anthropic-skills']);
const MAX_DESCRIPTION = 1536; // limite de description + when_to_use na listagem do Claude Code
const MAX_SKILL_LINES = 500;

/** Escopo pessoal do Claude Code: vale para todos os projetos desta máquina. */
export function defaultDestination() {
  return path.join(os.homedir(), '.claude', 'skills');
}

/** Escopo por projeto: versionável junto do repositório do projeto. */
export function projectDestination(projectDir) {
  return path.join(path.resolve(projectDir), '.claude', 'skills');
}

/** Subconjunto de YAML suficiente para o frontmatter de uma skill: escalares, aspas e blocos > e |. */
export function parseFrontmatter(markdown) {
  const match = markdown.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;
  const values = {};
  const lines = match[1].split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const entry = lines[index].match(/^([A-Za-z_][\w-]*):[ \t]*(.*)$/);
    if (!entry) continue;
    const [, key, raw] = entry;
    if (/^[>|][+-]?$/.test(raw.trim())) {
      const block = [];
      while (index + 1 < lines.length && /^(\s+|$)/.test(lines[index + 1])) block.push(lines[++index].trim());
      values[key] = (raw.trim().startsWith('>') ? block.join(' ') : block.join('\n')).trim();
    } else values[key] = raw.trim().replace(/^(['"])([\s\S]*)\1$/, '$2');
  }
  return values;
}

/** Valida o SKILL.md contra o que o Claude Code documenta; retorna a lista de problemas. */
export function skillProblems(markdown, expectedName = NAME) {
  const problems = [];
  const meta = parseFrontmatter(markdown);
  if (!meta) return ['O frontmatter YAML deve começar na primeira linha do SKILL.md.'];
  if (meta.name !== expectedName) problems.push(`name deve ser ${expectedName}.`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.name || '') || (meta.name || '').length > 64) problems.push('name deve usar minúsculas, números e hífens (até 64 caracteres).');
  if (RESERVED_NAMES.has((meta.name || '').toLowerCase())) problems.push(`O nome ${meta.name} é reservado pelo Claude Code.`);
  if (!meta.description) problems.push('description é obrigatória para o Claude e para a listagem.');
  if (`${meta.description || ''} ${meta.when_to_use || ''}`.trim().length > MAX_DESCRIPTION) problems.push(`description + when_to_use passam de ${MAX_DESCRIPTION} caracteres e seriam truncadas.`);
  if (!/^(true|yes|on|1)$/i.test(meta['disable-model-invocation'] || '')) problems.push('disable-model-invocation: true é necessário: a skill só deve iniciar por /landing-from-images.');
  if (markdown.split(/\r?\n/).length > MAX_SKILL_LINES) problems.push(`SKILL.md passa de ${MAX_SKILL_LINES} linhas; mova detalhes para references/.`);
  return problems;
}

async function statIfExists(filename) {
  try { return await fs.lstat(filename); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function within(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

async function rejectLinkedAncestors(filename) {
  let current = path.resolve(filename);
  while (true) {
    const stat = await statIfExists(current);
    if (stat?.isSymbolicLink()) throw new Error(`Link simbólico ou junction não permitido: ${current}`);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

function excluded(name) {
  return EXCLUDED.has(name) || name === '.env' || name.startsWith('.env.')
    || name.startsWith(`.${NAME}-install-`);
}

async function checkTree(directory, skipExcluded = false) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (skipExcluded && excluded(entry.name)) continue;
    const filename = path.join(directory, entry.name);
    const stat = await fs.lstat(filename);
    if (stat.isSymbolicLink()) throw new Error(`Link simbólico ou junction não permitido: ${filename}`);
    if (stat.isDirectory()) await checkTree(filename, skipExcluded);
    else if (!stat.isFile()) throw new Error(`Tipo de arquivo não suportado: ${filename}`);
  }
}

async function checkSkill(directory, strict) {
  await rejectLinkedAncestors(directory);
  const stat = await statIfExists(directory);
  if (!stat?.isDirectory()) throw new Error(`A pasta da skill não é um diretório: ${directory}`);
  const skill = path.join(directory, 'SKILL.md');
  await rejectLinkedAncestors(skill);
  const markdown = await fs.readFile(skill, 'utf8');
  if (parseFrontmatter(markdown)?.name !== NAME) throw new Error(`O SKILL.md não identifica ${NAME}: ${skill}`);
  // A origem e a cópia preparada são validadas por inteiro; uma instalação anterior só precisa ser reconhecível.
  if (strict) {
    const problems = skillProblems(markdown);
    if (problems.length) throw new Error(`SKILL.md inválido para o Claude Code (${skill}):\n- ${problems.join('\n- ')}`);
  }
}

function checkDestination(source, root) {
  if (root === path.parse(root).root || path.relative(os.homedir(), root) === '') {
    throw new Error('Use uma pasta de skills; a raiz do disco e a pasta pessoal não são destinos válidos.');
  }
  if (process.platform === 'win32') {
    if (/^\\\\/.test(root) || root.slice(path.parse(root).root.length).split(path.sep)
      .some((part) => /[:<>"|?*]|[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) {
      throw new Error('Use um caminho local Windows comum, sem dispositivos, ADS ou nomes reservados.');
    }
    for (const systemRoot of [process.env.SystemRoot, process.env.ProgramFiles, process.env['ProgramFiles(x86)']].filter(Boolean)) {
      if (within(path.resolve(systemRoot), root)) throw new Error(`Pasta de sistema não permitida: ${root}`);
    }
  }
  const target = path.join(root, NAME);
  if (within(source, root) || within(source, target) || within(target, source)) {
    throw new Error('Origem e destino não podem coincidir nem conter um ao outro.');
  }
  return target;
}

async function copySkill(source, destination) {
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    if (excluded(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    const stat = await fs.lstat(from);
    if (stat.isSymbolicLink()) throw new Error(`Link simbólico ou junction não permitido: ${from}`);
    if (stat.isDirectory()) {
      await fs.mkdir(to);
      await copySkill(from, to);
    } else if (stat.isFile()) {
      await fs.copyFile(from, to, constants.COPYFILE_EXCL);
    } else throw new Error(`Tipo de arquivo não suportado: ${from}`);
  }
}

/** Install only this skill; every update retains the complete previous directory. */
export async function installSkill({ destination = defaultDestination(), update = false, source = SOURCE } = {}) {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node.js 22 ou superior é necessário.');
  source = path.resolve(source);
  const root = path.resolve(destination);
  const target = checkDestination(source, root);
  const backupRoot = path.join(path.dirname(root), `.${NAME}-backups`);
  if (within(root, backupRoot)) throw new Error('A pasta de backups deve ficar fora da raiz de skills.');
  await rejectLinkedAncestors(root);
  await checkSkill(source, true);
  await checkTree(source, true);
  const previous = await statIfExists(target);
  if (previous) {
    if (!update) throw new Error(`A skill já existe. Use --update para criar um backup e atualizar: ${target}`);
    await checkSkill(target, false);
    await checkTree(target);
    await rejectLinkedAncestors(backupRoot);
  }

  await fs.mkdir(root, { recursive: true });
  await rejectLinkedAncestors(root);
  const lockPath = path.join(root, `.${NAME}.install.lock`);
  let lock;
  try { lock = await fs.open(lockPath, 'wx'); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Instalação em andamento ou lock antigo: ${lockPath}. Verifique antes de remover o lock.`);
    throw error;
  }
  let staging;
  let backup = null;
  try {
    await lock.writeFile(`pid=${process.pid}\n`);
    // Stage beside the skills root: partial copies cannot appear as installed skills.
    staging = await fs.mkdtemp(path.join(path.dirname(root), `.${NAME}-install-`));
    await copySkill(source, staging);
    await checkSkill(staging, true);
    await rejectLinkedAncestors(target);
    const current = await statIfExists(target);
    if (Boolean(current) !== Boolean(previous)) throw new Error('O destino mudou durante a preparação. Execute novamente.');
    if (current) {
      await checkSkill(target, false);
      await checkTree(target);
      await rejectLinkedAncestors(backupRoot);
      await fs.mkdir(backupRoot, { recursive: true });
      // Backups ficam fora da raiz de descoberta e nunca entram no Git do projeto.
      await fs.writeFile(path.join(backupRoot, '.gitignore'), '*\n', { flag: 'a' });
      backup = path.join(backupRoot, `${NAME}-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`);
      await fs.rename(target, backup);
    }
    try { await fs.rename(staging, target); staging = undefined; }
    catch (error) {
      if (backup && !(await statIfExists(target))) {
        try { await fs.rename(backup, target); backup = null; }
        catch (restoreError) { throw new Error(`Falha ao instalar e restaurar. Sua versão anterior está em ${backup}. ${restoreError.message}`, { cause: error }); }
      }
      throw error;
    }
    return { destination: target, backup };
  } finally {
    try {
      if (staging) {
        const parent = path.dirname(root);
        if (path.dirname(staging) !== parent || !path.basename(staging).startsWith(`.${NAME}-install-`)) {
          throw new Error('Limpeza recusada: pasta temporária fora do local esperado.');
        }
        await rejectLinkedAncestors(staging);
        await checkTree(staging);
        await fs.rm(staging, { recursive: true });
      }
    } finally {
      await lock.close();
      await fs.unlink(lockPath);
    }
  }
}

export function resolveDestination({ dest, scope = 'personal', projectDir } = {}) {
  if (!['personal', 'project'].includes(scope)) throw new Error('--scope deve ser personal ou project.');
  if (dest !== undefined && (scope === 'project' || projectDir !== undefined)) throw new Error('--dest não pode ser combinado com --scope project ou --project-dir.');
  if (projectDir !== undefined && scope !== 'project') throw new Error('--project-dir exige --scope project.');
  if (dest !== undefined) return dest;
  return scope === 'project' ? projectDestination(projectDir ?? process.cwd()) : defaultDestination();
}

async function main() {
  const { values } = parseArgs({
    options: {
      dest: { type: 'string' }, scope: { type: 'string' }, 'project-dir': { type: 'string' },
      update: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });
  if (values.help) {
    console.log(`Instala apenas ${NAME} para o Claude Code, sem pacotes globais. Requer Node.js >=22.

node landing-from-images/scripts/install.mjs                       # pessoal: ${defaultDestination()}
node landing-from-images/scripts/install.mjs --update              # atualiza com backup
node landing-from-images/scripts/install.mjs --scope project --project-dir "C:\\Projetos\\MinhaLanding"
node landing-from-images/scripts/install.mjs --dest "C:\\caminho\\skills"   # raiz de skills personalizada

--scope personal|project   personal = ~/.claude/skills (todos os projetos); project = <projeto>/.claude/skills.
--project-dir <pasta>      projeto que recebe a skill (padrão: pasta atual); exige --scope project.
--dest <raiz>              raiz que receberá a pasta ${NAME}; não combina com --scope project.
--update                   preserva a pasta anterior completa em .${NAME}-backups, ao lado da raiz de skills.
As dependências do kit (Playwright, Sharp) são preparadas no projeto: node scripts/setup-tools.mjs --project <pasta>.`);
    return;
  }
  for (const key of ['dest', 'project-dir']) if (values[key] !== undefined && !values[key].trim()) throw new Error(`--${key} exige um caminho não vazio.`);
  const destination = resolveDestination({ dest: values.dest, scope: values.scope, projectDir: values['project-dir'] });
  const result = await installSkill({ destination, update: values.update });
  console.log(`Skill instalada: ${result.destination}`);
  if (result.backup) console.log(`Backup completo da versão anterior: ${result.backup}`);
  console.log('Próximo passo: no Claude Code, digite /landing-from-images. O Claude Code detecta a pasta durante a sessão se ela já existia ao iniciar;');
  console.log('caso contrário, execute /reload-skills ou reinicie. Confira o reconhecimento em /skills: arquivos copiados não provam que o seletor carregou a skill.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(`Falha na instalação: ${error.message}`); process.exitCode = 1; });
}
