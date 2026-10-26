# Landing from Images

Transforma as imagens de um design (página completa ou partes consecutivas) em uma landing page estática,
responsiva e funcional. Você recebe HTML, CSS e JavaScript, assets reaproveitados das suas referências e
evidências de verificação, com execução autônoma depois de invocar a skill no Claude Code.

## Uso

```text
/landing-from-images Reproduza as imagens anexadas em uma única landing page, na ordem
Hero → Serviços/Sobre → Galeria → Contato/Rodapé. Crie em "C:\Projetos\MinhaLanding",
derive o mobile e verifique as interações autonomamente.
```

Outras formas aceitas, todas na mesma invocação:

| Você fornece | Exemplo |
| --- | --- |
| Uma imagem longa | `/landing-from-images Reproduza "C:\Refs\pagina-inteira.png" em "C:\Projetos\Barbearia".` |
| Várias partes consecutivas | `... as partes 01-hero.png, 02-servicos.png, 03-galeria.png e 04-contato.png, nessa ordem ...` |
| Só desktop | A skill deriva o mobile sozinha. |
| Desktop e mobile | `... desktop-*.png e mobile-*.png; use a composição mobile fornecida ...` |
| Fotos, logos e fontes originais | `... use as fotos de "C:\Refs\fotos" e o logo logo.svg; títulos em Manrope, corpo em Inter ...` |
| Copy e instruções | Cole os textos exatos e regras; eles prevalecem sobre a leitura da imagem. |
| Repositório | `... depois faça commit e push para https://github.com/<usuario>/<repo>.` |

A skill precisa dos **arquivos** das imagens em disco para recortar fotografias. Arraste os arquivos para o terminal
(isso insere o caminho completo) ou informe os caminhos. Você não precisa renomear arquivos, montar JSON ou aprovar
etapas: o agente cria o mapa das referências, o plano, a implementação, as comparações e os testes, e entrega.

A invocação é explícita: o Claude não inicia a skill por conta própria (`disable-model-invocation: true`).
Construir o site, enviar o código ao GitHub e publicar em hospedagem são escopos separados. O envio ao GitHub só
acontece se você pedir; uma invocação genérica não presume envio, publicação ou contratação de serviços.

## Instalação no Windows

Requer **Node.js 22.12 ou superior** e o Claude Code. Instalar não instala Node, bibliotecas nem navegadores.
Os comandos abaixo funcionam em CMD e PowerShell. Obtenha o repositório e, na raiz dele:

```text
git clone https://github.com/VIT0R-maker/skillClaude.git "C:\Ferramentas\skillClaude"
cd /d C:\Ferramentas\skillClaude
node landing-from-images/scripts/install.mjs
```

(No PowerShell, troque `cd /d` por `cd`.) O instalador usa `os.homedir()` e copia somente `landing-from-images`
para `~/.claude/skills/landing-from-images`, o **escopo pessoal** do Claude Code, válido em todos os projetos desta
máquina (`%USERPROFILE%\.claude\skills\landing-from-images`). Ele valida o `SKILL.md` contra as regras
documentadas do Claude Code, não toca em outras skills, não instala pacotes globalmente e recusa links simbólicos.

**Por projeto**, em vez de pessoal (a skill passa a viver em `.claude/skills/` e pode ser versionada com o projeto):

```text
node landing-from-images/scripts/install.mjs --scope project --project-dir "C:\Projetos\MinhaLanding"
```

**Atualizar** após atualizar o repositório (`git pull`), com backup da versão anterior; use as mesmas opções de
escopo da instalação:

```text
node landing-from-images/scripts/install.mjs --update
```

Sem `--update`, uma instalação existente é preservada e o comando falha com orientação. O backup completo vai para
`.landing-from-images-backups`, **ao lado** (não dentro) da pasta `skills`, contém um `.gitignore` e nunca é
descoberto como skill duplicada. Para reverter: remova `landing-from-images` da pasta `skills` e copie de volta a
pasta do backup com esse nome.

**Reconhecimento.** O Claude Code observa `~/.claude/skills` e `.claude/skills` durante a sessão. Se a pasta
`skills` não existia quando a sessão começou, execute `/reload-skills` ou reinicie. Confira com `/skills` e
invoque `/landing-from-images`. Arquivos copiados não provam que o seletor carregou a skill. Sessões do Cowork e na
nuvem não leem `~/.claude/skills` da sua máquina. Para o Codex, esta variante não é o caminho principal: se
quiser usá-la lá, passe `--dest` com a raiz de skills do Codex (o `agents/openai.yaml` existe só para isso).

## Requisitos e alternativas

| Recurso | Necessidade | Alternativa |
| --- | --- | --- |
| Claude Code com leitura de imagens e acesso ao projeto | Obrigatório | Sem imagens acessíveis, informar o impedimento |
| Node.js >= 22.12 | Instalador e kit | Cópia manual da skill; ferramentas equivalentes do ambiente |
| npm | Instalar as dependências do kit | Dependências já disponíveis junto aos scripts |
| Navegador: Chromium do Playwright, Microsoft Edge ou Google Chrome | Capturas e testes automáticos | `LANDING_BROWSER_PATH` ou um navegador conectado ao agente, com cobertura registrada |
| Sharp | Inventário, recortes e comparação | Editor local, preservando originais e coordenadas |
| Fontes, fotos e logos originais | Opcionais; preferíveis aos recortes | Recorte viável ou aproximação documentada |

