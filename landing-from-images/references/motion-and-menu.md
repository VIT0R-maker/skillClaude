# Animações e menu mobile

Use movimento discreto para orientar a leitura e tornar mudanças de estado
claras. Entregue conteúdo acessível imediatamente e um menu que abra e feche
suavemente, inclusive sob cliques rápidos e navegação por teclado.

## Movimento do conteúdo

Prefira CSS; use Web Animations API quando facilitar controle e reversão. Os
princípios que valem são entrada por opacidade e deslocamento, cancelamento de
animações anteriores, movimento reduzido e limpeza de recursos. Escreva só o código
que a página usa; ela não depende de catálogo, vídeo de referência nem geração de
imagens. Se o repositório `skillClaude` estiver disponível, `animate/assets/animations/`
(por exemplo `trn-01-fade-rise` e `trn-02-clip-reveal`) pode inspirar um efeito
específico: leia como referência, sem importar seu CSS, sua interface ou sua identidade
visual. A skill funciona sem ele.

| Uso | Ponto de partida |
| --- | --- |
| Hover, foco e feedback de clique | 150–220 ms |
| Abertura e fechamento do menu | 220–320 ms |
| Entrada do hero e revelação de seções | 350–550 ms |
| Deslocamento de entrada | 8–20 px |

Ajuste à identidade da referência. Prefira `opacity` e `transform` para entradas;
não anime dimensões de todo o layout. Preserve o foco visível e não dependa de
hover para comunicar ações. Use rolagem suave para âncoras apenas quando útil,
sem interceptar a rolagem normal nem atrasar acesso ao conteúdo principal.

O estado base do HTML/CSS deve exibir conteúdo e navegação utilizáveis sem
JavaScript. Só habilite a versão recolhível e seus estados ocultos depois de
instalar seus controles com sucesso. Revele conteúdo por melhoria progressiva:
se `IntersectionObserver` ou a API de animação não estiver disponível, mantenha
tudo visível. Trate falhas e cancelamentos sem deixar `opacity: 0`, transformações
ou máscaras presas. Ao concluir, deixe o estado final em CSS/DOM e libere efeitos,
observadores, timers e listeners que não sejam mais necessários.

Com `prefers-reduced-motion: reduce`, remova deslocamentos, cascatas e rolagem
suave; aplique os mesmos estados funcionais imediatamente. Se a preferência mudar
durante uma animação, cancele o efeito e conclua o estado solicitado. Não dependa
exclusivamente de `transitionend`: duração zero, cancelamentos e resize podem
impedir esse evento.

## Contrato do menu

Use um botão real com nome acessível, `aria-controls` apontando para o painel e
`aria-expanded` refletindo o estado solicitado. Preserve links semânticos em
`nav`; navegação de site não exige o padrão ARIA `menu`/`menuitem`. Escolha se o
painel é uma expansão comum ou um modal conforme seu comportamento real.

| Estado | Apresentação e interação |
| --- | --- |
| `closed` | Painel e overlay ocultos, sem cliques nem foco; `aria-expanded=false`; página liberada. |
| `opening` | Remova `hidden` antes de animar. Entre do estado visual atual até aberto; `aria-expanded=true`. |
| `open` | Painel visível, links utilizáveis e foco coerente; `aria-expanded=true`. |
| `closing` | Anime a saída até o fim; `aria-expanded=false`. Transfira foco antes de tornar os links inertes. |
| `desktop` | Navegação compartilhada visível; botão mobile oculto; nenhum overlay, bloqueio ou transformação residual. |

Exemplo: `closed → opening → closing → opening → open` deve terminar aberto
quando o último clique solicita abertura. Uma conclusão antiga de fechamento
não pode aplicar `hidden` nesse painel reaberto.

### Transições e interrupções

- Anime **entrada e saída** do painel com fade e deslocamento curto ou expansão
  controlada. Anime também a opacidade do overlay e a mudança do ícone do botão,
  se existirem. Não aplique `display: none`/`hidden` antes de concluir a saída.
- Centralize estado desejado e transição ativa. Inverta uma animação existente
  ou cancele-a e continue dos valores visuais atuais, sem saltar ao primeiro
  quadro. A última intenção prevalece.
