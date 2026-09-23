# Decisão: Estrutura dos Módulos (Fase 8)

**Data:** 2026-09-13
**Contexto:** A Fase 8 implementou 9 módulos funcionais (Tasks, Habits, Goals, Studies, Lumière, Notes, Calendar, Finances, Settings). Todos seguem o mesmo padrão de ficheiros e ciclo de vida.

## Padrão comum

Cada módulo em `pages/<nome>/` tem **2 ficheiros ativos**:

| Ficheiro | Responsabilidade |
|----------|------------------|
| `pages/<nome>/<nome>.js` | Lógica do módulo — `init<Nome>(container)` |
| `pages/<nome>/<nome>.css` | Estilos específicos do módulo |

## Ficheiros removidos

Cada módulo tinha um `<nome>.html` de **0 bytes** que nunca era referenciado. O módulo é montado dinamicamente em `#content` do `index.html` via `init<Nome>(container)`.

Apagados: `tasks.html`, `habits.html`, `goals.html`, `studies.html`, `lumiere.html`, `notes.html`, `calendar.html`, `finances.html`, `settings.html`.

## Estrutura dos 9 módulos

| # | Módulo | Ficheiro JS | Sub-entidades |
|---|--------|-------------|---------------|
| 1 | Tasks | `tasks.js` (432L) | — |
| 2 | Habits | `habits.js` (400L) | + HabitLogs (check-in) |
| 3 | Goals | `goals.js` (407L) | — |
| 4 | Studies | `studies.js` (536L) | + StudySessions |
| 5 | Lumière | `lumiere.js` (587L) | 4 sub-entidades com tabs |
| 6 | Notes | `notes.js` (405L) | — |
| 7 | Calendar | `calendar.js` (465L) | — |
| 8 | Finances | `finances.js` (709L) | 3 sub-entidades com tabs |
| 9 | Settings | `settings.js` (294L) | — |

**Total:** ~4235 linhas de JS + ~2328 linhas de CSS

## Ciclo de vida comum

1. **`init<Nome>(container)`** — chamado por `js/app.js` quando `payload.page === '<nome>'`
2. Limpa o container (`_container.innerHTML = ''`)
3. Carrega dados via `dataManager.list('<colecao>')`
4. Renderiza lista + formulário
5. Escuta `data:changed` do EventBus e re-renderiza
6. Cada operação CRUD (create/update/delete) emite `data:changed` (via DataManager)

## Padrões obrigatórios

1. **Não importar Core diretamente** — usar `dataManager` e `eventBus` (via import de `core/*.js`).
2. **Validação primeiro** → formulário com mensagem de erro visível.
3. **Estados distinguíveis:** vazio ≠ erro ≠ loading ≠ sucesso.
4. **IDs estáveis** gerados pelo DataManager (via contrato).
5. **Reatividade:** re-render apenas quando `data:changed` do seu próprio collection.
6. **Prefixos de classe CSS:** `<nome>-` (ex: `.task-item`, `.habit-item`).
7. **Internacionalização:** usar `t()` de `js/i18n.js` para enums.

## Regras a manter

- **Nunca criar `pages/<nome>/<nome>.html`** — a app é uma SPA, o conteúdo é montado em `#content`.
- **Nunca duplicar lógica de negócio na UI** — delegar sempre ao DataManager.
- **Novo módulo** → criar `pages/<novo>/<novo>.js` + `<novo>.css` + registar em `js/app.js`.
