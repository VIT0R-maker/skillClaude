import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, skillProblems } from './install.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = file => fs.readFile(path.join(root, file), 'utf8');
const markdownFiles = ['SKILL.md', 'README.md', ...['implementation', 'input-and-assets', 'motion-and-menu', 'responsiveness', 'validation', 'verification'].map(name => `references/${name}.md`)];

const slug = heading => heading.trim().toLowerCase().replace(/[`*_~]/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');

test('SKILL.md é válido para o Claude Code e segue a estrutura de escrita do AGENTS.md', async () => {
  const skill = await read('SKILL.md');
  assert.deepEqual(skillProblems(skill), []);
  const meta = parseFrontmatter(skill);
  assert.equal(meta['argument-hint'].length > 0, true);
  const headings = [...skill.matchAll(/^## (.+)$/gm)].map(match => match[1]);
  assert.deepEqual(headings.slice(0, 3), ['Quem você é', 'Seu objetivo', 'Processo em alto nível']);
  // Valor, resultado e exemplo antes das regras: o H1 e o parágrafo de valor vêm antes de "Quem você é".
  const beforeRole = skill.slice(skill.indexOf('# Landing from Images'), skill.indexOf('## Quem você é'));
  assert.match(beforeRole, /benefício/);
  assert.match(beforeRole, /resultado/);
  assert.match(beforeRole, /Exemplo:/);
  assert.match(skill, /\$ARGUMENTS/, 'o pedido do usuário deve ser injetado');
  assert.match(skill, /\$\{CLAUDE_SKILL_DIR\}/, 'scripts da skill devem usar ${CLAUDE_SKILL_DIR}');
});

test('a pré-aprovação de ferramentas cobre só os scripts da skill, em Bash e PowerShell', async () => {
  const rules = parseFrontmatter(await read('SKILL.md'))['allowed-tools'].split(/\s+(?=\w+\()/);
  assert.ok(rules.length >= 2);
  for (const rule of rules) {
    assert.match(rule, /^(Bash|PowerShell)\(node (\*setup-tools\.mjs\*|\.landing-tools\/\*)\)$/, rule);
  }
  for (const tool of ['Bash', 'PowerShell']) assert.ok(rules.some(rule => rule.startsWith(`${tool}(`)), tool);
});

test('links relativos e âncoras de SKILL.md, README e referências existem', async () => {
  for (const file of markdownFiles) {
    const content = await read(file);
    const base = path.dirname(path.join(root, file));
    for (const [, target] of content.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|mailto:)/.test(target)) continue;
      const [filePart, anchor] = target.split('#');
      const destination = filePart ? path.resolve(base, filePart) : path.join(root, file);
      const text = await fs.readFile(destination, 'utf8').catch(() => assert.fail(`${file}: link quebrado ${target}`));
      if (anchor) {
        const anchors = [...text.matchAll(/^#{1,6} (.+)$/gm)].map(match => slug(match[1]));
        assert.ok(anchors.includes(anchor), `${file}: âncora ausente ${target}`);
      }
    }
  }
});

test('sem resquícios do Codex ou do macOS nas instruções do Claude (o openai.yaml é a exceção declarada)', async () => {
  const forbidden = [/~\/\.agents/, /\.agents\/skills/, /\/Users\//, /learn\.chatgpt\.com/, /motion-lab/, /\$landing-from-images/, /\$to-wireframe/, /\$img-to-html/, /OPENROUTER_API_KEY/];
  for (const file of markdownFiles.filter(name => name !== 'references/validation.md')) {
    const content = await read(file);
    for (const pattern of forbidden) assert.doesNotMatch(content, pattern, `${file}: ${pattern}`);
  }
  const yaml = await read('agents/openai.yaml');
  assert.match(yaml.split('\n').slice(0, 4).join('\n'), /Claude Code NÃO usa este arquivo/);
  assert.match(yaml, /allow_implicit_invocation: false/);
});

test('o kit fixa versões exatas e exige o mesmo Node que a documentação', async () => {
  const kit = JSON.parse(await read('tools/package.json'));
  for (const [name, version] of Object.entries(kit.dependencies)) assert.match(version, /^\d+\.\d+\.\d+$/, `${name} deve ter versão exata`);
  assert.equal(kit.engines.node, '>=22.12.0');
  assert.match(await read('README.md'), /Node\.js 22\.12/);
  const lock = JSON.parse(await read('tools/package-lock.json'));
  for (const [name, version] of Object.entries(kit.dependencies)) assert.equal(lock.packages[`node_modules/${name}`].version, version);
});
