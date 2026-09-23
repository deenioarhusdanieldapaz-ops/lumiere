# Decisão: Arquitetura da Navigation

**Data:** 2026-09-13
**Contexto:** A Fase 6 implementou o layout híbrido navegável (sidebar desktop + mobile off-canvas + topbar). Este documento regista as decisões estruturais.

## Componentes ativos

| Ficheiro | Responsabilidade |
|----------|------------------|
| `js/navigation.js` | Singleton `navigation` — gere sidebar, topbar, foco, rota ativa |
| `CSS/layout/app-shell.css` | Estilo do shell (grid sidebar + main; off-canvas em mobile) |
| `index.html` (linhas 97-135) | Estrutura HTML: `#sidebar`, `.app-nav-item`, `.app-topbar`, `#overlay` |

## Como funciona

1. **`navigation.init()`** (chamado por `js/app.js`):
   - Localiza `#app-shell`, `.app-topbar__toggle`, `.app-overlay`, `#page-title`
   - Recolhe os `.app-nav-item[data-page]`
   - Liga eventos (clique, overlay, toggle)
   - Escuta `navigation:changed` do EventBus
   - Aplica estado inicial (colapso + página ativa)

2. **Clique num item** → `navigation.goTo(page)` → `stateManager.navigateTo(page)` → emite `navigation:changed`

3. **Desktop:** sidebar fixa à esquerda; toggle ☰ alterna `.is-collapsed` (colapsado a 64px)

4. **Mobile:** sidebar off-canvas; toggle ☰ abre/fecha com overlay escuro

## Regras a manter

1. **Nunca** colocar lógica de negócio em `navigation.js` — só UI + estado de navegação.
2. **Sempre** `goTo(page)` via StateManager (não mudar `location` diretamente).
3. **Acessibilidade:** `aria-current="page"` no item ativo; foco devolvido ao toggle após fechar mobile.
4. **Persistência:** colapso da sidebar guardado em `localStorage.lumiereSidebarCollapsed` (`'1'` ou `'0'`).

## Integração com a app

- `js/app.js` inicializa `navigation` após o Core.
- Cada módulo (`pages/*/*.js`) é carregado por um handler em `app.js` que reage a `navigation:changed`.
- Nenhum módulo fala diretamente com a sidebar — usa o StateManager.
