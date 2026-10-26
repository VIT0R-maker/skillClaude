# AGENTS

## Estrutura de escrita das skills

Ao criar ou reescrever uma skill que descreve um processo, comece o corpo do
`SKILL.md` nesta ordem:

1. **Quem você é** — defina claramente o papel do agente.
2. **Seu objetivo** — explique o resultado final e os princípios que devem ser
   preservados.
3. **Processo em alto nível** — apresente o fluxo completo, do início à entrega,
   sem detalhes de implementação.

Somente depois desse mapa inicial entre em regras, exceções, ferramentas e
instruções operacionais. Não comprima os três blocos em um parágrafo genérico e
não desça para o baixo nível antes de o processo completo estar claro.

## Clareza, concisão e exemplos

Antes de explicar **como** uma skill funciona, diga em poucas palavras:

1. o que ela permite fazer;
2. qual é seu principal benefício; e
3. qual resultado o usuário recebe.

Avance sempre do geral para o específico: **valor → resultado → processo →
regras e ferramentas**. Use frases curtas e precisas. Elimine contexto,
repetições e justificativas que não mudem uma decisão.

Sempre inclua ao menos um exemplo curto para tornar a instrução concreta.

Exemplo de abertura:

> Extract DS é uma Skill que te permite gerar Design Systems completos a partir
> de uma simples página HTML local. Isso permite criar novas interfaces usando
> referências visuais de alta qualidade, já implementadas e validadas.

Somente depois desse benefício explique detalhes como tipografia, cores,
componentes, runtime ou ferramentas.

## README

Sempre que houver qualquer alteração no **nome** de uma skill (renomear pasta, criar skill nova, apagar skill, ou mudar o `name` no frontmatter), atualize também o [`README.md`](./README.md) para refletir a mudança.

## Metadados para o Codex (`agents/openai.yaml`)

O Codex lê `agents/openai.yaml`; o **Claude Code não o usa**. Nome, invocação e política de uma skill no Claude
vêm do frontmatter do `SKILL.md` (veja a seção seguinte). O arquivo é, portanto, compatibilidade com o Codex e
nunca um requisito de funcionamento no Claude. As skills existentes mantêm o arquivo, no padrão:

```yaml
interface:
  display_name: "Nome amigável"
  short_description: "Uma linha do que faz"
  default_prompt: "Use $nome-da-skill: …"
policy:
  allow_implicit_invocation: false
```

Ao **criar** ou **renomear** uma skill pensada também para o Codex, crie ou atualize o arquivo junto (o
`$nome-da-skill` do `default_prompt` deve bater com a pasta / `name` do `SKILL.md`). Skills feitas só para o
Claude Code podem omiti-lo. Quando o arquivo existir numa skill nativa do Claude, comece-o com um comentário que
declare sua finalidade, como em [`landing-from-images/agents/openai.yaml`](./landing-from-images/agents/openai.yaml).

## Claude Code

O Claude Code lê `CLAUDE.md`, não este arquivo; o [`CLAUDE.md`](./CLAUDE.md) da raiz importa `@AGENTS.md`, então
tudo aqui também vale para ele. Ao criar ou adaptar uma skill para o Claude Code:

- **Frontmatter do `SKILL.md`:** `name` igual ao da pasta; `description` com o uso principal logo no começo (a
  listagem trunca `description` + `when_to_use` em 1.536 caracteres); `disable-model-invocation: true` para fluxos
  que só devem iniciar por `/nome`; `argument-hint` quando houver argumentos, usados no corpo com `$ARGUMENTS`.
- **Tamanho e ordem:** `SKILL.md` com menos de 500 linhas e o essencial no topo, porque depois de uma compactação
  só o início do corpo é preservado. Detalhes ficam em `references/`.
- **Caminhos:** scripts da própria skill via `${CLAUDE_SKILL_DIR}`, nunca caminhos pessoais de outro autor
  (`/Users/...`). Evite injeção `` !`comando` `` no corpo: ela exige bash e falha no Windows sem Git Bash.
- **Instalação:** pessoal em `~/.claude/skills/<nome>`; por projeto em `.claude/skills/<nome>`. Instaladores
  preservam as demais skills e guardam backups fora da pasta `skills`, para não serem lidos como duplicatas.
- **Windows:** documente comandos que funcionem em CMD e PowerShell, sem `open`, `chmod` ou atalhos Unix.
