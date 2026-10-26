#!/usr/bin/env node
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const SKILL_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const KIT_SOURCE = path.join(SKILL_DIR, 'tools');
const KIT_NAME = '.landing-tools';
const NOT_COPIED = new Set(['node_modules', '.work', 'test', 'fixture', '.DS_Store', 'Thumbs.db']);
const GITIGNORE_ENTRIES = ['.landing-tools/', '.work/', 'node_modules/'];
const GITIGNORE_TITLE = '# landing-from-images: ferramentas e registros de trabalho (não publicar)';
export const EXIT_NO_BROWSER = 3;

const PROBE = [
  "import { launchBrowser } from './lib/browser.mjs';",
  'const { browser, source, version } = await launchBrowser();',
  'console.log(JSON.stringify({ source, version }));',
  'await browser.close();'
].join('\n');

function within(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function nodeSupported(version = process.versions.node) {
  const [major, minor] = version.split('.').map(Number);
  return major > 22 || (major === 22 && minor >= 12);
}

/** No Windows, .cmd exige shell; os argumentos são fixos e o diretório vai em cwd, então caminhos com espaços são seguros. */
export function realRunner(command, args, { cwd, input } = {}) {
  const windows = process.platform === 'win32';
  const executable = command === 'node' ? process.execPath : (windows ? `${command}.cmd` : command);
  const result = spawnSync(executable, args, {
    cwd, input, encoding: 'utf8', windowsHide: true, shell: windows && command !== 'node',
    stdio: input === undefined ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe'], timeout: 15 * 60 * 1000
  });
  return { status: result.status ?? 1, stdout: result.stdout || '', stderr: result.stderr || (result.error ? String(result.error.message) : '') };
}

async function listKitFiles(directory, base = directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (NOT_COPIED.has(entry.name)) continue;
    const filename = path.join(directory, entry.name);
    const stat = await fs.lstat(filename);
    if (stat.isSymbolicLink()) throw new Error(`Link simbólico ou junction não permitido no kit: ${filename}`);
    if (stat.isDirectory()) files.push(...await listKitFiles(filename, base));
    else if (stat.isFile()) files.push(path.relative(base, filename));
  }
  return files.sort();
}

