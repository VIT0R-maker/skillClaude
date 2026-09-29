# Animate — Especificação

## Visão

Animate é uma skill e um catálogo local de animações reutilizáveis para sites.
Ela permite navegar pelos exemplos em uma interface visual, evoluir a biblioteca
ao longo do tempo e copiar o caminho de uma implementação para que outro agente a
integre em um projeto.

O catálogo usa a linguagem visual do design system SABLE, mas a identidade exibida
é `ANIMATE`.

## Responsabilidades

A skill é responsável por:

- iniciar, reutilizar e manter o servidor local;
- abrir o catálogo quando invocada sem outro pedido;
- adicionar, refinar, classificar e validar animações;
- preservar IDs e caminhos publicados;
- fornecer o caminho absoluto de qualquer implementação.

A integração da animação em outro projeto pode ser feita por outro agente usando o
caminho copiado. O catálogo não precisa conhecer antecipadamente a stack de destino.

## Modos

O catálogo possui quatro modos na navbar:

1. **Idle** — movimento contínuo em elementos com a página parada.
2. **Entradas e transições** — aparição no carregamento, na viewport ou em mudança
   de estado.
3. **Interações** — respostas a hover, clique, foco, drag, seleção e scroll.
4. **Backgrounds** — movimento ambiental aplicado ao fundo de uma superfície.

As rotas canônicas são `#idle`, `#transitions`, `#interactions` e `#backgrounds`.

## Navegação e categorias

Cada modo possui uma sidebar inspirada na aba Components do SABLE.

- As categorias descrevem **onde** a animação é aplicada, não a tecnologia.
- Apenas categorias com exemplos são exibidas.
- A taxonomia pode crescer conforme novas animações forem adicionadas.
- No desktop, a sidebar é escura e sticky.
- No mobile, vira um trilho horizontal rolável abaixo da navbar.

Vocabulário possível para os três primeiros modos:

- Textos e tipografia;
- Botões e CTAs;
- Cards e itens de lista;
- Navegação e menus;
- Formulários e controles;
- Painéis e overlays;
- Mídia e produto;
- Ícones e marca;
- Seções e layout;
- Feedback e status.

Vocabulário possível para Backgrounds:

- Página inteira;
- Hero e seções;
- Cards e painéis;
- Mídia e máscaras;
- Overlays decorativos.

Essas listas orientam novas classificações, mas não criam seções antecipadamente.

## Layout

- Navbar SABLE com quatro modos e wordmark central `ANIMATE`.
- Área principal Bone `#EFEDE8` e sidebar Ink `#101010`.
- Tipografia Archivo variável.
- Títulos editoriais em caixa alta, regras finas e bastante espaço negativo.
- Idle, Entradas e Interações: grid de três colunas no desktop.
- Backgrounds: uma coluna.
- Mobile: uma coluna para todos.

## Exemplo visual

Cada item mostra somente:

- código estável e nome;
- demonstração ao vivo;
- botão `COPY ANIMATION`;
- botão `REPLAY` apenas em Entradas e transições.

Idle e Backgrounds rodam continuamente. Interações respondem ao gesto real. Uma
legenda discreta pode instruir `arraste`, `passe o cursor` ou outro gesto essencial.

Descrição, dependências, origem e acessibilidade ficam em `meta.json`.

## IDs

Os prefixos são:

| Modo | Prefixo | Exemplo |
| --- | --- | --- |
| Idle | `IDL-` | `IDL-01` |
| Entradas e transições | `TRN-` | `TRN-04` |
| Interações | `INT-` | `INT-03` |
| Backgrounds | `BG-` | `BG-09` |

IDs publicados nunca são renumerados nem reutilizados. Uma animação refinada
preserva seu ID.

## Estrutura técnica

```text
animate/
├── SKILL.md
├── SPECS.md
├── index.html
├── agents/
│   └── openai.yaml
├── assets/
│   ├── animations/
│   │   └── <id>-<slug>/
│   │       ├── meta.json
│   │       ├── demo.html
│   │       ├── styles.css
│   │       ├── script.js
│   │       └── assets/
│   ├── css/
│   ├── js/
│   └── runtime/
└── scripts/
    ├── server.py
    └── validate.py
```

O runtime é HTML, CSS e JavaScript puro, sem build. O catálogo é servido por HTTP
local porque módulos ES, `fetch`, Canvas e WebGL dependem de uma origem.

## Servidor

- Endereço padrão: `127.0.0.1:4173`.
- Se a porta estiver ocupada, usar a próxima livre.
- Reutilizar o servidor ativo.
- Não expor o servidor na rede local.
- Manter o processo ativo até pedido explícito de encerramento.
- Registrar estado em `/tmp/animate-server.json`.

## Pacote de animação

`meta.json` deve registrar pelo menos:

```json
{
  "id": "INT-01",
  "name": "Glass shimmer CTA",
  "mode": "interactions",
  "category": "Botões e CTAs",
  "entry": "demo.html",
  "files": ["demo.html", "styles.css", "script.js"],
  "dependencies": [],
  "source": { "name": "Aura", "url": "...", "license": "verificar origem" },
  "accessibility": { "reducedMotion": true }
}
```

O botão `COPY ANIMATION` copia o caminho absoluto da pasta, não o código nem uma
instrução composta.

## Conteúdo inicial

A v0 reaproveita os 22 exemplos funcionais do antigo `motion-lab`:

- 2 Idle;
- 4 Entradas e transições;
- 4 Interações;
- 12 Backgrounds.

As implementações existentes são preservadas e a interface antiga é substituída
pelo shell SABLE. Dependências remotas permanecem apenas onde já são essenciais,
sempre com metadata e fallback quando disponível.

## Performance e acessibilidade

- Respeitar `prefers-reduced-motion`.
- Pausar efeitos quando a aba ficar oculta.
- Efeitos pesados podem pausar fora da viewport.
- Não adicionar uma camada universal complexa apenas para efeitos leves.
- Recursos gráficos, listeners, timers e RAFs devem possuir cleanup.

## Fluxos

### Abrir

1. Consultar o estado do servidor.
2. Reutilizar ou iniciar.
3. Abrir a URL do catálogo.

### Adicionar

1. Escolher modo e superfície de aplicação.
2. Alocar o próximo ID livre.
3. Criar o pacote diretamente, sem rascunho.
4. Registrar no catálogo.
5. Validar e abrir no modo correspondente.

### Refinar

1. Resolver o ID.
2. Editar o pacote existente.
3. Preservar ID e caminho.
4. Validar e recarregar o catálogo.

### Compartilhar

1. Localizar o exemplo no catálogo.
2. Clicar em `COPY ANIMATION`.
3. Colar o caminho para o agente que fará a integração.
