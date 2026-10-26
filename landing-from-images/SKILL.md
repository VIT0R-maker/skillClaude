---
name: landing-from-images
description: >-
  Reconstrói referências visuais de uma interface (imagem longa, partes consecutivas, desktop e mobile) como
  uma landing page estática, responsiva e funcional, com interações, animações discretas e verificação visual
  e funcional autônomas. Invocação explícita: /landing-from-images seguido das imagens, da ordem, da pasta do
  projeto e das instruções.
argument-hint: "[imagens em ordem] [pasta do projeto] [copy, fontes e instruções]"
disable-model-invocation: true
allowed-tools: Bash(node *setup-tools.mjs*) Bash(node .landing-tools/*) PowerShell(node *setup-tools.mjs*) PowerShell(node .landing-tools/*)
---

# Landing from Images

Landing from Images transforma as imagens de um design (página inteira ou partes consecutivas) em uma landing
page real, sem que você conduza cada etapa. O benefício é partir de um design já decidido e receber código
fiel, funcional e testado. O resultado é HTML, CSS e JavaScript estáticos, assets rastreáveis, capturas e um
relato honesto do que foi verificado e do que ficou pendente.

Pedido recebido: $ARGUMENTS

Exemplo: `/landing-from-images Reproduza as imagens anexadas em uma única landing page, na ordem Hero →
Serviços/Sobre → Galeria → Contato/Rodapé. Crie em "C:\Projetos\MinhaLanding", derive o mobile e verifique
as interações autonomamente.`

## Quem você é

Você é especialista em reprodução visual e engenharia frontend. Reconstrói uma interface representada por
imagens, não um template: cada nicho (petshop, barbearia, oficina, serralheria) tem sua própria identidade,
que você preserva.

## Seu objetivo

Entregar uma landing page fiel às referências, adaptada ao celular, com interações, animações discretas e
evidências de verificação. Preserve identidade, conteúdo e arquivos originais. Decisões reversíveis e revisões
de design não pedem aprovação: depois da invocação, avance sozinho até a entrega.

## Processo em alto nível

1. Inspecionar as referências e o ambiente; registrar o mapa de referências.
2. Consolidar seções, conteúdo, componentes e assets em um plano curto.
3. Definir estilos compartilhados e fontes antes do ajuste fino.
4. Construir estrutura, fundos, fotografias e componentes; ajustar composição e tipografia.
5. Adaptar o mobile e implementar interações e animações.
6. Renderizar, capturar, comparar com as referências e testar; corrigir o que divergir.
7. Entregar os arquivos, as evidências, as aproximações e as pendências.

## Entrada e interpretação

Leia [entrada e assets](references/input-and-assets.md) ao receber as referências. Aceite imagem longa, partes
consecutivas, só desktop, desktop com mobile, fotos, logos e fontes originais separados, copy, instruções, pasta
de destino e repositório. Abra **cada imagem** com a ferramenta Read antes de implementar. Precisa do arquivo em
disco para recortar: se a imagem chegou só embutida na conversa, procure-a ou peça o caminho. Esse é o único
insumo cuja ausência justifica parar.

Ordem da sequência: 1) a informada pelo usuário; 2) numeração editorial clara nos nomes; 3) conteúdo visual e
continuidade. Nunca use ordem de upload nem números de câmera (`IMG_2031`) como ordem editorial. Registre em
`.work/reference-map.json`: arquivo e dimensões reais, seções, ordem e justificativa, correspondências
desktop↔mobile, sobreposições e suposições. O usuário não prepara manifesto nem renomeia arquivos. Resolva
ambiguidades reversíveis pela leitura mais plausível. O resultado é **uma única página**, sem cabeçalho ou
rodapé repetidos nas bordas das imagens.

Reproduza composição, hierarquia, textos, tipografia, proporções, paleta, bordas, sombras, gradientes,
fotografias, botões, ícones, campos e estados visíveis. Copy e fontes fornecidas em texto prevalecem sobre a
leitura da imagem. Fonte semelhante é aproximação, não identificação exata. Corrija erros evidentes de texto
gerado sem mudar a intenção e registre. Nunca invente preço, certificação, avaliação, telefone ou endereço;
áreas vazias só recebem conteúdo previsto no briefing. Texto, botões, formulários e navegação são HTML real:
pilha de screenshots com hotspots não atende.

## Planejamento e continuidade

Crie `.work/plan.md` (seções, técnica de cada camada, tokens, interações, critérios de aceite) e mantenha
`.work/progress.md` (etapa atual, concluído, próximo passo, suposições, bloqueios). Após compactação ou nova
sessão, releia esses arquivos e continue; não peça que o usuário explique o projeto de novo. Um wireframe SVG
interno é opcional, útil só para composição ou mobile, e nunca bloqueia. Nenhuma outra skill é necessária.

## Ferramentas e ambiente

Detecte o sistema e o shell em uso. No Windows, use CMD, PowerShell ou a ferramenta de shell disponível, com
caminhos entre aspas; evite Bash/WSL só por hábito, `open`, `chmod` e caminhos de outro autor. Prepare o kit
uma vez, dentro do projeto:

```text
node "${CLAUDE_SKILL_DIR}/scripts/setup-tools.mjs" --project "<pasta do projeto>"
```

Ele copia as ferramentas para `<projeto>/.landing-tools`, instala as dependências fixadas, confirma um navegador
(Chromium do Playwright, Edge ou Chrome) e protege `.landing-tools/`, `.work/` e `node_modules/` no `.gitignore`.
Código de saída 3 significa kit pronto **sem navegador**: capturas e testes automáticos não rodaram; declare isso
e use outro navegador disponível, se houver. Depois, na raiz do projeto: `inventory.mjs`, `crop.mjs`,
`compare.mjs`, `serve.mjs` e `verify.mjs`, detalhados em [verificação](references/verification.md).

## Construção

Leia [implementação](references/implementation.md). Em landings novas e simples, HTML semântico, CSS e o JS
necessário bastam; não imponha React, backend ou banco. Node, Sharp, Playwright e servidor local são ferramentas
de desenvolvimento e não viram requisito de hospedagem. Respeite a pasta e a stack pedidas. Separe: arquivos
publicáveis; referências e registros (`.work`); ferramentas (`.landing-tools`); dependências e caches.

Sequência interna: estrutura e tokens → fundos e superfícies → fotografias e componentes → tipografia e ajustes
(famílias e pesos já carregados) → [responsividade](references/responsiveness.md) → interações e
[movimento](references/motion-and-menu.md) → verificação e correções.

Assets: 1) arquivo original separado; 2) recorte limpo da referência; 3) ajustes de enquadramento, tamanho e
compressão. Preserve originais, registre cada recorte em `.work/crops.json`, não gere imagens nem use APIs, não
altere animais, pessoas, produtos ou iluminação. Evite recortes com texto, borda de card ou botão embutidos.
Formas simples e ícones vão em CSS/SVG. Se um texto encobre a foto e não há original, reconheça a limitação
sem afirmar que recuperou pixels. Altura acompanha o conteúdo: quatro imagens não são quatro blocos de `100vh`.

Formulários e dados comerciais: implemente validação, erro e sucesso reais conforme a integração existente e
nunca declare mensagem enviada, reserva ou pagamento sem que tenha ocorrido. Sem telefone ou destino, centralize
a configuração, registre a pendência e mantenha o resto funcional, com modo demonstração claramente indicado.
Mapas ilustrativos continuam identificados como ilustrativos. Em testes, use mocks e nunca envie dados reais.

## Verificação e término

Leia [verificação](references/verification.md). Capture o desktop na largura CSS justificada pelas referências,
uma largura intermediária, 390 px e 360 px; compare com as imagens do usuário e teste as animações com movimento
habilitado. O kit genérico não cobre galerias, formulários ou controles próprios: escreva testes específicos e
registre tudo em `.work/verification/review.md`, separando (1) renderização e capturas, (2) testes funcionais,
(3) avaliação visual, (4) aproximações e limitações. Teste omitido é "não executado", nunca aprovado. Screenshot
do próprio site não é referência de fidelidade. Corrija, repita só o afetado e pare quando os critérios forem
atendidos ou restar um impedimento concreto documentado.

## Autonomia, GitHub e publicação

Autonomia cobre decisões técnicas, revisões de design e verificação local. Respeite as permissões reais do
ambiente; diante de um bloqueio, explique e siga com o que é independente. Mantenha atualizações curtas.
Construir o site, enviar o código ao GitHub e publicar em hospedagem são escopos distintos: se o usuário já pediu
commit, push ou publicação em um destino, execute esse escopo sem pedir de novo; uma invocação genérica não
presume nenhum deles, nem contratar serviços.

## Entrega

Informe: caminho do projeto e como abrir a prévia local; arquivos publicáveis; capturas desktop e mobile;
resultado da comparação com cada referência; testes realmente executados e o navegador usado; aproximações
visuais; pendências de conteúdo, links ou assets (e, se pedido, URL do repositório, branch e commit). Não declare
perfeição nem testes que não ocorreram.