Nenhum serviço de geração de imagem, OpenRouter, fal.ai, Gemini ou chave de API é necessário. O site final é
estático e não exige Node na hospedagem. Versões do kit fixas em [package.json](tools/package.json) e
[package-lock.json](tools/package-lock.json).

## Preparar o kit em um projeto

O agente faz isso sozinho na primeira execução; você pode fazê-lo antes. Em qualquer pasta, com o caminho da
skill instalada (no escopo pessoal, `%USERPROFILE%\.claude\skills\landing-from-images`):

```text
node "%USERPROFILE%\.claude\skills\landing-from-images\scripts\setup-tools.mjs" --project "C:\Projetos\MinhaLanding"
```

No PowerShell use `$env:USERPROFILE` no lugar de `%USERPROFILE%`. O script, em Node, funciona igual em CMD,
PowerShell e Git Bash e trata caminhos com espaços: copia as ferramentas para `<projeto>\.landing-tools` (sem
`node_modules`, testes ou fixtures), instala as dependências fixadas com `npm ci`, confirma um navegador utilizável
e inclui `.landing-tools/`, `.work/` e `node_modules/` no `.gitignore` do projeto (`--no-gitignore` desativa).
Repetir o comando é seguro: só recopia o que mudou e não reinstala o que já está nas versões fixadas.

Códigos de saída: `0` pronto; `3` kit pronto **sem navegador** (instale Edge/Chrome, rode
`npx playwright install chromium` com rede, ou defina `LANDING_BROWSER_PATH`); `1` erro. `--skip-install` e
`--skip-browser` limitam o que ele faz. Não altere a ExecutionPolicy do PowerShell: o script não depende dela.

Ferramentas, executadas na raiz do projeto (detalhes e exemplos em [verificação](references/verification.md)):

| Comando | Função |
| --- | --- |
| `node .landing-tools/inventory.mjs` | Mede as imagens (dimensões reais, orientação EXIF, hash) |
| `node .landing-tools/crop.mjs` | Recorta e otimiza assets, preserva a origem e registra a região |
| `node .landing-tools/serve.mjs` | Prévia local em `127.0.0.1` |
| `node .landing-tools/verify.mjs` | Captura 4 larguras e verifica recursos, layout, âncoras, teclado e menu |
| `node .landing-tools/compare.mjs` | Lado a lado e mapa de diferença entre referência e captura (auxiliar) |

## Arquivos entregues

```text
<projeto>/
  index.html
  assets/                  # css/, js/, images/, fonts/ (o que o site publica)
  .work/                   # registros e evidências, não publicar
    references/            # cópias das referências (os originais ficam intactos)
    reference-map.json  plan.md  progress.md  crops.json
    verification/          # capturas, report.json, compare/, review.md
  .landing-tools/          # kit de desenvolvimento e suas dependências, não publicar
```

Publique `index.html` e `assets/`. `.work` e `.landing-tools` ficam fora do site e do Git. `review.md` separa
renderização e capturas, testes funcionais, avaliação visual e aproximações.

## Permissões

O frontmatter pré-aprova somente os scripts da skill (`setup-tools.mjs` e `.landing-tools/*`), em Bash e em
PowerShell. Essa liberação vale apenas para o turno da invocação e termina quando você envia a próxima mensagem.
Edições de arquivo e outros comandos seguem o seu modo de permissão. Para um fluxo sem interrupções, use o modo
`acceptEdits` ou o modo automático do Claude Code; a skill nunca contorna as permissões do ambiente.

## Limitações conhecidas

- A fidelidade visual é julgada pelo agente comparando imagens; o kit coleta evidências e não a aprova.
- Fontes são identificadas por aproximação, e fotos encobertas por texto sem original só podem ser recortadas no
  que está visível, o que é registrado.
- Uma fotografia de referência não define sozinha o site: a estrutura vem do que a imagem mostra, do briefing e de
  decisões documentadas.
- Sem navegador disponível, capturas e testes automáticos não rodam, e isso consta como "não executado".
- A skill só inicia por invocação explícita e exige o arquivo das imagens em disco.
- Formulários nunca enviam mensagens reais nos testes; sem número ou destino comercial, a skill deixa a
  configuração centralizada e o modo demonstração indicado.

## O que muda em relação a `img-to-html`

- Aceita uma imagem longa ou várias partes de **uma** página, com desktop e mobile, em vez de uma referência.
- Sem aprovações obrigatórias, sem wireframe ASCII obrigatório e sem regeneração de assets como procedimento.
- Usa a pasta do projeto pedida (não `design-systems/<slug>`) e permite Node, Playwright e servidor local.
- Reaproveita originais e recortes; usa comandos que funcionam no Windows, sem caminhos nem `open` do macOS.
- Não chama `img-to-html` nem exige `to-wireframe`: as skills originais permanecem intactas.

## Verificar esta skill

Na pasta `tools` (após `npm ci`): `npm test` (servidor, inventário, recorte e comparador), `npm run test:browser`
(navegador, com fixtures válidas e defeituosas) e `npm run verify:fixture`. Na raiz do repositório:
`node --test landing-from-images/scripts/install.test.mjs landing-from-images/scripts/setup-tools.test.mjs
landing-from-images/scripts/skill.test.mjs`. As fixtures verificam as ferramentas e não são referências de
fidelidade nem templates de landing page. O [registro de validação](references/validation.md) descreve o que foi
executado, onde e o que não foi.
