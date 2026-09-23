# Decisão: Estrutura dos Components

**Data:** 2026-09-13
**Contexto:** A Fase 5 criou 4 componentes reutilizáveis em `components/`, cada um com `.js` + `.css`. A Fase 2 tinha criado uma pasta `CSS/components/` (classes curtas) que nunca foi usada.

## O que está ativo

| Componente | Ficheiro JS | Ficheiro CSS | Função |
|-----------|-------------|--------------|--------|
| **Card** | `components/cards/card.js` | `components/cards/card.css` | Container genérico |
| **Progress** | `components/progress/progress.js` | `components/progress/progress.css` | Barra de progresso (4 estados) |
| **EmptyState** | `components/empty-state/emptyState.js` | `components/empty-state/emptyState.css` | Estado vazio (≠ erro, ≠ loading) |
| **Menu** | `components/menu/menu.js` | `components/menu/menu.css` | Dropdown contextual |

`components/index.js` reexporta os 4 para importação única.

## O que foi removido

`CSS/components/*.css` (Fase 2, 262 linhas): classes curtas (`.card`, `.empty-state`, `.menu`, `.progress`, `.button`, `.form-*`) que **nenhuma página usava**. Confirmado por grep:
- Nenhuma página tem `class="card"` / `class="empty-state"` / etc.
- Nenhum JS importa `CSS/components/`
- O `@import` no `main.css` foi removido

## Regras a manter

1. **Componentes NÃO conhecem regras de negócio** — recebem dados via parâmetros, emitem callbacks.
2. **Prefixos `lumiere-*`** em todas as classes CSS (evita colisões).
3. **Cada componente tem a sua pasta** com `nome.js` + `nome.css`.
4. **`components/index.js`** é o ponto único de importação.
5. **Novo componente** → criar pasta + adicionar ao `index.js`.

---

## Testes automatizados

**Não implementados nesta versão.**

Motivo: Android com armazenamento externo nao permite carregar binarios nativos (`.node`) via `dlopen`. O Vitest depende do Rollup, que tem binario nativo.

**Abordagem atual:** testes funcionais manuais em Chrome + Firefox com o Debug Panel.

**Recomendacao futura:** correr `npx vitest` num PC/laptop quando o projeto for movido para esse ambiente.
