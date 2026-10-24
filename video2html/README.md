# Video → HTML vivo

Skill que fecha o último elo do fluxo **prompt → imagem → vídeo → HTML**: pega uma imagem de UI aprovada e um vídeo dela
animada (gerado por um modelo image-to-video) e entrega um **HTML vivo e interativo** — com as animações ociosas do vídeo
reconstruídas em código e expandidas em interações reais.

**Entrada:** a imagem aprovada + um vídeo de referência (às vezes trechos de outros). No Neo Stitch, basta o código do vídeo:
`/video2html JAR-154`.
**Saída:** `projects/<slug>/impl/<código da imagem>/vN/` no Neo Stitch (ou `design-systems/<slug>/` fora dele): `index.html`,
`assets/`, o mapa de vida (`vida.md`), a leitura do vídeo (`analise/`) e a prova (`verificacao/`).

---

## O problema

O `img-to-html` resolve a imagem estática. Mas o que faz um site chamar atenção são as **animações em idle e de interação** — e
pedir "anima isso" direto para um modelo de código dá o de sempre: fade-in, hover que escurece, nada com personalidade.

Modelos de vídeo imaginam movimento muito melhor: a esfera que respira, o feixe que acende o agente, a névoa que rola. O problema
é que o vídeo **não é código**:

- ele inventa coisas (rótulos que mudam, texto que derrete) que não podem ir para a tela;
- não dá para usar o vídeo como camada — mata a interatividade;
- "parece com o vídeo" não é verificável a olho.

## A ideia da skill

O vídeo vira **inspiração de movimento**, não especificação. O conteúdo vem da imagem; do vídeo vem o que se mexe, como e quando.

1. **Ler o vídeo com dois leitores:** um mapa de movimento por pixel (onde, quanto, quando — exato e de graça) e o Gemini via
   OpenRouter (o quê e como, em linguagem natural — centavos). Junto, viram o **mapa de vida** (`vida.md`): cada elemento com o
   ocioso do vídeo, a interação que vamos inventar e a técnica.
2. **Reconstruir em camadas:** a fase estática segue o `img-to-html`, mas tudo que vai se mexer fica em camada própria — o
   personagem recortado, a arte isolada da placa de fundo, os traços que viram caminhos.
3. **Animar em código, pela escada:** CSS/SVG → Canvas 2D → WebGL/Three.js (2.5D com mapa de profundidade, esferas, shaders),
   com GSAP na coreografia. O degrau mais baixo que convence. Vídeo nunca vira asset.
4. **Expandir:** cada movimento do ocioso vira uma função que a interação também chama — passar o mouse dispara o feixe, o chat
   responde e acende o agente, a cabeça segue o cursor.
5. **Provar:** grava o HTML no Chrome, compara o movimento com o vídeo região por região (e pede uma segunda opinião ao Gemini).
   Um modo `?estatico` congela a página no estado exato da imagem para medir a fidelidade.

---

## Pipeline

```
0. pasta + imagem + vídeo(s)
1. leitura do vídeo → analise/ + vida.md                        → [aprova o mapa de vida]
2. fase estática (img-to-html, com o que vive em camadas)       → [aprova ?estatico × imagem]
3. fase de vida (app.js + módulos WebGL)
4. verificação (gravar → comparar com o vídeo) + demo           → [aprova]
5. sugerir peças para o catálogo do animate
```

Tem também o **modo autônomo**: passa direto pelos gates e registra tudo nos arquivos.

## Scripts

Em `scripts/`, rodam com `uv run` (dependências inline) e usam o Chrome instalado (Playwright `channel="chrome"`):

| Script | Para quê |
|---|---|
| `mapa_movimento.py` | regiões que se mexem, curvas de atividade, picos, período, quadros-chave |
| `analisar_video.py` | descrição do movimento pelo Gemini 3.8 Flash; `--comparar` para ref × HTML |
| `gravar.py` | foto ou vídeo da página (screencast do Chrome), com `--antes` para disparar JS |
| `comparar_quadro.py` | fase estática: diferença de luminância por região + zooms |
| `comparar_movimento.py` | fase de vida: regiões vivas paradas no HTML, lado a lado, página de comparação |
| `isolar_camada.py` | arte isolada da placa (inverso do `screen`; `--modo duplo` com `multiply` para fundos claros) |
| `caminhos.py` | esqueleto dos traços → polilinhas do centro até as pontas (faíscas e sinais andam pelo desenho) |

**Requisitos:** `uv`, `ffmpeg`, Google Chrome, `OPENROUTER_API_KEY` (ambiente, `.env` ou `~/.env`). Opcional: `rembg` via `uvx`
para recortes (o modelo BiRefNet tem ~1 GB na primeira vez).

## Exemplos

Os três primeiros resultados vivem no Neo Stitch (`21-neo-stitch/projects/jarvisos/impl/`):

| | Vídeo | O desafio | Como ficou vivo |
|---|---|---|---|
| `JAR-095/v1` | JAR-154 (Wan 3.0 Prime) | um personagem (robô) | 2.5D com mapa de profundidade, bloom no olho, feixes SVG até os agentes |
| `JAR-115/v1` | JAR-170 (Hailuo 3 Max) | um núcleo orgânico (neurônio) | camada de traços isolada, faíscas sobre o esqueleto dos dendritos, onda de cor |
| `JAR-043/v2` | JAR-142 (Hailuo 3) | fundo claro, partindo de um HTML estático | camadas multiply/screen, esfera 3D com a textura da imagem, tinta e reflexo vivos — 100% autônoma |

Fidelidade parada entre 3,2 e 6,0/255 de diferença média para a imagem; em movimento, nenhuma região viva do vídeo fica parada
no HTML além de artefatos do próprio vídeo. Custo de cada rodada: ~$0,05–0,10.

---

## Skills vizinhas

- [`img-to-html`](../img-to-html) — a fase estática
- [`openrouter-img`](../openrouter-img) — placas de fundo, mapas de profundidade
- [`animate`](../animate) — catálogo para onde as peças boas voltam

Detalhe operacional (princípios, receitas, armadilhas já pagas): [`SKILL.md`](./SKILL.md).
