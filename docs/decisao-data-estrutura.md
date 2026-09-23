# Decisão: Estrutura da camada Data

**Data:** 2026-09-13
**Contexto:** A estrutura inicial da Fase 4 criou várias subpastas em `data/`
(`defaults/`, `entities/`, `relations/`, `schemas/`, `state/`) com stubs vazios,
mas a implementação real foi consolidada em `data/contracts/`.

## O que está ativo

| Ficheiro | Responsabilidade |
|----------|------------------|
| `data/contracts/*.js` | **21 contratos** (schema + defaults + validação + relations) |
| `data/contracts/index.js` | Reexporta todos os 21 contratos |

### Lista dos 21 contratos

Task, Habit, HabitLog, Study, StudySession, Goal, GoalMilestone, CalendarEvent,
FinanceAccount, FinanceTransaction, Budget, Note, LumiereBusiness, LumiereProduct,
LumiereCustomer, LumiereSale, Reminder, Category, Tag, Preferences, UserProfile.

## O que foi removido

12 stubs vazios (0 linhas) em subpastas que nunca foram usadas:

- `data/defaults/{categories,entities,preferences}.js`
- `data/entities/{task,habit,goal,study,finance,lumiere}.js`
- `data/relations/relations.js`
- `data/schemas/validation.js`
- `data/state/app-state.js`

As 5 subpastas (`defaults/`, `entities/`, `relations/`, `schemas/`, `state/`) foram removidas.

## Regra a manter

- **Todo contrato de entidade** vive em `data/contracts/<nome>Contract.js`.
- **Nunca duplicar** schema/validação/defaults em `data/entities/` ou `data/schemas/` — usar o contrato.
- **Relações** entre entidades vivem dentro do contrato (`relations: { campoId: 'colecaoPlural' }`).
- **Novos contratos** devem ser adicionados ao `data/contracts/index.js`.

## Consequência futura

Quando alguém retomar o projeto, deve criar/editarr diretamente em `data/contracts/`,
nunca em subpastas como `data/entities/` ou `data/schemas/`.
