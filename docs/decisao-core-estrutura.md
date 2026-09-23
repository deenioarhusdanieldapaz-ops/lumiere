# Decisão: Estrutura do Core

**Data:** 2026-09-13
**Contexto:** A estrutura inicial criou subpastas em `core/`
(`core/state/`, `core/data/`, `core/events/`, `core/storage/`, `core/calculations/`)
com stubs vazios, mas o conteúdo real foi implementado em `core/*.js`.

## O que está ativo

| Ficheiro | Responsabilidade |
|----------|------------------|
| `core/eventBus.js` | Event Bus (pub/sub) — classe `EventBus` + singleton `eventBus` |
| `core/stateManager.js` | Estado da UI (fonte única de verdade) — singleton `stateManager` |
| `core/storageManager.js` | Persistência IndexedDB via Dexie — singleton `storageManager` |
| `core/dataManager.js` | CRUD com validação via contratos — singleton `dataManager` |
| `core/calculationsManager.js` | Métricas oficiais — singleton `calculationsManager` |
| `core/core.js` | Orquestração central — singleton `core` |
| `core/index.js` | Ponto de entrada — reexporta tudo |
| `core/intelligence/*.js` | Insights, recomendações, prioridades, Índice de Evolução |

## O que foi removido

Stubs vazios (0 linhas) em subpastas que duplicavam os ficheiros ativos:

- `core/state/state-manager.js` → `core/stateManager.js`
- `core/data/data-manager.js` → `core/dataManager.js`
- `core/events/event-bus.js` → `core/eventBus.js`
- `core/storage/storage-manager.js` → `core/storageManager.js`
- `core/calculations/calculations-manager.js` → `core/calculationsManager.js`

As 5 subpastas (`core/state/`, `core/data/`, `core/events/`, `core/storage/`, `core/calculations/`) foram removidas por ficarem vazias.

## Regra a manter

- **Serviços do Core** vivem diretamente em `core/*.js` (sem subpasta).
- **Intelligence** vive em `core/intelligence/*.js` (única subpasta com conteúdo ativo).
- **Nunca duplicar** um serviço em subpasta e em `core/*.js` — usar sempre a versão ativa.

## Consequência futura

Quando alguém retomar o projeto, **não deve criar** `core/state/state-manager.js`
nem pastas equivalentes — deve editar diretamente `core/stateManager.js`.
