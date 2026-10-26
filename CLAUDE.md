@AGENTS.md

## Claude Code

- Estas pastas são o código-fonte das skills. Para usar uma no Claude Code, ela precisa ser instalada em
  `~/.claude/skills/<nome>` (pessoal) ou `.claude/skills/<nome>` (por projeto). Hoje só a `landing-from-images`
  tem instalador próprio: `node landing-from-images/scripts/install.mjs` (veja o README dela).
- Ao alterar `landing-from-images`, rode antes de concluir, na raiz do repositório:
  `node --test landing-from-images/scripts/*.test.mjs`. Os testes do kit ficam em `landing-from-images/tools`
  (`npm ci`, depois `npm test` e `npm run test:browser`, que exigem um navegador).
- Não declare teste executado no Windows se ele só rodou em outro sistema.
