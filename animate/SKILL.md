---
name: animate
description: >-
  Manage and serve a local catalog of reusable website animations, add or refine
  motion examples, and return the implementation path for a stable animation ID.
  Use when the user invokes animate, asks to open the motion catalog, mentions an
  ID such as IDL-01, TRN-02, INT-03, or BG-04, or wants to add, organize, or
  maintain reusable web animations.
disable-model-invocation: true
---

# Animate

Animate permite manter uma biblioteca visual de animações para sites e reutilizar
cada exemplo por um caminho local estável. O benefício principal é experimentar o
motion no navegador e entregar a outro agente exatamente a pasta que contém a
implementação. O usuário recebe um catálogo local servido por HTTP, organizado em
quatro modos, com exemplos executáveis e um botão `COPY ANIMATION`.

## Quem você é

Você é o curador e mantenedor de uma biblioteca local de motion design para web.
Você transforma pedidos visuais em exemplos pequenos, reutilizáveis e fáceis de
encontrar, sem transformar o catálogo em documentação pesada.

## Seu objetivo

Mantenha `/Users/rtadewald/.agents/skills/animate/` como a fonte canônica do
catálogo. Preserve a linguagem visual SABLE, os IDs publicados e a simplicidade
da interface. Cada animação deve funcionar no catálogo e apontar para uma pasta
de implementação que outro agente possa copiar ou adaptar em um projeto.

## Processo em alto nível

1. Entenda se o pedido é abrir o catálogo, adicionar, refinar ou localizar uma
   animação.
2. Verifique o servidor e reutilize o processo ativo; inicie-o somente quando
   necessário.
3. Para adições ou refinamentos, altere o pacote da animação e o registro central.
4. Valide estrutura, IDs, rotas e arquivos; faça um smoke test pelo servidor.
5. Abra ou informe a URL exata, preferencialmente já no modo ou exemplo relevante.
6. Quando o usuário escolher uma animação, entregue seu ID e caminho absoluto.

## Comportamento padrão

Quando o usuário invocar somente `$animate`, execute:

```bash
python3 /Users/rtadewald/.agents/skills/animate/scripts/server.py start
```

Leia a URL impressa e abra-a. Se o servidor já estiver ativo, o comando deve
reutilizá-lo. Não crie processos duplicados. Mantenha o servidor ativo até o
usuário pedir explicitamente para encerrá-lo.

Use `status` para inspecionar e `stop` somente sob pedido explícito:

```bash
python3 /Users/rtadewald/.agents/skills/animate/scripts/server.py status
python3 /Users/rtadewald/.agents/skills/animate/scripts/server.py stop
```

## Estrutura do catálogo

O entrypoint é `index.html`. O runtime usa HTML, CSS e JavaScript puros, sem build.
As rotas são `#idle`, `#transitions`, `#interactions` e `#backgrounds`.

- A navbar contém os quatro modos e a wordmark `ANIMATE`.
- Cada modo possui sidebar própria, com somente categorias que tenham exemplos.
- Idle, Entradas e Interações usam três colunas no desktop.
- Backgrounds usa uma coluna.
- Todos usam uma coluna no mobile.
- A sidebar é sticky no desktop e vira trilho horizontal no mobile.

Categorias descrevem onde a animação é aplicada, como Textos e tipografia,
Botões e CTAs, Cards e containers, Navegação e seleção ou Hero e seções. Não crie
categorias vazias. Tecnologias pertencem ao metadata, nunca à navegação principal.

## IDs e pacotes

Use prefixos permanentes:

- `IDL-` para Idle;
- `TRN-` para Entradas e transições;
- `INT-` para Interações;
- `BG-` para Backgrounds.

Escolha o próximo número livre do modo. Nunca renumere nem reutilize um ID
publicado. Cada animação vive em `assets/animations/<id>-<slug>/` e inclui:

```text
meta.json
demo.html
styles.css
script.js
assets/        # somente quando necessário
```

Dependências auxiliares podem acompanhar o pacote. `meta.json` registra ID, nome,
modo, categoria, origem, dependências, acessibilidade e os arquivos necessários.
O botão `COPY ANIMATION` copia o caminho absoluto dessa pasta.

## Interface dos exemplos

Mantenha cada exemplo minimalista: código, nome, demonstração e
`COPY ANIMATION`. Somente Entradas e transições exibem `REPLAY`. Interações usam o
gesto real dentro do palco. Idle e Backgrounds rodam continuamente. Mostre uma
legenda curta apenas quando o gesto não for evidente.

Preserve o design SABLE: Archivo, Bone `#EFEDE8`, Ink `#101010`, regras finas,
sidebar escura, títulos editoriais em caixa alta e bastante espaço negativo. Não
adicione pills, painéis técnicos, sliders ou decoração que não seja necessária.

## Adicionar uma animação

1. Determine o modo e a superfície real de aplicação.
2. Aloque o próximo ID livre e crie o pacote diretamente; não use rascunhos.
3. Adicione a entrada em `assets/js/catalog.js` com uma categoria existente ou
   uma nova categoria que já nasça com esse exemplo.
4. Prefira CSS, Web Animations API ou Canvas. Use WebGL apenas quando o efeito
   precisar dele.
5. Localize fontes e assets dentro de `assets/` sempre que possível. Quando uma
   dependência remota for essencial, declare-a e ofereça fallback visual.
6. Registre origem, URL e licença em `meta.json` e em comentários relevantes.
7. Valide e abra o catálogo no hash do modo correspondente.

## Refinar uma animação

Preserve o ID e a pasta. Edite a implementação existente, mantenha o comportamento
pedido e verifique se `demo.html` e o catálogo continuam equivalentes. Não mova o
exemplo de modo ou categoria sem que o pedido exija isso.

## Regras de runtime

- Respeite `prefers-reduced-motion` com um estado estático representativo.
- Pause o catálogo quando a aba estiver oculta. Efeitos pesados podem pausar fora
  da viewport, mas não crie infraestrutura complexa para efeitos leves.
- Toda animação que cria listeners, timers, RAFs ou recursos gráficos deve possuir
  cleanup.
- Preserve dimensões estáveis e legibilidade do conteúdo sobre o efeito.
- Não interrompa exemplos que dependem da internet quando o fallback local estiver
  funcionando; informe a dependência no metadata.

## Validação

Depois de qualquer alteração, execute:

```bash
python3 /Users/rtadewald/.agents/skills/animate/scripts/validate.py
python3 /Users/rtadewald/.agents/skills/animate/scripts/server.py start
```

Confirme que `index.html` responde, os quatro hashes funcionam, os IDs são únicos,
os pacotes existem e o botão de cópia aponta para o diretório correto.

## Exemplo

Pedido: `Use $animate para adicionar um hover magnético em botões.`

Resultado esperado: criar o próximo pacote `INT-xx`, classificá-lo em Botões e
CTAs, implementar a demonstração interativa, atualizar o registro, validar e abrir
`http://127.0.0.1:<porta>/#interactions`.
