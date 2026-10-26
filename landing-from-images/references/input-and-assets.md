# Entrada, sequência e assets

## Inventário visual

Abra cada referência com a ferramenta Read, que exibe imagens. Dimensões extraídas por
script não substituem inspeção visual. Preserve arquivos originais; coloque cópias
em `.work/references/`. Para recortar, o arquivo precisa existir em disco: se a imagem
chegou apenas embutida na conversa, procure-a (Downloads, a pasta do projeto, o
caminho citado) ou peça o caminho ao usuário. Esse é o único insumo cuja ausência
justifica parar; arrastar o arquivo para o terminal insere o caminho completo. Registre imagens separadas de logos/fotos como assets, para
não interpretá-las como partes da página. Se um formato não abrir, converta uma
cópia com ferramenta local e registre a conversão; não finja ter lido o original.

Anote para cada referência: arquivo, largura/altura reais, orientação aplicada,
desktop/mobile, seções e regiões cobertas, ordem, correspondências e evidência da
decisão. Um inventário automático começa com campos desconhecidos; complete-os
após examinar as imagens. Não atribua desktop/mobile só pela largura em pixels:
uma captura de celular em alta densidade pode ter 1170 px.

## Ordem e consolidação

1. Siga a sequência declarada pelo usuário, mesmo que outra pareça mais usual.
2. Sem sequência declarada, aceite nomes intencionais como
   `desktop-01-hero.png`, `desktop-02-servicos.png`.
3. Sem esses sinais, relacione continuidade de texto, fundos, imagens, seções,
   navegação e rodapé. Registre a sequência inferida e a incerteza.

`IMG_2031`, `Screenshot_20261023_...` e a ordem de upload não demonstram uma sequência
editorial. Use upload somente como sinal auxiliar. Resolva ambiguidades reversíveis
pela sequência mais plausível, sem parar para aprovação.

Detecte trechos repetidos nas bordas das capturas. Registre região sobreposta e
seção correspondente; renderize o trecho uma vez. Um cabeçalho fixo reaparecendo
em quatro imagens não cria quatro cabeçalhos na página. Preserve a continuidade
de uma seção que cruza vários arquivos; não transforme cada arquivo em uma seção.

Relacionamentos podem ser muitos-para-muitos: duas imagens mobile podem cobrir o
mesmo hero desktop; uma captura pode conter final de serviços e início de contato.
Use IDs de seção estáveis, não índices de imagem, para guiar implementação.

Exemplo de registro preenchido (campos ilustrativos além dos dados do inventário):

```json
{
  "version": 1,
  "inspectionRequired": false,
  "images": [
    {
      "file": ".work/references/desktop-02-servicos.png",
      "width": 2880,
      "height": 1800,
      "orientation": 1,
      "orientedWidth": 2880,
      "orientedHeight": 1800,
      "device": "desktop",
      "sections": ["hero-tail", "services"],
      "order": 2,
      "decision": {"source": "name", "reason": "Numeração editorial desktop-02"},
      "matches": ["mobile-03.png", "mobile-04.png"],
      "overlaps": [{"with": "desktop-01-hero.png", "topPixels": 120}],
      "cssWidth": 1440,
      "pixelRatio": 2,
      "scaleEvidence": "viewport informado pelo usuário"
    }
  ],
  "assumptions": ["Recortes mobile 03 e 04 pertencem à mesma seção services."]
}
```

Dimensão física não determina sozinha viewport CSS ou DPR. Se não houver metadado,
estime a escala com composição, tamanho aparente de texto e informação do usuário;
registre a hipótese. Altura de página completa não é altura do viewport. Compare
regiões equivalentes e não redimensione a referência para esconder divergências.

## Conteúdo e linguagem visual

Extraia hierarquia, conteúdo legível, paleta, fontes aparentes, pesos, espaçamentos,
alinhamentos, proporções, bordas, sombras, gradientes, fotos, pontos de interesse e
estados dos controles. OCR local é opcional e deve ser conferido visualmente.

Copy e nomes de fontes fornecidos são canônicos. Se uma fonte não estiver disponível,
documente a alternativa e o impacto nas quebras. Não prometa identificar uma fonte
pela aparência. Para trechos ilegíveis, marque a lacuna no planejamento e entregue
o restante; nunca invente preços, avaliações, contatos, certificações ou promessas.
Se um destino faltar, registre-o como pendência de integração, sem telefone fictício.

## Recortes e enquadramento

Use nesta ordem: asset original separado; recorte limpo da referência; ajustes de
tamanho, enquadramento e compressão. Não faça reconstrução generativa. Os comandos
reproduzíveis (`inventory.mjs`, `crop.mjs`) estão em [verificação](verification.md#comandos-do-kit)
e no [README](../README.md).

- Meça o retângulo na orientação efetivamente visualizada. O kit normaliza EXIF
  antes do recorte; use dimensões orientadas para as coordenadas.
- Registre fonte, região em pixels (`left`, `top`, `width`, `height`), saída e
  redimensionamento em `.work/crops.json`. Preserve a imagem de origem.
- Confira o recorte em tamanho real: não inclua texto, botão ou borda do mockup.
- Para texto sobre fotografia, procure o original; depois avalie um recorte que
  preserve o assunto. Pixels ocultos não podem ser recuperados por simples crop.
  Documente a limitação, sem apresentar a área ausente como reprodução exata.
- Evite esticar ou ampliar recortes pequenos. Avalie resolução efetiva no layout,
  `object-fit`, `object-position` e, quando útil, variantes em `srcset`.
- Preserve rostos, produto e pontos de interesse nos reenquadramentos mobile.
- Reconstrua fundos simples, gradientes, bordas e sombras em CSS. Arte complexa e
  fotografias continuam imagens; textos e controles permanecem HTML acessível.

Exemplo: reutilize `produto-original.jpg` se fornecido; caso contrário, recorte só
a foto do card e reconstrua sua borda, título e CTA em HTML/CSS.
