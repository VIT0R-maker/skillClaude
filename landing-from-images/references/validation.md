# Registro de validação desta adaptação

Este documento diz o que foi executado, onde, e o que **não** foi validado. As fixtures verificam as ferramentas;
não são referências de fidelidade nem templates de landing page.

## Ambiente dos testes

Linux (Ubuntu), Node.js 22.22, Claude Code CLI 2.1.310 e um Chromium *headless* obtido pelo pacote npm
`@sparticuz/chromium` e informado por `LANDING_BROWSER_PATH` (o download do Chromium do Playwright estava
bloqueado na rede do ambiente). Base: skill Codex `landing-from-images` do repositório `VIT0R-maker/skills`,
commit `6813cc8`. **Nada foi executado no Windows.**

## O que foi executado

| Verificação | Resultado |
| --- | --- |
| `scripts/*.test.mjs` (instalador, `setup-tools`, lint dos documentos da skill) | 23 aprovados, 1 pulado (integração real, abaixo) |
| Integração real do `setup-tools` (`npm ci` + detecção de navegador, projeto com espaços no caminho) | Aprovada (`LANDING_TEST_INSTALL=1`) |
| Kit sem navegador (servidor, inventário, recorte, comparador, projeto com espaços e acentos) | 7 de 7 |
| Kit com navegador (fixture válida, modal, defeitos reais, menu sem transição, cobertura incompleta, `LANDING_BROWSER_PATH` inválido, projeto com espaços e acentos) | 7 de 7 |
| `npm run verify:fixture` | Aprovado |
| `claude plugin validate .claude/skills` (Claude Code 2.1.310) em instalação por projeto, caminho com espaço | Aprovado |

Cenários negativos cobertos: imagem ausente, erro de JavaScript, requisição externa bloqueada, overflow, menu sem
transição (reprovado como deve), menu não configurado e região inexistente (aparecem como não testados), navegador
indisponível (código de saída 3), `npm ci` com falha, `SKILL.md` inválido, symlinks/junctions, lock de instalação
pré-existente e originais preservados byte a byte.

### Limite do validador do Claude Code

Num controle negativo, o validador reprovou frontmatter fora da primeira linha, mas **aprovou** um YAML malformado
(`description: [aberta`). "Validation passed" não prova que o YAML está certo; o lint próprio do repositório e o
parser do instalador cobrem essa lacuna, e o teste de lint exige o frontmatter válido.

### Correção do verificador de menu, medida com material real

O check de transição do kit Codex amostrava a animação 40 ms depois do clique. Em quatro verificações simultâneas
do site Mimo Pet (`Demo_PetShop2`) no mesmo navegador, o verificador original reprovou **4 de 4** por falso negativo
na abertura do menu (768 px nas quatro; 390 e 360 px em duas), e o atual, que observa `transitionrun`,
`animationstart` e os quadros desde antes da ativação, aprovou **4 de 4**. A hipótese inicial ("falta o primeiro
quadro") explicou só parte do problema: uma versão intermediária que apenas esperava dois quadros ainda falhou 1
de 3 vezes, e a observação por eventos resolveu o resto. O ambiente era renderização por software sob carga;
a taxa em outra máquina pode diferir. O controle negativo (menu sem transição) continua reprovado.

### Ferramentas sobre referências reais

As quatro imagens do Mimo Pet (1487 × 1058, fornecidas pelo usuário) passaram por `inventory.mjs`, um `crop.mjs`
real da foto do hero (resultado limpo, sem texto, conferido visualmente; original intacto) e `compare.mjs` contra
as regiões equivalentes do site `Demo_PetShop2`, já existente. Dois dos quatro lados a lado foram inspecionados
visualmente (hero e contato); o alinhamento funcionou e a inspeção apontou diferenças que a métrica sozinha não
explica, como a borda visível onde a foto começa. As métricas (diferença média de luminância de 0,06 a 0,11) só
indicaram onde olhar.

## O que NÃO foi validado

- Execução no Windows do instalador, do `setup-tools`, do kit e dos fallbacks `msedge`/`chrome`. O código evita
  caminhos e comandos Unix, usa `os.homedir()` e `shell` apenas para `npm`/`npx` no Windows, mas isso é desenho,
  não teste.
- Uma sessão real do Claude Code: descoberta por `/skills`, invocação `/landing-from-images`, substituição de
  `$ARGUMENTS` e `${CLAUDE_SKILL_DIR}`, e o efeito das regras `PowerShell(...)` em `allowed-tools`. O CLI do
  ambiente recusou a credencial de teste antes de carregar skills, então só o validador estático rodou.
- **Uma reconstrução completa feita pela skill do zero.** O site Mimo Pet usado nos testes foi construído antes, em
  outra sessão, e serviu de material para as ferramentas. A fidelidade do fluxo ponta a ponta no Claude Code em um
  projeto real **continua não validada**.
- O caminho de download do Chromium gerenciado pelo Playwright e os fallbacks de canal (só `LANDING_BROWSER_PATH`
  foi exercitado de fato).
- Calibração do `compare.mjs`: ele é auxiliar, não tem limite de aprovação, e as métricas acima são só observação.
