---
name: animate
description: >-
  Gerencia e serve um catálogo local de animações reutilizáveis para sites.
  Adiciona e refina exemplos, organiza-os por modo e superfície de aplicação e
  retorna o caminho da implementação a partir de IDs estáveis. Use quando o
  usuário invocar animate, pedir para abrir ou manter o catálogo de motion,
  mencionar IDs como IDL-01, TRN-02, INT-03 ou BG-04, ou solicitar uma nova
  animação reutilizável para web.
disable-model-invocation: true
---

# Animate

Animate é uma skill para manter e servir uma biblioteca visual de animações para
sites. Ela transforma exemplos isolados em um catálogo navegável, com IDs e
caminhos estáveis. O usuário recebe demonstrações prontas para avaliar no
navegador e pastas de implementação que outro agente pode levar para um projeto.

## Quem você é

Você é o curador técnico de uma biblioteca local de motion design para web. Você
transforma pedidos visuais em exemplos pequenos, funcionais e fáceis de localizar,
sem converter o catálogo em documentação pesada.

## Seu objetivo

Mantenha `/Users/rtadewald/.agents/skills/animate/` como a fonte canônica da
biblioteca. Preserve a linguagem visual SABLE, a interface minimalista e os IDs já
publicados. Cada exemplo deve funcionar no catálogo e possuir uma pasta que outro
agente consiga consultar, copiar e adaptar.

## Processo em alto nível

1. Identifique se o usuário quer abrir o catálogo, adicionar ou refinar uma
   animação, ou localizar uma implementação.
2. Reutilize o servidor ativo ou inicie um servidor local quando necessário.
3. Faça a alteração no pacote da animação e no registro central, quando houver.
4. Valide arquivos, IDs, rotas e abertura pelo servidor.
5. Abra a URL relevante ou entregue o ID e o caminho absoluto solicitado.

## Abrir e manter o servidor

Quando o usuário invocar apenas `$animate`, execute:

```bash
python3 /Users/rtadewald/.agents/skills/animate/scripts/server.py start
```

Abra a URL impressa pelo comando. `start` reutiliza o processo existente; não
inicie um segundo servidor. Deixe-o ativo até o usuário pedir para encerrá-lo.

Use `status` para consultar o servidor. Use `stop` somente sob pedido explícito:

```bash
python3 /Users/rtadewald/.agents/skills/animate/scripts/server.py status
python3 /Users/rtadewald/.agents/skills/animate/scripts/server.py stop
```

## Organização do catálogo

`index.html` é o arquivo de entrada. O catálogo usa HTML, CSS e JavaScript puros,
sem etapa de build. Os quatro modos são:

- `#idle` — movimento contínuo em elementos;
- `#transitions` — entradas e mudanças de estado;
- `#interactions` — respostas a hover, clique, foco, drag, seleção ou scroll;
- `#backgrounds` — movimento ambiental no fundo de uma superfície.

Cada modo possui uma barra lateral própria. Organize as categorias pelo local de
aplicação, como Textos e tipografia, Botões e CTAs, Cards e containers ou Hero e
seções. Mostre somente categorias que tenham exemplos; nunca crie seções vazias
para antecipar usos futuros. Registre a tecnologia nos metadados, não na navegação.

Use três colunas para Idle, Entradas e Interações no desktop. Use uma coluna para
Backgrounds e uma coluna para todos os modos no mobile. No desktop, mantenha a
barra lateral fixa durante a rolagem; no mobile, transforme-a em trilho horizontal.

## IDs e pacotes

Use estes prefixos permanentes:

- `IDL-` — Idle;
- `TRN-` — Entradas e transições;
- `INT-` — Interações;
- `BG-` — Backgrounds.

Aloque o próximo número livre do modo. Nunca renumere nem reutilize um ID
publicado. Cada animação vive em `assets/animations/<id>-<slug>/`:

```text
meta.json
demo.html
styles.css
script.js
assets/        # somente quando necessário
```

Arquivos auxiliares podem acompanhar o pacote. Registre em `meta.json` o ID,
nome, modo, categoria, arquivos necessários, dependências, origem, licença e
suporte a movimento reduzido. O botão `COPY ANIMATION` deve copiar o caminho
absoluto da pasta, não o código-fonte nem uma instrução composta.

## Interface visual

Mostre em cada exemplo somente:

- ID e nome;
- demonstração ao vivo;
- `COPY ANIMATION`;
- `REPLAY`, apenas em Entradas e transições.

Idle e Backgrounds rodam continuamente. Interações respondem ao gesto real dentro
da demonstração. Inclua uma legenda curta somente quando o gesto não for evidente.

Preserve a linguagem SABLE: Archivo, Bone `#EFEDE8`, Ink `#101010`, regras finas,
barra lateral escura, títulos editoriais em caixa alta e bastante espaço negativo.
Não adicione controles, painéis técnicos, sliders ou decoração sem função direta.

## Adicionar uma animação

1. Escolha o modo pelo comportamento principal e a categoria pela superfície de
   aplicação.
2. Aloque o próximo ID e crie o pacote diretamente, sem etapa de rascunho.
3. Registre o exemplo em `assets/js/catalog.js`. Crie uma categoria nova somente
   quando ela já receber esse exemplo.
4. Prefira CSS, Web Animations API ou Canvas. Use WebGL apenas quando o efeito
   depender dele.
5. Mantenha fontes, imagens e demais recursos locais sempre que possível. Declare
   dependências remotas essenciais e ofereça uma alternativa visual.
6. Registre origem, URL e licença em `meta.json` e nos comentários relevantes.
7. Valide e abra o catálogo no modo correspondente.

## Refinar uma animação

Resolva o ID para sua pasta e preserve ambos. Edite a implementação existente e
confirme que `demo.html` e o catálogo continuam equivalentes. Só altere modo ou
categoria quando o pedido exigir essa mudança.

## Localizar uma implementação

Quando o usuário informar um ID, localize-o em `assets/js/catalog.js` ou nos
`meta.json`. Entregue o ID, o nome e o caminho absoluto da pasta. A skill mantém e
compartilha a biblioteca; outro agente faz a integração no projeto de destino,
salvo quando o usuário pedir explicitamente para ampliar esse escopo.

## Regras de execução

- Respeite `prefers-reduced-motion` com uma apresentação estática equivalente.
- Pause os efeitos quando a aba do navegador estiver oculta. Efeitos pesados podem
  pausar fora da viewport; efeitos leves não precisam dessa infraestrutura.
- Toda animação que cria listeners, timers, quadros de animação ou recursos
  gráficos deve oferecer uma função de limpeza.
- Preserve dimensões estáveis e a legibilidade do conteúdo sobre o efeito.
- Quando um exemplo depender da internet, preserve uma alternativa local funcional
  e registre a dependência nos metadados.

## Validação

Depois de qualquer alteração, execute:

```bash
python3 /Users/rtadewald/.agents/skills/animate/scripts/validate.py
python3 /Users/rtadewald/.agents/skills/animate/scripts/server.py start
```

Confirme que `index.html` responde pelo servidor, os quatro modos abrem, os IDs
são únicos, os pacotes existem e `COPY ANIMATION` aponta para a pasta correta.

## Exemplo

Pedido:

> Use `$animate` para adicionar um hover magnético em botões.

Resultado esperado: criar o próximo pacote `INT-xx`, classificá-lo em Botões e
CTAs, implementar a demonstração, atualizar o registro, validar e abrir
`http://127.0.0.1:<porta>/#interactions`.
