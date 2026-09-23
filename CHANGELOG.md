# Changelog — Lumière Life Manager

Todas as mudanças relevantes do projeto. Formato baseado em [Keep a Changelog](https://keepachangelog.com/).

---

## [1.0.0] — 21 Setembro 2026

Primeira versão estável. Aplicação PWA completa e funcional.

### Adicionado

**Fase 11 — Polimento + Cards**

- Card **Início** (Overview) — saudação contextual + evolução + Hoje + grelha de áreas
- Card **Progresso** — Índice de Evolução com 6 sinais detalhados
- Card **Objetivo Principal** — foco com marcos + tarefas ligadas
- Card **Lumière** — vendas + receita + lucro + produtos mais vendidos
- Card **Finanças** — saldo + contas + top categorias + movimentos recentes
- Card **Hoje** — progresso do dia + tarefas + hábitos + eventos + estudos
- Card **Progresso Semanal** — score 7 dias + gráfico + maior actividade + resumo
- Card **Insights** — prioridades + insights + recomendações (Intelligence)
- Card **Relatórios** — análise por período (7d / 30d / 90d / 1 ano)

**Navegação**

- Bottom nav final: Início · Hábitos · Progresso · Hoje · Mais
- Sheet Mais com secções: Cards · Módulos · Sistema
- Sidebar reorganizada por secções (Principal, Acesso Rápido, Organização, Finanças, Negócio, Análise, Sistema)

**Intelligence (Fase 9)**

- `lumiereIndex.js` — Índice de Evolução (0-100) com 6 sinais ponderados
- `insights.js` — observações determinísticas sobre dados reais
- `recommendations.js` — sugestões accionáveis com base mínima
- `priorities.js` — ranking de itens por score de urgência
- **context-line** distribuída em 5 cards (Hoje, Progresso, Objetivo, Lumière, Finanças)

**Componentes**

- `progress-ring` — anel circular com valor central
- `bar-chart` — barras verticais (com linha da média opcional)
- `line-chart` — gráfico de linha com pontos
- `context-line` — linha fina contextual com 4 variantes
- `sheet` — gaveta modal com suporte a secções
- `stat-row`, `mini-card`, `card`, `menu`, `empty-state`

**Dados**

- 21 contratos formalizados (Task, Habit, Goal, Study, Finance, Lumière, etc.)
- 20 categorias oficiais (9 universais + 11 específicas de Finanças)
- Persistência em IndexedDB (via Dexie)
- `formatMoney` com locale PT/MZ (1.234,56 MT)

### Melhorado

- Identidade visual noir + dourado + branco, Cinzel + Manrope
- Temas: noir (padrão), lumiere (claro), auto
- Responsividade mobile-first
- Estados vazios distintos dos estados com dados
- Orientação portrait bloqueada no manifest PWA

### Alterado

- Dashboard antigo arquivado em `pages/dashboard-old/` (não carregado)
- Terminologia uniformizada: card em vez de secção
- Navegação centralizada no `navigation.js`

### Removido

- Debug panel (DBG) — removido do `index.html` (ficheiro preservado)
- Import do dashboard antigo em `app.js`
- Link CSS do dashboard antigo

---

## [0.0.1] — Setembro 2026 (histórico)

Fases iniciais (0-10) documentadas no manual mestre. Incluíam:

- Preparação do ambiente (Android + Acode + Termux)
- Base HTML semântica
- Sistema visual (tokens, temas, componentes)
- Core mínimo (State, Storage, EventBus, DataManager)
- Contratos de dados
- Componentes reutilizáveis
- Navegação
- Dashboard inicial (arquivado)
- Módulos CRUD básicos
- Testes de qualidade

Ver `docs/STATE.md` para detalhes.
