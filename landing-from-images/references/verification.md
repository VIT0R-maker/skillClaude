# Verificação autônoma

## Evidências diferentes

Distinga quatro resultados: renderização/captura executada, testes funcionais, comparação visual com as
referências do usuário e reconhecimento da skill pelo Claude Code. Nenhum deles prova os outros. Registre
comandos, ambiente, navegador usado, larguras, resultados, correções e limitações em
`.work/verification/review.md`, em quatro seções: **1. Renderização e capturas**, **2. Testes funcionais**,
**3. Avaliação visual**, **4. Aproximações e limitações**.

O kit Node coleta evidências e verifica condições objetivas. Ele não sabe se uma foto representa o assunto
correto nem se a página reproduz a referência. O agente abre as capturas e as referências e conclui essa
avaliação.

## Comandos do kit

Prepare uma vez (veja o [README](../README.md#preparar-o-kit-em-um-projeto)):
`node "<pasta da skill>/scripts/setup-tools.mjs" --project "<projeto>"`. Na raiz do projeto, em CMD ou
PowerShell, com caminhos entre aspas:

```text
node .landing-tools/inventory.mjs --out .work/reference-map.json ".work/references/01.png" ".work/references/02.png"
node .landing-tools/crop.mjs --source ".work/references/01.png" --out assets/images/foto.webp --rect 740,95,747,755 --log .work/crops.json
node .landing-tools/verify.mjs --root . --out .work/verification --desktop-width 1487 --scale 1 --config .work/verify-config.json
node .landing-tools/compare.mjs --reference ".work/references/01.png" --capture .work/verification/page-1487.png --ref-rect 0,0,1487,1058 --cap-rect 0,0,1487,1058 --out .work/verification/compare --name hero --log .work/verification/compare.json
node .landing-tools/serve.mjs --root . --port 4173
```

`inventory` mede imagens; o agente completa ordem, seções e correspondências. As coordenadas de `crop` e
`compare` são exemplos, a substituir pelas medidas reais (na orientação em que a imagem é vista). `serve` serve
a pasta em `127.0.0.1` e fica ativo: rode-o em segundo plano ou deixe a prévia a cargo do `verify`, que sobe e
encerra o próprio servidor.

**Navegador.** O kit usa, nesta ordem, `LANDING_BROWSER_PATH`, o Chromium do Playwright, o Microsoft Edge e o
Google Chrome instalados. No Windows o Edge já existe, então o download do Chromium é opcional. `report.json`
registra qual navegador foi usado. Sem nenhum navegador (`setup-tools` sai com código 3), nenhuma captura ou
teste automático rodou: relate isso, não os resultados que não existem.

**Configuração.** `verify-config.json` informa os seletores reais do menu
(`{"menu": {"toggle": "#menu-toggle", "panel": "#site-nav", "breakpoint": 900, "durationMs": 320}}`, com
`"close"` quando o fechamento é um botão interno) e as regiões a capturar
(`"regions": [{"name": "hero", "selector": "#inicio"}]`). Sem `menu`, ele aparece como não testado.

## Matriz e escala

Use a largura CSS da referência desktop, justificada no mapa de entrada; acrescente uma intermediária (768 px
como ponto inicial), 390 e 360 px. Ajuste a intermediária se ela não exercitar uma transição do projeto.

Uma imagem de 2880 px pode corresponder a 1440 CSS px em escala 2, e uma de 1487 px pode ser um viewport de
1487 px em escala 1. Confirme por metadados, contexto ou hipótese registrada: a largura da imagem é um dado; o
viewport é uma decisão. Não use 1440 para todas as referências. Capturas divididas podem ter áreas sobrepostas e
deslocamentos verticais: compare seções equivalentes.

## Captura estável

Antes de capturar: aguarde `document.fonts.ready` e confira erros de fonte; percorra a página para disparar
imagens lazy e revelações; aguarde as imagens e suas dimensões naturais; estabilize animações sem usar CSS de teste
que esconda conteúdo invisível por bug; volte ao topo e remova hover acidental. O `verify` faz essa preparação;
confira no navegador os backgrounds e componentes que ele não cobre. Timeout ou teste omitido não é aprovação.

## Comparação visual

Abra **as referências do usuário e as capturas do site**, no todo e por região. O `compare.mjs` gera um lado a
lado (referência à esquerda, captura à direita) e um mapa de diferença, e lista as três células mais diferentes
de uma grade: use-o para localizar onde olhar. Ele é auxiliar (`fidelityEstablished` é sempre `false`): quem
conclui é o agente, olhando as imagens.

| Aspecto | Critério |
| --- | --- |
| Estrutura | Seções na ordem correta, sem duplicações de recortes |
| Conteúdo | Copy preservada, lacunas declaradas, sem informação inventada |
| Composição | Proporções, alinhamentos e densidade coerentes |
| Tipografia | Família/peso justificados, quebras e entrelinhas próximas |
| Assets | Foto correta, assunto preservado e sem UI embutida no crop |
| Superfícies | Fundos, bordas, raios, sombras e espaços comparados |
| Mobile | Hierarquia preservada, legibilidade, navegação e áreas de toque |

Diferença de pixels é auxiliar: rasterização e antialiasing divergem. Não altere referências, baselines ou
tolerâncias para ocultar erro. Uma screenshot produzida pelo site não é sua própria referência de fidelidade.

## Comportamento e movimento

Reabra uma página com `reducedMotion: 'no-preference'` e sem estilos de congelamento. Siga também os casos de
[movimento e menu](motion-and-menu.md).

- Menu: abertura e fechamento graduais, clique rápido e reversão, ícone e overlay, Escape, âncora, foco devolvido,
  `aria-expanded` e transição para desktop.
- Teclado: Tab/Shift+Tab, ordem de foco, foco visível, controle oculto fora do ciclo; modal contém foco.
- Navegação: IDs de âncoras existentes, cabeçalho sem cobrir destino, CTAs corretos.
- Formulários: obrigatórios, formato, mensagens e estados reais de erro e sucesso. Intercepte integrações.
- Movimento reduzido: conteúdo imediatamente acessível, sem deslocamento forçado.
- Falha de JS ou de animação: conteúdo principal continua visível e navegável.
- Layout: nenhum overflow horizontal, controle obstruído ou colisão (distinga sobreposição decorativa).
- Recursos: imagens carregadas, fontes corretas, sem erros relevantes de JS ou rede.

O kit bloqueia requisições externas e métodos de envio, não submete formulários nem abre WhatsApp. Inspecione
destinos sem executar ações comerciais reais.

### Testes específicos do projeto

O kit genérico não substitui testes de galeria/lightbox, formulário, seleção de serviço, mensagem preparada ou
qualquer controle próprio. Escreva-os com `node:test` reutilizando o contexto protegido do kit, que já bloqueia
rede externa e envios:

```js
import { launchBrowser, guardedContext, settleFrames } from './.landing-tools/lib/browser.mjs';
import { startServer } from './.landing-tools/serve.mjs';
```

### Armadilhas de timing (aprendidas em verificações reais)

- **Não meça uma transição amostrando um instante fixo** ("40 ms depois do clique"). Se o navegador atrasa a
  amostra (carga, renderização por software), a transição já terminou e o teste reprova um menu correto. Observe
  `transitionrun`/`animationstart` e os quadros desde antes da ativação, como o `verify` faz, e aguarde com
  `waitForFunction`. Antes da primeira interação, use `settleFrames(page)`: sem um primeiro quadro não há estilo
  anterior de onde a transição possa partir.
- **O evento `close` de um `<dialog>` é assíncrono.** `open` vira `false` na hora, mas o desbloqueio de rolagem e
  outros efeitos em `close` ocorrem depois. Use `waitForFunction` para a condição final em vez de asserção imediata.
- **Um teste que nunca falha não prova nada.** Inclua um caso negativo (menu sem transição, imagem ausente,
  overflow) para confirmar que o verificador reprova o que deve.

## Correção, aceite e entrega

Corrija primeiro estrutura e conteúdo, depois composição, fontes e assets, depois detalhes. Repita as verificações
afetadas. Encerre quando a comparação estiver satisfatória, as larguras-alvo funcionarem, os controles previstos
tiverem comportamento verificado e não restarem erros relevantes. Registre limitações reais sem refinar
indefinidamente.

Exemplo de relato: "Capturas a 1487, 768, 390 e 360 px no Microsoft Edge; menu testado com movimento e movimento
reduzido; composição comparada às quatro referências. A fonte foi aproximada e o CTA aguarda número. Nenhum
formulário foi enviado."
