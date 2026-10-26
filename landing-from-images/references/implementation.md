# Implementação e ações reais

## Organização do projeto

Use a pasta pedida pelo usuário. Para um projeto simples:

```text
index.html
assets/
  css/styles.css
  js/main.js
  js/business.js
  images/
  fonts/                 # se houver fontes locais
.work/
  references/
  reference-map.json
  plan.md
  progress.md
  crops.json
  verification/
.landing-tools/          # cópia opcional do kit Node, dependências locais
```

Crie somente arquivos necessários. Publique `index.html` e `assets/`; exclua
`.work`, `.landing-tools`, referências e dependências de desenvolvimento (o
`setup-tools.mjs` já acrescenta essas pastas ao `.gitignore`). Node e
Python não fazem parte do runtime publicado. Um `package.json` do verificador
não implica framework, bundler ou servidor de aplicação.

Mantenha caminhos relativos e sem dependência do caminho absoluto da máquina.
Use CSS externo e JS externo com `defer` ou módulo; centralize dados comerciais e
destinos em um lugar claro, por exemplo `assets/js/business.js`. Se o projeto não
precisar de configuração em JS, um bloco único de dados documentado é suficiente.

## Layout e tipografia

Traduza regiões em `header`, `nav`, `main`, `section`, `article` e `footer`, com
hierarquia de títulos coerente. Uma headline em três linhas continua um H1;
quebras da referência não são três títulos semânticos. Use botões para ações e
links para navegação. Labels de formulário não devem depender de placeholders.

Defina tokens compartilhados e famílias/pesos de fonte antes do ajuste fino.
Verifique o carregamento real da fonte e sua licença/disponibilidade; prefira
fontes fornecidas. Implemente superfícies, componentes e imagens nas camadas
previstas no plano. Não substitua o estilo da referência por convenções genéricas.

## Comportamento

Derive ações de rótulos e briefing, registrando o que a imagem não explica. Implemente
menu, navegação, CTAs, formulários e ampliação de imagens quando existirem. Ao ampliar
imagem, forneça fechamento, Escape e foco coerente. Não adicione controles decorativos
que parecem funcionais e não fazem nada.

- Âncoras apontam para IDs existentes, com compensação de cabeçalho fixo.
- Destinos conhecidos ficam centralizados; use o endereço real fornecido.
- Se faltar um destino necessário, mantenha as ações independentes funcionais.
  Deixe o controle indisponível com explicação honesta quando isso for necessário;
  registre o dado faltante. Evite `href="#"` que simula navegação resolvida.
- Validação de formulário verifica campos e mensagens acessíveis. Sem backend,
  não mostre “Enviado” após apenas validar. Explique que o envio não está configurado.
- Abrir WhatsApp significa abrir uma conversa; não significa mensagem enviada,
  compra efetuada ou reserva confirmada.
- Sucesso depende do resultado real de integração; trate erro e carregamento
  quando houver operação assíncrona.

Exemplo: um botão “Reservar” pode abrir o contato fornecido no briefing. Seu
feedback deve dizer “Abrindo conversa”, e não “Reserva confirmada”.

## Continuidade

Em `.work/progress.md`, mantenha um registro curto, não um diário extenso:

```text
Etapa: responsividade
Concluído: inventário, sequência, estrutura, fontes e assets.
Próximo: testar menu a 390/360 px e comparar seção services.
Suposição: largura desktop de 1440 CSS px, captura em escala 2.
Pendência: URL real do CTA Agendar; restante funcional.
Evidências: verification/desktop.png; crops.json.
```

Retome artefatos existentes, reabra apenas o necessário e não refaça etapas
concluídas sem mudança de requisito ou falha demonstrada.
