# Decisão: duplicação de CSS de componentes

**Data:** 2026-09-10
**Contexto:** Existem dois sistemas paralelos de CSS para componentes:
- `CSS/components/*.css` (Fase 2, classes curtas: `.card`, `.empty-state`, `.menu`, `.progress`)
- `components/*/*.css` (Fase 5, classes longas prefixadas: `.lumiere-card`, `.lumiere-empty`, etc.)

**Decisão:** Manter ambos.
- Os componentes JS atuais usam as classes `.lumiere-*`. Seu CSS vive em `components/*/*.css`.
- `CSS/components/*.css` fica como base histórica (Fase 2), sem uso pelos componentes JS atuais.
- Nenhum conflito de classes existe porque os prefixos são diferentes.

**Consequência futura:** quando o Dashboard (Fase 7) usar componentes JS da Fase 5, os CSS
`components/*/*.css` devem ser linkados no HTML principal (via `main.css` ou links adicionais).

**Regra Zero aplicada:** inspeção confirmou; nenhuma ação corretiva.

---

## ⚠️ ATUALIZAÇÃO (2026-09-13)

A decisão descrita acima ("manter ambos") foi **revista na Fase 10 – Auditoria**:

- Após verificação, confirmou-se que **nenhuma página** usava as classes de `CSS/components/`.
- A pasta `CSS/components/` (262 linhas) foi **removida**.
- O `@import url("components/index.css")` foi removido do `CSS/main.css`.
- Decisão atual: ver `docs/decisao-components.md`.
