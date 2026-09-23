# Lumière Life Manager — Estado do Projecto

**Data:** 21 Setembro 2026
**Fase actual:** Fase 11 (Polimento) — FECHADA
**Próxima:** Fase 9 (Intelligence) → Fase 12 (Entrega)

---

## Cards implementados (7)

| Card | Ficheiro | Estados |
|---|---|---|
| Início (Overview) | pages/cards/overview/ | vazio + dados |
| Progresso | pages/cards/progress/ | vazio + dados |
| Objetivo Principal | pages/cards/mainGoal/ | vazio + dados |
| Lumière | pages/cards/lumiere/ | vazio + dados |
| Finanças | pages/cards/finances/ | vazio + dados |
| Hoje | pages/cards/today/ | vazio + dados |
| Progresso Semanal | pages/cards/weeklyProgress/ | vazio + dados |

## Navegação

- **Bottom nav:** Início · Hábitos · Progresso · Hoje · Mais
- **Sheet Mais:** Objetivo Principal · Progresso Semanal · Finanças · Estudos · Objetivos · Calendário · Notas · Lumière · Configurações

## Componentes reutilizáveis

- progress-ring — anel circular com valor central
- bar-chart — barras verticais (suporta linha da média)
- line-chart — gráfico de linha
- mini-card — pequeno cartão
- stat-row — linha de estatística
- sheet — gaveta modal

## Convenções visuais

- Tema escuro (noir) padrão, tema claro (lumiere) opcional
- Cards escuros: fundo #0d0a07 a #1f1508, borda rgba(212,175,55,0.22), texto #f0e6d2
- Tipografia: Cinzel (títulos) + Manrope (corpo)
- Dourado principal: #d4af37
- formatMoney: 1.234,56 MT (padrão PT/MZ)

## Arquitectura

**Fluxo:** UI → Core → DataManager → Storage (Dexie/IndexedDB)

**Regras invioláveis:**
- UI nao fala com Dexie/IndexedDB directamente
- State Manager e fonte unica do estado
- Storage Manager encapsula persistencia
- EventBus desacopla comunicacao
- Intelligence interpreta resultados calculados (nao inventa)

## Contratos de dados

| Coleccao | Campos principais |
|---|---|
| userProfiles | id, name |
| tasks | name, category, priority, status, dueDate, startDate, goalId |
| habits | name, status |
| habitLogs | habitId, date, completed |
| goals | name, category, status, progress, isPrimary, targetDate |
| goalMilestones | goalId, name, status, dueDate |
| studySessions | studyId, date, duration |
| studies | name, subject |
| calendarEvents | title, start, end, category |
| financeAccounts | name, type, balance, currency (MZN) |
| financeTransactions | accountId, type, amount, date, category |
| budgets | name, category, amount, period |
| lumiereBusinesses | name, monthlyGoal |
| lumiereProducts | name, price, cost |
| lumiereCustomers | name, email, phone |
| lumiereSales | productId, customerId, quantity, unitPrice, total, date, status |
| notes | title, content |
| categories | name |
| tags | name |
| preferences | key, value |

**20 categorias** em Financas (9 universais + 11 especificas).

## Como correr localmente

cd ~/storage/shared/LumiereLifeManager
python -m http.server 8080
# Abrir http://localhost:8080

**Diagnostico:** botao verde DBG no canto superior direito (temporario — remover na Fase 12).

## Backup

- Local: ~/lumiere-backup-YYYY-MM-DD.tar.gz (sem node_modules nem .git)
- Git remote: pendente de configurar corretamente

## Problemas conhecidos / TODO

- [ ] Push para GitHub falha com "Repository not found" — investigar owner/URL exacto
- [ ] pages/dashboard-old/ — arquivo historico. Verificar que nada importa.
- [ ] Segunda linha da sidebar ainda mostra alguns modulos antigos
- [ ] dbg panel — remover na Fase 12

## O que falta

### Fase 9 — Intelligence
- Insights automaticos (baseados em dados reais, com base minima)
- Recomendacoes contextuais
- Prioridades ordenadas
- Indice de Evolucao — ja implementado (core/intelligence/lumiereIndex.js)

### Fase 12 — Entrega
- README final com instrucoes de instalacao
- Build do APK (via PWA Builder ou Capacitor)
- Tag de versao
- Limpeza: remover DBG, consolidar dashboard-old

## Historico de commits principais

- d0ba70f F11: barChart suporta linha da media + polish Progresso Semanal
- 8c87642 F11: formatMoney com locale PT/MZ
- 5346ee9 F11-F: card Progresso Semanal completo
- d819c79 F11-E: card Hoje completo + nav
- 1f08e77 F11-D: card Financas completo + 20 categorias
- 6704ae1 F11-C: card Lumiere completo
- 733ceea F11-BC: card Objetivo Principal
- 4479ccb F11-B: card Lumiere (base)
- 4a64bc3 F11-B2B: card A TUA EVOLUCAO
- 011ebc8 F11-B2A: saudacao contextual + orientacao portrait

---

**Fim do documento.**
