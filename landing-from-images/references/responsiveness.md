# Responsividade a partir das referências

Adapte a mesma página a telas menores preservando identidade, conteúdo e uso.
O resultado é um HTML compartilhado com composição adequada a desktop, celular
e larguras intermediárias.

## Processo

1. Relacione as seções das imagens no mapa de referências.
2. Distinga decisões observadas de adaptações inferidas.
3. Ajuste composição, tipografia, imagens e navegação conforme o espaço real.
4. Verifique no navegador e corrija somente os problemas encontrados.

## Quando só houver desktop

- Derive o mobile autonomamente. Preserve a ordem de leitura, a hierarquia dos
  títulos, a copy e as ações principais.
- Empilhe colunas quando texto, imagens ou controles deixarem de caber com
  legibilidade. Escolha os breakpoints pelo conteúdo, sem copiar números de um
  framework por convenção.
- Ajuste tamanho e entrelinha dos títulos, margens e espaçamento entre grupos.
  Revise quebras de linha; uma quebra visual não cria outro H1.
- Mantenha áreas de toque confortáveis, controles separados e foco visível.
  Converta a navegação em menu mobile quando ela não couber.
- Registre brevemente decisões inferidas, como “cards passam de três colunas
  para uma abaixo da largura em que o texto fica comprimido”.

## Quando houver desktop e mobile

Use a composição mobile fornecida como referência para proporções, ordem,
enquadramentos e espaçamento. Relacione as imagens por conteúdo: vários recortes
mobile podem cobrir uma única seção desktop, e vice-versa. Remova sobreposições
entre capturas sem duplicar seções ou cabeçalhos.

Interpolações continuam necessárias: verifique uma largura intermediária e os
dois lados dos breakpoints relevantes. Não basta que apenas as duas larguras
das referências estejam corretas. Registre conflitos reais entre as referências
e preserve conteúdo importante enquanto resolve a composição.

## Regras de implementação

- Use o mesmo conteúdo e DOM semântico em desktop e mobile. Evite duplicar
  títulos, formulários ou navegação e esconder uma cópia por media query.
  Reordenação visual deve manter uma ordem de leitura e teclado coerente.
- Use Grid/Flexbox, medidas fluidas e limites de largura quando adequados.
  As seções crescem conforme o conteúdo. Quatro arquivos de referência não
  significam quatro seções de 25% da página, nem quatro blocos de `100vh`.
- Não esconda texto, CTAs, links ou informação importante para fazê-los caber.
  Se uma referência mobile omitir conteúdo necessário, acomode-o preservando a
  hierarquia e registre a adaptação.
- Reserve proporções de imagem para evitar saltos de layout. Preserve a razão
  de aspecto; não estique fotos nem use overflow oculto para disfarçar defeitos.
- Reenquadre com `object-fit` e `object-position` ou com recortes derivados dos
  originais. Inspecione rostos, produtos e pontos de interesse em cada largura.
  Se `cover` cortar o assunto, ajuste posição, proporção ou use outra composição.
- Evite larguras mínimas involuntárias, textos sem quebra e elementos absolutos
  que escapem da tela. Corrija a causa do overflow em vez de aplicar
  `overflow-x: hidden` indiscriminadamente.
- Cabeçalhos fixos e menus não devem encobrir títulos, focos ou destinos de
  âncoras. Ajuste o espaço reservado e, quando necessário, `scroll-margin-top`.

## Exemplo curto

Uma referência desktop traz título e CTA à esquerda, retrato à direita e três
cards abaixo. Sem referência mobile, mantenha título, CTA, retrato e cards nessa
ordem; empilhe os cards quando necessário. Use `object-position` para preservar
o rosto. A altura do hero decorre desse conteúdo, sem forçar uma tela inteira.

## Verificação

Verifique a largura CSS correspondente à referência desktop, uma intermediária,
390 px e 360 px. Considere dimensões reais dos arquivos e eventual escala entre
pixels da imagem e pixels CSS; não assuma 1440 px nem densidade de pixel 1.

Em cada largura, confira conteúdo completo, alinhamentos, títulos, fotos,
navegação, áreas de toque, foco, âncoras, sobreposições e ausência de overflow.
Abra e feche o menu, redimensione com ele aberto e confirme que a página continua
rolável. Compare capturas estáticas com as referências originais; teste movimento
separadamente conforme [animações e menu](motion-and-menu.md).