- Use um identificador de transição ou equivalente para ignorar callbacks e
  promises antigos. Trate rejeições decorrentes de cancelamento. Finalize uma
  única vez e ofereça conclusão segura quando o evento de término não ocorrer.
- Ao encerrar, aplique `hidden` e remova interação do overlay. `opacity: 0` e
  `pointer-events: none` isoladamente não retiram links da ordem de Tab: use
  `hidden`/`inert` conforme a fase e nunca deixe foco dentro de conteúdo oculto.
- Ao iniciar fechamento modal, desative a contenção de foco e libere o destino
  da restauração antes de transferir foco; então torne os links do painel inertes.
  Coordene a retirada do bloqueio do fundo com essa transferência. Um overlay que
  permanece visível durante a saída não pode continuar capturando cliques após
  desaparecer. Reabertura deve restaurar os controles e regras de foco.

### Teclado, foco e rolagem

- Enter/Espaço acionam o botão; Tab/Shift+Tab percorrem controles em ordem; Escape
  fecha o menu. Escolher uma seção fecha o painel e navega para o destino correto.
- Em expansão comum, mantenha a ordem natural de foco e permita sair do painel
  com Tab. Não prenda foco nem bloqueie o restante da página sem necessidade.
- Em modal, dê nome acessível ao diálogo, exponha sua modalidade, torne o fundo
  inerte e contenha Tab/Shift+Tab enquanto estiver aberto. Posicione foco em um
  controle visível do painel ao abrir. O controle de fechar deve continuar
  acessível; não torne seu próprio diálogo inerte ao bloquear o fundo.
- Ao fechar por Escape, botão ou overlay, restaure foco ao acionador quando ele
  continuar visível. Ao escolher âncora, libere o modal e leve foco ao destino,
  com `tabindex="-1"` temporário quando necessário. Evite recolocar foco no botão
  depois e desfazer a navegação. Não produza um segundo salto de scroll pelo foco.
- Se bloquear rolagem de fundo, guarde posição e valores de estilo anteriores.
  Restaure-os em fechamento, falha e mudança para desktop. Preserve a posição
  anterior em um fechamento normal; para âncora, restaure primeiro o bloqueio e
  depois navegue, evitando que a restauração desfaça o destino escolhido.
- Ao atravessar o breakpoint desktop, invalide transições, remova overlay,
  `inert`, contenção de foco e bloqueio de scroll; exponha a navegação compartilhada.
  Se o botão focado ficar oculto, mova foco a um link visível pertinente. Ao
  retornar ao mobile, inicialize um estado fechado coerente sem prender foco.

## Verificação com movimento habilitado

Execute esta rodada separadamente da captura estática. Não use o modo que
desativa animações nem marque sucesso apenas porque uma screenshot final parece
correta. Observe no navegador ou registre quadros em instantes diferentes.

1. Abra e feche o menu. Inspecione início, meio e fim de ambas as transições:
   painel, overlay e ícone devem mudar progressivamente, sem desaparecimento seco.
2. Alterne rapidamente abrir/fechar/abrir antes do término e repita durante a
   saída. Espere além da duração máxima; o estado final deve corresponder à
   última ação, sem callback tardio, flicker ou bloqueio residual.
3. Use só teclado: botão, links, Escape, Tab e Shift+Tab. Confira foco devolvido,
   ausência de foco em elementos fechados e, quando modal, contenção e fundo
   inerte. Teste clique no overlay, se existir.
4. Escolha uma âncora. Confira URL/destino, foco visível, compensação do cabeçalho
   e rolagem final depois da saída. Abra/feche partindo de uma posição já rolada.
5. Redimensione para desktop durante abertura, estado aberto e fechamento. Volte
   ao mobile; confirme navegação utilizável e página liberada em todos os casos.
6. Teste movimento reduzido desde o carregamento e alterado durante a transição.
   Teste também sem JS e com falha de inicialização das animações: conteúdo e
   navegação continuam disponíveis, sem elementos permanentemente transparentes.
7. Confira entrada do hero, revelações ao rolar, hover, foco e feedback de clique.
   Leia o console para detectar erros de cancelamento e recursos sem limpeza.

Registre cenário, resultado observado e evidência disponível. Corrija falhas e
repita os cenários afetados. A rodada estática posterior estabiliza fontes,
imagens e revelações para comparar a composição com as imagens do usuário; ela
comprova um aspecto diferente do comportamento animado.