const digest = buffer => createHash('sha256').update(buffer).digest('hex');
async function readIfExists(filename) {
  try { return await fs.readFile(filename); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function copyKit(destination) {
  const changed = [];
  for (const relative of await listKitFiles(KIT_SOURCE)) {
    const from = path.join(KIT_SOURCE, relative);
    const to = path.join(destination, relative);
    const wanted = await fs.readFile(from);
    const current = await readIfExists(to);
    if (current && digest(current) === digest(wanted)) continue;
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.writeFile(to, wanted);
    changed.push(relative);
  }
  return changed;
}

async function dependenciesInstalled(kit) {
  const pinned = JSON.parse(await fs.readFile(path.join(kit, 'package.json'), 'utf8')).dependencies;
  for (const [name, version] of Object.entries(pinned)) {
    const installed = await readIfExists(path.join(kit, 'node_modules', name, 'package.json'));
    if (!installed || JSON.parse(installed.toString('utf8')).version !== version) return false;
  }
  return true;
}

async function updateGitignore(project) {
  const file = path.join(project, '.gitignore');
  const current = (await readIfExists(file))?.toString('utf8') ?? '';
  const present = new Set(current.split(/\r?\n/).map(line => line.trim()));
  const missing = GITIGNORE_ENTRIES.filter(entry => !present.has(entry) && !present.has(entry.replace(/\/$/, '')));
  if (!missing.length) return [];
  const prefix = current && !current.endsWith('\n') ? '\n' : '';
  const title = present.has(GITIGNORE_TITLE) ? '' : `${current ? '\n' : ''}${GITIGNORE_TITLE}\n`;
  await fs.writeFile(file, `${current}${prefix}${title}${missing.join('\n')}\n`);
  return missing;
}

function probeBrowser(runner, kit) {
  const result = runner('node', ['--input-type=module', '-e', PROBE], { cwd: kit });
  if (result.status !== 0) return { found: null, detail: (result.stderr || result.stdout).trim().split('\n').slice(0, 4).join('\n') };
  try { return { found: JSON.parse(result.stdout.trim().split('\n').pop()), detail: '' }; }
  catch { return { found: null, detail: 'Resposta inesperada ao testar o navegador.' }; }
}

/** Prepara <projeto>/.landing-tools. Retorna o resultado; exitCode 0 = pronto, 3 = kit pronto sem navegador. */
export async function setupTools({ project, skipInstall = false, skipBrowser = false, gitignore = true, runner = realRunner, log = console.log } = {}) {
  if (!nodeSupported()) throw new Error('Node.js 22.12 ou superior é necessário.');
  if (!project || !project.trim()) throw new Error('Informe --project <pasta do projeto>.');
  const root = path.resolve(project);
  if (root === path.parse(root).root || path.relative(os.homedir(), root) === '') throw new Error('Use a pasta do projeto; a raiz do disco e a pasta pessoal não são válidas.');
  if (within(SKILL_DIR, root) || within(root, SKILL_DIR)) throw new Error('O projeto não pode estar dentro da pasta da skill nem conter a skill.');
  await fs.mkdir(root, { recursive: true });
  const kit = path.join(root, KIT_NAME);
  const result = { project: root, kit, copied: [], gitignore: [], dependencies: 'não verificadas', browser: null, exitCode: 0 };

  result.copied = await copyKit(kit);
  log(result.copied.length ? `Kit atualizado em ${kit} (${result.copied.length} arquivos).` : `Kit já estava atualizado em ${kit}.`);
  if (gitignore) {
    result.gitignore = await updateGitignore(root);
    if (result.gitignore.length) log(`.gitignore: adicionado ${result.gitignore.join(', ')}.`);
  }

  if (!skipInstall) {
    if (await dependenciesInstalled(kit)) { result.dependencies = 'já instaladas'; log('Dependências do kit já instaladas nas versões fixadas.'); }
    else {
      log('Instalando dependências do kit (npm ci)...');
      const install = runner('npm', ['ci', '--no-audit', '--no-fund'], { cwd: kit });
      if (install.status !== 0) throw new Error(`npm ci falhou (código ${install.status}). Verifique a rede e a versão do npm.\n${install.stderr.trim().split('\n').slice(-6).join('\n')}`);
      result.dependencies = 'instaladas';
    }
  }

  if (skipBrowser || skipInstall) {
    result.browser = 'não verificado';
    log('Navegador não verificado nesta execução.');
  } else {
    let probe = probeBrowser(runner, kit);
    if (!probe.found) {
      log('Nenhum navegador utilizável encontrado; tentando instalar o Chromium do Playwright...');
      runner('npx', ['playwright', 'install', 'chromium'], { cwd: kit });
      probe = probeBrowser(runner, kit);
    }
    if (probe.found) {
      result.browser = probe.found;
      log(`Navegador pronto: ${probe.found.source} (${probe.found.version}).`);
    } else {
      result.exitCode = EXIT_NO_BROWSER;
      result.browser = null;
      result.browserDetail = probe.detail;
      log('Navegador indisponível: capturas e verificações automatizadas NÃO podem ser executadas.');
      log('Alternativas: instalar Edge ou Chrome, rodar "npx playwright install chromium" com rede, ou definir LANDING_BROWSER_PATH com o caminho de um Chromium.');
      if (probe.detail) log(probe.detail);
    }
  }
  await fs.writeFile(path.join(kit, 'setup.json'), `${JSON.stringify({ ...result, preparedAt: new Date().toISOString(), node: process.versions.node, platform: process.platform }, null, 2)}\n`);
  return result;
}

async function main() {
  const { values } = parseArgs({
    options: {
      project: { type: 'string' }, 'skip-install': { type: 'boolean' }, 'skip-browser': { type: 'boolean' },
      'no-gitignore': { type: 'boolean' }, help: { type: 'boolean', short: 'h' }
    },
    allowPositionals: false
  });
  if (values.help || !values.project) {
    console.log(`Prepara o kit de desenvolvimento e verificação dentro do projeto da landing page.

node "<pasta da skill>/scripts/setup-tools.mjs" --project "C:\\Projetos\\MinhaLanding"

Copia as ferramentas para <projeto>/.landing-tools, instala as dependências fixadas (npm ci), confirma um navegador
utilizável (Chromium do Playwright, Edge ou Chrome) e inclui .landing-tools/, .work/ e node_modules/ no .gitignore.
--skip-install  só copia os arquivos      --skip-browser  não testa nem instala navegador
--no-gitignore  não altera o .gitignore
Códigos de saída: 0 pronto; 3 kit pronto, porém sem navegador utilizável; 1 erro.`);
    if (!values.help) process.exitCode = 1;
    return;
  }
  const result = await setupTools({ project: values.project, skipInstall: values['skip-install'], skipBrowser: values['skip-browser'], gitignore: !values['no-gitignore'] });
  process.exitCode = result.exitCode;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`Falha ao preparar o kit: ${error.message}`); process.exitCode = 1; });
}
