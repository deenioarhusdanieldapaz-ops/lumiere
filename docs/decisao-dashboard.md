# Decisão: Arquitetura do Dashboard

**Data:** 2026-09-13
**Contexto:** O Dashboard é montado dinamicamente em `#content` do `index.html` por `dashboard.js`, usando um sistema de registry + orchestrator. As 10 sections vivem em `pages/dashboard/sections/`.

## Componentes ativos

| Ficheiro | Responsabilidade |
|----------|------------------|
| `pages/dashboard/dashboard.js` | Orchestrator — regista sections e coordena render |
| `pages/dashboard/dashboard.css` | Estilos das sections + insights |
| `pages/dashboard/sections/registry.js` | Sistema de registo de sections (`dashboardRegistry`) |
| `pages/dashboard/sections/*.js` | 10 sections individuais |

## As 10 sections

| # | Section | Order | Estado |
|---|---------|:-----:|--------|
| 1 | `welcome` | 10 | ✅ com dados (nome do utilizador) |
| 2 | `today` | 20 | ✅ com dados (data atual) |
| 3 | `weekly` | 30 | ⚠️ placeholder |
| 4 | `progress` | 40 | ✅ com progresso (usa createProgress) |
| 5 | `goals` | 50 | ⚠️ placeholder |
| 6 | `habits` | 60 | ⚠️ placeholder |
| 7 | `studies` | 70 | ⚠️ placeholder |
| 8 | `finances` | 80 | ⚠️ placeholder |
| 9 | `lumiere` | 90 | ⚠️ placeholder |
| 10 | `insights` | 100 | ✅ com dados (índice + prioridades + insights + recomendações) |

**⚠️ As 5 sections placeholders serão preenchidas na Fase 11 (Polimento)** — atualmente só mostram "Sem dados".

## Como funciona

1. **`loadDashboard(container, context)`**:
   - `registerSections()` — regista as 10 sections (uma só vez)
   - Limpa o `container`
   - Para cada section (ordem por `order`): cria `<div class="dashboard-section-root">` e chama `section.render(root, context)`

2. **`context`** recebido:
   - `userName` — nome do utilizador (localStorage)
   - `state` — estado atual (`stateManager.getState()`)
   - `collections` — todas as coleções (tarefas, hábitos, etc.)
   - `services` — `{ core, eventBus, stateManager, dataManager }`

3. **Reatividade:** `js/app.js` escuta `data:changed` e re-renderiza com debounce (só se a página ativa for `dashboard`).

## Regras a manter

1. **Section NÃO importa Core** — recebe tudo via `context`. (Exceção: `insights.js` importa `core/intelligence/*` — é intencional porque Intelligence é determinístico e desacoplado.)
2. **Section tem `id` único** + `order` numérico + `render(container, context)`.
3. **Ordem crescente:** `welcome` (10) → `insights` (100).
4. **`registry.register()`** valida que `id` e `render` existem.
5. **Nova section:** adicionar em `sections/` + importar/registar em `dashboard.js`.

## Ficheiro removido

`pages/dashboard/dashboard.html` (0 linhas) — não era referenciado em nenhum lado. O Dashboard usa `#content` do `index.html`.
