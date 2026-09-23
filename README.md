# Lumière Life Manager — v1.0.0

Gestor pessoal integrado para tarefas, hábitos, estudos, objetivos, calendário, finanças, notas e operação Lumière.

> **Offline-first. Determinístico. Sem backend.** Todos os dados ficam no dispositivo (IndexedDB).

---

## Visão

O Lumière é uma **PWA** construída em HTML + CSS + JavaScript puro (ES Modules). A arquitetura é híbrida/inteligente:

- **UI (Pages)** — só apresenta. Não tem regras de negócio.
- **Core** — orquestra State, Storage, EventBus, Data, Calculations.
- **Data** — contratos, validação, defaults.
- **Storage** — IndexedDB (via Dexie), encapsulado.
- **Intelligence** — insights, recomendações, prioridades, Índice de Evolução.

---

## Requisitos mínimos

| Ferramenta | Versão mínima |
|-----------|---------------|
| Node.js   | 18.x          |
| npm       | 9.x           |
| Git       | 2.40+         |
| Python    | 3.10+         |
| Chrome    | 105+          |
| Firefox   | 121+          |

---

## Como correr localmente

```bash
cd LumiereLifeManager
python -m http.server 8080
```

Abre no browser: **http://localhost:8080**

**Nota:** abrir `index.html` via `file://` **não funciona** — a PWA precisa de servidor HTTP (service worker, IndexedDB, ES Modules).

---

## Estrutura de pastas

```
LumiereLifeManager/
├── index.html                  ← entrada
├── manifest.webmanifest        ← metadados PWA
├── sw.js                       ← service worker
├── package.json                ← v1.0.0
│
├── CSS/                        ← estilos globais
│   ├── fonts.css, main.css, splash.css
│   ├── layout/                 ← app-shell
│   └── themes/                 ← noir, lumiere, auto
│
├── core/                       ← núcleo (sem UI)
│   ├── core.js, dataManager.js, storageManager.js
│   ├── stateManager.js, eventBus.js, calculationsManager.js
│   └── intelligence/
│       ├── lumiereIndex.js     ← Índice de Evolução
│       ├── insights.js
│       ├── recommendations.js
│       └── priorities.js
│
├── data/contracts/             ← 21 contratos de dados
│
├── components/                 ← peças reutilizáveis
│   ├── progress-ring, bar-chart, line-chart
│   ├── context-line, card, mini-card, stat-row
│   └── sheet, menu, empty-state, progress
│
├── pages/
│   ├── cards/                  ← 9 cards
│   │   ├── overview/           ← Início
│   │   ├── progress/           ← Progresso
│   │   ├── mainGoal/           ← Objetivo Principal
│   │   ├── lumiere/            ← Lumière
│   │   ├── finances/           ← Finanças
│   │   ├── today/              ← Hoje
│   │   ├── weeklyProgress/     ← Progresso Semanal
│   │   ├── insights/           ← Insights
│   │   └── reports/            ← Relatórios
│   └── (módulos CRUD: tasks, habits, goals, studies, finances, calendar, notes, lumiere, settings, profile)
│
├── js/                         ← bootstrap + utilitários
├── assets/                     ← fontes + ícones
├── public/                     ← brand + PWA icons
└── docs/                       ← documentação
```

---

## Arquitetura em detalhe

**Fluxo de dados:**

```
UI → Core → DataManager → Storage (Dexie/IndexedDB)
       ↓
   EventBus → State Manager → UI re-render
```

### Regras invioláveis

1. **UI nunca fala com Dexie/IndexedDB directamente.** Todo o acesso passa por Core → DataManager.
2. **State Manager é fonte única de verdade** do estado da aplicação.
3. **Storage Manager encapsula persistência.** Não há chamadas directas.
4. **Event Bus desacopla comunicação** entre partes. Nada de acoplamento directo.
5. **Intelligence interpreta resultados calculados** com regras determinísticas. Nunca inventa dados.
6. **Ausência de dados ≠ zero ≠ erro.** Cada estado é diferente.
7. **Comparações só contra período anterior válido.** Sem base, devolve "não calculável".

### Camadas

| Camada | Ficheiros | Responsabilidade |
|--------|-----------|------------------|
| **Pages** | `pages/cards/*`, `pages/*` | Apresentação. Sem regras de negócio. |
| **Components** | `components/*` | Peças reutilizáveis (ring, charts, sheet). |
| **Core** | `core/core.js` | Orquestração central. |
| **Data** | `core/dataManager.js`, `data/contracts/*` | CRUD + validação + contratos. |
| **Storage** | `core/storageManager.js` | Encapsula Dexie/IndexedDB. |
| **State** | `core/stateManager.js` | Estado único da UI. |
| **Events** | `core/eventBus.js` | Pub/sub desacoplado. |
| **Calculations** | `core/calculationsManager.js` | Métricas oficiais. |
| **Intelligence** | `core/intelligence/*` | Insights, recomendações, prioridades. |

---

## Os 9 cards

| Card | Ficheiro | O que mostra |
|------|----------|--------------|
| **Início** | `pages/cards/overview/` | Saudação + evolução + Hoje + Visão das áreas |
| **Progresso** | `pages/cards/progress/` | Índice de Evolução + 6 sinais |
| **Objetivo Principal** | `pages/cards/mainGoal/` | Objetivo isPrimary + marcos + tarefas |
| **Lumière** | `pages/cards/lumiere/` | Vendas + receita + lucro + produtos |
| **Finanças** | `pages/cards/finances/` | Saldo + contas + top categorias + movimentos |
| **Hoje** | `pages/cards/today/` | Progresso do dia + tarefas + hábitos + eventos |
| **Progresso Semanal** | `pages/cards/weeklyProgress/` | Score 7 dias + gráfico + resumo |
| **Insights** | `pages/cards/insights/` | Prioridades + insights + recomendações |
| **Relatórios** | `pages/cards/reports/` | Análise histórica por período |

---

## Navegação

**Bottom nav:** Início · Hábitos · Progresso · Hoje · Mais

**Sheet Mais:** Objetivo Principal · Progresso Semanal · Finanças · Lumière · Insights · Estudos · Objetivos · Calendário · Notas · Relatórios · Configurações

---

## Manutenção

### Backup

```bash
tar -czf ~/lumiere-backup-$(date +%F).tar.gz \
  --exclude="node_modules" \
  --exclude=".git" \
  -C ~/storage/shared LumiereLifeManager
```

### Verificação rápida

```bash
node --check pages/cards/<nome>/<ficheiro>.js
grep -n "referencia" pages/cards/<nome>/<ficheiro>.js
```

### Cache do Service Worker

Após alteração de ficheiros, bump do `CACHE_NAME` em `sw.js`:

```bash
sed -i "s/lumiere-cache-vNNN/lumiere-cache-vNNN+1/" sw.js
```

---

## Versão

**v1.0.0** — Fase 11 + Fase 9 (Intelligence) + Relatórios completos.

Ver `docs/STATE.md` para estado detalhado e histórico de commits.
