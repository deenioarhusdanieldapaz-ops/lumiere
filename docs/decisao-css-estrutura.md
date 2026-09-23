# Decisão: Estrutura CSS do Lumière

**Data:** 2026-09-13
**Contexto:** A estrutura inicial da Fase 2 criou várias pastas CSS
(`CSS/core/`, `CSS/layout/`, `CSS/pages/`, `CSS/themes/`, `CSS/components/`)
mas o conteúdo consolidado ficou em `CSS/main.css`.

## O que está ativo

| Ficheiro | O que contém |
|----------|--------------|
| `CSS/main.css` | **Tokens (38 variáveis)**, reset, tipografia, layout base, imports |
| `CSS/onboarding.css` | Estilo do onboarding (18 linhas) |
| `CSS/themes/*.css` | Temas (noir, lumiere, auto) |
| `CSS/components/*.css` | Componentes CSS da Fase 2 (buttons, cards, forms, etc.) |
| `CSS/layout/app-shell.css` | Shell da app (sidebar + main) |

## O que foi removido

Ficheiros vazios (0 linhas) que nunca foram importados:
- `CSS/core/variables.css` — tokens estão em `main.css`
- `CSS/core/reset.css` — reset está em `main.css`
- `CSS/core/typography.css` — tipografia está em `main.css`
- `CSS/core/base.css`
- `CSS/layout/grid.css`
- `CSS/layout/flex.css`
- `CSS/pages/dashboard.css` — o dashboard real está em `pages/dashboard/dashboard.css`
- `CSS/pages/onboarding.css` — o onboarding real está em `CSS/onboarding.css`

As pastas `CSS/core/` e `CSS/pages/` foram removidas por ficarem vazias.

## Regra a manter

- **Tokens oficiais** vivem em `CSS/main.css` no bloco `:root { ... }`.
- **Estilos específicos de página** vivem em `pages/<nome>/<nome>.css` (não em `CSS/pages/`).
- **Componentes** têm CSS próprio em `components/<nome>/<nome>.css` (Fase 5).
- `CSS/components/` da Fase 2 permanece como referência histórica (classes curtas `.card`, etc.).

## Consequência futura

Quando alguém retomar o projeto, **não deve criar** `CSS/core/variables.css`
para adicionar tokens — deve editar diretamente o bloco `:root` em `CSS/main.css`.
