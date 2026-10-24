---
name: video2html
description: >-
  Transforma uma imagem de UI aprovada + um vídeo de referência (gerado por image-to-video) num HTML vivo e
  interativo: lê o movimento do vídeo (mapa de pixels + Gemini), escreve o mapa de vida, reconstrói a tela em
  camadas (img-to-html) e anima tudo em código — CSS/SVG, Canvas, Three.js, GSAP —, verificando o resultado contra
  o vídeo. Use when the user mentions video2html or asks to turn a video/animated mock into a living HTML.
disable-model-invocation: true
---

# Vídeo → HTML vivo

## O que é

O img-to-html recria uma imagem como HTML estático. O video2html dá **vida** a esse HTML: animações ociosas e de interação
inspiradas num vídeo de referência (Wan, Hailuo, Seedance… a partir da própria imagem).

**Entradas:** a imagem aprovada + 1 vídeo de referência (às vezes trechos de outros: "os feixes do JAR-154, a seleção do
JAR-155"). No Neo Stitch, códigos de nó: `JAR-154` (vídeo) → a imagem é a 1ª entrada do pedido de vídeo dele.

**Saída:** `projects/<slug>/impl/<código da imagem>/vN/` no Neo Stitch (a imagem ganha o 🔥 sozinha), ou
`design-systems/<slug>/` fora dele. Exemplos completos: **`21-neo-stitch/projects/jarvisos/impl/JAR-095/v1/`** (personagem: robô
2.5D, feixes em SVG), **`…/impl/JAR-115/v1/`** (núcleo orgânico: camada de traços, faíscas sobre o esqueleto, onda de cor) e
**`…/impl/JAR-043/v2/`** (fundo claro, partindo da v1 estática: camadas multiply/screen, esfera 3D, tinta e reflexo vivos — feita
de ponta a ponta no modo autônomo).

## Princípios (decididos com o Rodrigo)

1. **O vídeo é inspiração de movimento, não especificação.** Conteúdo (textos, layout, cores) vem da imagem; o vídeo diz o que se
   mexe, como e quando. O que o modelo de vídeo inventou (rótulo que muda, texto que derrete, objeto novo) **não entra**.
2. **Expandir:** a sequência do vídeo vira o estado ocioso, e os mesmos movimentos ganham gatilhos reais (hover, clique, chat,
   microfone). Cada animação é uma função que a linha do tempo ociosa e a interação chamam.
3. **Tudo que se mexe é código.** Escada de técnicas, o degrau mais baixo que convence:
   **CSS/SVG** (brilho, pulso, rotação, traço percorrendo caminho) → **Canvas 2D** (partículas, ondas, dados) →
   **WebGL/Three.js** (2.5D com mapa de profundidade, 3D procedural, shaders, bloom). **Nunca vídeo como asset** (mata a
   interatividade). Imagens geradas só para o que é **estático** (fundos, placas).
4. Personagens/objetos vivos: camada 2D com efeitos (padrão) · **2.5D** quando precisa reagir em volume (olhar o cursor) ·
   **3D procedural** para núcleos abstratos (orbes, neurônios, esferas) · modelo 3D (image-to-3D) só se o Rodrigo pedir.
5. **Bibliotecas:** GSAP 3 e Three.js via CDN com versão fixa (jsDelivr `+esm` para módulos). Outras caso a caso, no plano.
6. Desempenho e acessibilidade **não** são prioridade agora (demos num computador bom).

## Pipeline

```
0. pasta + referência + vídeo(s)
1. leitura do vídeo → analise/ + vida.md (mapa de vida)            → [gate 1: mapa de vida]
2. fase estática (img-to-html, com o que vive em camadas próprias) → [gate 2: ?estatico vs imagem]
3. fase de vida (app.js + módulos de WebGL)
4. verificação (gravar → comparar com o vídeo)                     → [gate 3: lado a lado + interações]
5. sugerir peças para o catálogo do animate
```

Gates: mostre, pergunte e **pare** (como no img-to-html). Se o Rodrigo pedir **modo autônomo**, siga direto e registre tudo nos
arquivos. Se um elemento empacar (ex.: o personagem), pare só nele e mostre as opções da escada.

Scripts em `~/.agents/skills/video2html/scripts/` (rodam com `uv run`, dependências inline; Chrome do sistema via Playwright):

| Script | Para quê |
|---|---|
| `mapa_movimento.py <video> <pasta>` | ONDE/QUANTO/QUANDO: regiões que se mexem, curvas, picos, período, quadros-chave |
| `analisar_video.py <video> <saida.md> [--regioes regioes.json]` | O QUÊ/COMO: Gemini 3.8 Flash via OpenRouter (~$0,01) |
| `analisar_video.py <ref> <saida.md> --comparar <html.mp4>` | diferenças de ritmo/caráter (desacelera 8×) |
| `gravar.py <url> <saida.mp4\|.png> [--foto] [--antes JS]` | grava/fotografa a página (screencast do Chrome) |
| `comparar_quadro.py <ref.png> <foto.png> <pasta> [--regioes]` | fase estática: diferença de luminância por região + zooms |
| `comparar_movimento.py <ref.mp4> <html.mp4> <pasta>` | fase de vida: região viva parada no HTML? + lado-a-lado.mp4 + comparar.html |
| `isolar_camada.py <ref.png> <placa.png> <saida.png> [--excluir]` | camada de traços claros (inverso do *screen*): placa + camada = a imagem |
| `caminhos.py <mascara.png> <saida.json> --centro x,y [--alvos]` | esqueleto dos traços → polilinhas do centro até as pontas e alvos |

### 0. Pasta

`vN/reference.png` (a imagem), `vN/analise/video-ref.mp4` (o vídeo; trechos de outros como `video-<código>.mp4`). Sirva por http
(o servidor do Neo Stitch já serve `projects/`): texturas WebGL não carregam de `file://`.

### 1. Leitura do vídeo → mapa de vida

1. `uv run mapa_movimento.py analise/video-ref.mp4 analise` — abra `movimento.png` e `quadros/folha.jpg`.
2. `uv run analisar_video.py analise/video-ref.mp4 analise/gemini.md` — o Gemini descreve cada movimento, tempos e artefatos.
3. Junte as duas leituras olhando os quadros: agrupe regiões (o anel em pedaços vira "anel do HUD"), confirme tempos, marque
   artefatos. Escreva **`vida.md`** (modelo: o do JAR-095): ritmo geral · tabela **elemento | ocioso (do vídeo) | interação
   (nossa) | técnica (degrau)** · linha do tempo ociosa em texto · como a interação pausa e retoma o ocioso.
4. **Gate 1.**

### 2. Fase estática (img-to-html com camadas)

Siga o `img-to-html` (wireframe tipado, plano, fundo → componentes → assets → revisão), com uma regra a mais: **o que o
`vida.md` diz que se mexe nunca fica "assado" no fundo** — vira camada própria. Receitas que funcionaram:

- **Medir em vez de chutar:** ajuste geometria por análise de imagem (centro/raio de um arco por mínimos quadrados sobre os pontos,
  blobs claros para nós) e calibre textos pela **caixa de tinta** (ref × foto, deslocamento e razão de largura) até ±2 px.
- **Gere o HTML por um script de construção** (coordenadas dos itens repetidos num lugar só; o HTML continua estático).
- **Personagem/objeto:** recorte pixel-exato com `uvx --python 3.12 --from "rembg[cpu,cli]" rembg i -m birefnet-general crop.png
  saida.png` (local; o modelo tem ~1 GB na 1ª vez) + **placa** do fundo sem ele: GPT Image 2 apagando o objeto do recorte da
  referência (`openrouter-img`, `--aspect-ratio auto` ou um da lista; 9:10 não existe). Máscara radial na placa esconde o que vazar.
- Trama decorativa estática (grade, marcas, glifos) = a placa; por cima, em SVG, só o que vive.
- **Arte luminosa fina** (neurônio, circuito, filamentos, molduras finas) — onde a segmentação não recorta bem: placa sem nada
  (GPT Image 2) + `isolar_camada.py` (camada em `mix-blend-mode: screen`; exclua só o que vira HTML/SVG — textos, anéis,
  interior de gráficos — e deixe molduras estáticas e o tom do fundo virem da própria imagem). Para o que "anda pelo desenho"
  (faíscas, sinais, pulsos), rode `caminhos.py` numa máscara sem chão/régua/molduras (corte-as na máscara antes) e anime sobre
  o JSON. Uma 2ª cópia da camada, tingida (`sepia + saturate + hue-rotate`) e revelada por máscara radial que cresce, faz a onda
  de cor que se espalha; `mix-blend-mode: saturation` sobre a camada tira cor de um trecho (o núcleo "esfria").
- **Fundo claro** (tinta sobre papel): `isolar_camada.py --modo duplo --limiar 0` → `-escura.png` (`multiply`) + `-clara.png`
  (`screen`); com limiar 0, placa × escura + clara reproduz o fundo inteiro (sem isso, diferenças de tom da placa aparecem cruas).
  Divida a escura por máscaras **binárias complementares** (esfera / reflexo abaixo do horizonte / resto) — bordas suaves nas duas
  viram um anel claro.
- **Partindo de um HTML estático existente** (`impl/<código>/v1`): copie a v1 para vN, troque só o fundo único pelas camadas e
  acrescente os feixes/IDs; a calibração de textos, telemetria e chat da v1 continua valendo (JAR-043: 2,9 → 3,3/255).
- **Objeto redondo vivo** (esfera, planeta, orbe): `SphereGeometry` com **projeção frontal** da textura (uv = posição/(2R+4) + 0,5,
  fixo no vértice: gira junto), câmera **ortográfica** (perspectiva amplia o centro ~14 %), `camera.position` com meio pixel
  (texel = pixel, sem desfoque parado), textura **estendida além da borda** com a cor da borda (girar nunca revela branco) e sem
  linhas/objetos que ficam parados por cima (clone a área — senão "giram junto"). Giro pequeno (≤ 7°) se a imagem tinha algo
  cobrindo parte do objeto.
- Tremor/água em arte estática: `feTurbulence` + `feDisplacementMap` (escala 2–8 px) com `seed`/`baseFrequency` mudando por JS;
  desligue no `?estatico`.
- Ícones estáticos difíceis: recorte direto da referência.
- Todo HTML tem o modo **`?estatico`**: congela no estado exato da imagem (linha do tempo pausada, relógio da imagem, sem dados
  vivos). Fotografe com `gravar.py <url>?estatico foto.png --foto` e compare com `comparar_quadro.py`. JAR-095 chegou a 4,3/255.
- **Gate 2.**

### 3. Fase de vida

- `assets/app.js` (GSAP): funções por movimento (ex.: `feixe(id)`, `flare(id)`, `ativar(id)`), a **linha do tempo ociosa** com
  `repeat: -1` exposta em `window.vida = { ocioso }`, interações que chamam as mesmas funções, e
  `interagiu()` que pausa o ocioso e o retoma ~6 s depois.
- Módulos WebGL em arquivos próprios (`assets/robo.js` etc.), conversando com o app por eventos (`jarvis:pulso`).
- **2.5D:** mapa de profundidade do recorte pelo GPT Image 2 ("depth map aligned pixel-for-pixel… white = closest… smooth, no
  details") → `PlaneGeometry` subdividido + `ShaderMaterial` que desloca z pelo mapa; giro ≤ ~9° (mais que isso deforma).

**Armadilhas já pagas (não repetir):**
- `ShaderMaterial` não converte espaço de cor: textura com `NoColorSpace` + `renderer.outputColorSpace = LinearSRGBColorSpace` →
  pixels iguais aos da imagem. E devolva cor **pré-multiplicada** (`rgb * a`), senão o fundo do recorte vaza como um retângulo.
- O `UnrealBloomPass` **descarta o alfa**: renderize o objeto num canvas com transparência e o brilho em **outro canvas** (só as
  partes claras, fundo preto) com `mix-blend-mode: screen` + máscara radial. Sem `OutputPass` nessa camada (clareia tudo).
- GSAP em SVG: não ponha `transform-box`/`transform-origin` no CSS de elementos que o GSAP escala — ele escala a partir de (0,0).
  Prefira animar `attr: { r }` em círculos.
- **Contraste:** o caminho de um feixe precisa estar **fraco em repouso**; se a linha já brilha, a luz passando não se lê.
  A luz "enche" a linha (dash), segura acesa ~1,5 s e decai — não um cometa curto.
- A linha do tempo ociosa **reinicia o estado no tempo 0** (o que ela ativou no meio, ela desativa), e cada disparo encerra o
  anterior do mesmo elemento (`gsap.killTweensOf`).
- `page.evaluate` que devolve objeto do GSAP trava o Playwright — o `gravar.py --antes` já embrulha o JS.
- Movimento "global" do vídeo (a rede inteira acende, não só o núcleo) aparece como muitas regiões paradas no comparador: some
  quando a camada inteira participa (onda de cor, brilho da camada no pico), não só as faíscas.
- Antes de gravar, abra a página e leia o console: um erro de JS (ex.: nome repetido) faz `vida` não existir e o `--antes` falhar.

### 4. Verificação

1. `uv run gravar.py "<url>" verificacao/html.mp4 --segundos <loop> --antes "vida.ocioso.restart()"` (começa junto com o loop).
2. `uv run comparar_movimento.py analise/video-ref.mp4 verificacao/html.mp4 verificacao` — nenhuma região viva da referência pode
   ficar `PARADO`, **exceto artefatos** (texto derretendo, rótulo mudando — confira no `gemini.md` e nos quadros e anote no README);
   `fraco` pede atenção (o HTML tem loop maior e vida própria, então ser menor é normal).
3. `uv run analisar_video.py analise/video-ref.mp4 verificacao/gemini-comparacao.md --comparar verificacao/html.mp4` — leia como
   segunda opinião (ele erra eventos curtos; confira nos quadros antes de mexer).
4. Grave uma **demo das interações** com `--antes` disparando eventos (`mouseenter` nos agentes, `requestSubmit` no chat, cliques)
   e `PointerEvent('pointermove')` para o cursor.
5. `README.md` da versão: o que vive, como foi feito, números, custos, ressalvas. **Gate 3.**

### 5. Catálogo

Sugira as peças reaproveitáveis (feixe de luz em conector, anel de HUD que respira, olho com bloom, 2.5D por profundidade) como
itens do `animate` (CMP-/BG-); exporte só as que o Rodrigo escolher.

## Layout da pasta

```
vN/
  reference.png  vida.md  plano.md  wireframe.txt (se houver)  README.md
  index.html                       # ?estatico congela no estado da imagem
  assets/  styles.css  app.js  <modulos>.js  imagens estáticas  crops/
  analise/  video-ref.mp4  movimento.png  regioes.json  curvas.png  quadros/  gemini.md
  verificacao/  html.mp4  video-ref.mp4  lado-a-lado.mp4  mapas.jpg  comparar.html  movimento.txt  gemini-comparacao.md  demo-interacao.mp4
```

## Não fazer

- Copiar o vídeo ao pé da letra (inclusive os erros dele) ou usar vídeo/GIF como camada.
- Assar no fundo algo que o `vida.md` anima.
- Pular o `?estatico` ou a gravação de verificação ("parece certo" não vale).
- Confiar só no Gemini para tempo fino (o tempo vem do mapa de movimento).
