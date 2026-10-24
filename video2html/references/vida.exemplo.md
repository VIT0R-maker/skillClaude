# JAR-095 · "minimal" — mapa de vida (v1)

**Imagem:** `reference.png` (JAR-095, 1536×864) · **Vídeo de referência:** `analise/video-ref.mp4` (JAR-154, Wan 3.0 Prime, 6 s)
**Leituras do vídeo:** `analise/movimento.png` + `analise/regioes.json` (mapa de movimento, por pixel) · `analise/gemini.md` (Gemini 3.8 Flash)

O vídeo é **inspiração de movimento**, não especificação: o conteúdo (textos, layout, cores) vem da imagem. O que o modelo inventou
fica de fora — no fim do vídeo o rótulo "Copywriter" vira um segundo "Storytelling" (artefato).

## Ritmo geral

Cascata de ativação ("efeito dominó"): o núcleo respira o tempo todo; a cada ~1,1 s um feixe de luz sai do anel do HUD e acende um
agente; a sequência termina no microfone do chat. Movimentos curtos, ease-out, brilho que decai devagar. Nada pisca forte.

## Elementos

| Elemento | Ocioso (do vídeo) | Interação (nossa) | Técnica (degrau) |
|---|---|---|---|
| **Robô** (r05 = olho) | Olho respira: brilho 70→100→70 % em ~2,4 s (r05 tem período 1,27 s de meia-onda). Cabeça parada. | A cabeça gira poucos graus seguindo o cursor (2.5D); o olho "acende" quando um agente é chamado. | **Three.js 2.5D**: recorte (rembg) + mapa de profundidade (GPT Image 2) deformando um plano; bloom no olho |
| **Anel do HUD** (r07, r08, r11–r20 = pedaços do anel) | Brilho do anel externo sobe e desce junto do núcleo (0–3,3 s); anéis tracejados internos parados no vídeo. | Gira devagar e sempre (anéis em velocidades e sentidos diferentes); acelera um instante quando um feixe sai. | **SVG** (círculos tracejados + filtro de brilho) |
| **Feixe → Reels Editor** (r03) | Luz percorre o conector do anel até o nó: 1,1 → 1,8 s, ease-out. | Passar o mouse num agente dispara o feixe até ele. | **SVG**: caminho + cometa (`stroke-dasharray`) com brilho, **GSAP** na linha do tempo |
| **Nó Reels Editor** | Flare ao receber o feixe (pico 1,8 s), assenta ativo em 2,2 s. | Hover: halo; clique: seleciona (fica ativo). | **SVG/CSS** (anel + halo) |
| **Feixe → Storytelling** (r02) | 2,2 → 2,8 s. O nó Storytelling **passa a ativo** (pico 3,0 s). | idem | idem |
| **Feixe → Copywriter** (r01) | 3,3 → 4,1 s, desacelerando na chegada; flare 3,8–4,8 s. | idem | idem |
| **Microfone do chat** (r04) | Pulso de luz ciano 5,1 → 5,7 s, fecha a sequência. | Clique: modo "ouvindo" (anéis pulsando + onda sonora). | **CSS** (+ canvas para a onda) |
| **Telemetria** (r06, r10, r15, r21, r22) | Micro-oscilação dos gráficos e dos tiques de tarefas (r10 com período 2,6 s). | Dados vivos: os gráficos correm, os números variam de forma plausível. | **SVG** atualizado por JS |
| **Partículas** | Pontos vermelhos/azuis dentro do anel (quase parados no vídeo). | Derivam devagar; fogem um pouco do cursor. | **Canvas 2D** |
| **Relógio** | Parado (21:47). | Hora real, com os dois pontos piscando. | JS |
| **Chat** | Parado. | Digitar + Enter: a mensagem entra, o JARVIS "digita" e responde; a resposta dispara o feixe até o agente citado. | HTML + JS (respostas de demonstração) |

## Linha do tempo ociosa (loop de 9 s)

```
0.0  núcleo respira (contínuo, 2,4 s) · anéis giram (contínuo)
1.1  feixe → Reels Editor ········ 1.8 flare ··· 2.2 assenta
2.2  feixe → Storytelling ········ 2.8 flare ··· 3.5 Storytelling fica ativo
3.3  feixe → Copywriter ·········· 4.1 flare ··· 4.8 assenta
5.1  microfone pulsa ············· 5.7
6.5  Storytelling volta a inativo (para o loop recomeçar limpo) · 9.0 recomeça
```

Interagir (mouse num agente, digitar no chat, clicar no microfone) pausa a linha do tempo ociosa; ela volta sozinha 6 s depois.
