# Decisão — Fase 9: Intelligence explicável

**Data:** 13/09/2026
**Estado:** Fechada
**Âmbito:** `core/intelligence/` (4 serviços) + `pages/dashboard/sections/insights.js`

## Princípio
Intelligence interpreta resultados calculados. Nunca inventa contexto.
Dados insuficientes → "não calculável". Nunca "0".

## Os 4 serviços

### `insights.js` — observações
- Entradas: `collections` (tasks, habits, habitLogs, goals, calendarEvents, financeTransactions).
- Regras: 6 gatilhos determinísticos (tarefas vencidas, tarefas estagnadas, inatividade de hábitos, objetivos em atraso, eventos de hoje, saldo mensal).
- Saída: `Array<{ id, severity: 'info'|'attention'|'warning', category, title, description }>`.
- Sem base: `[]`. Cada regra é protegida por condicional.
- Gatilhos de severidade: `warning` quando ≥5 vencidas ou ≥7 dias sem hábitos; `attention` caso contrário.

### `priorities.js` — ordenação
- Entradas: `collections`, `limit` (default 5).
- Pesos de ranking (ordenação, não dados): overdue 100+dias×5 · hoje 80 · evento hoje 70 · objetivo próximo 60−dias×5 · hábito pendente 40.
- Saída: `Array<{ score, type, refId, title, detail }>` ordenado desc.
- Sem base: `[]`.

### `recommendations.js` — sugestões
- Entradas: `collections` + `insights[]`.
- 7 regras: começar pela tarefa mais antiga, reiniciar hábito, agendar 3 tarefas, finalizar objetivo quase concluído, revisão financeira, atualizar saldos, primeiros passos.
- Prioridades: `high` | `medium` | `low`.
- Saída: `Array<{ id, priority, category, title, action }>`.
- Sem base: `[]` ou o único `rec-first-steps` (onboarding explícito, não inventa contexto).

### `lumiereIndex.js` — Índice de Evolução (0–100)
- 6 sinais com pesos fixos: tarefas 25 · hábitos 25 · objetivos 20 · finanças 15 · estudos 10 · reflexão 5.
- Cada sinal tem o seu próprio mínimo (ex.: ≥3 tarefas nos últimos 30 dias; ≥1 hábito ativo).
- Sinais sem base são excluídos, não contados como zero.
- Se sobram sinais, os pesos são redistribuídos proporcionalmente pelos presentes (renormalização, não invenção).
- Se nenhum sinal tem base: `{ score: null, reason: 'não calculável', signals: [] }`.

## Fluxo na UI
- Section `insights` importa os 4 serviços, chama-os uma vez por render, e monta DOM.
- Não conhece limiares nem pesos.
- Estados distintos renderizados:
  - Score válido → número + `reason` + lista de sinais (label · raw · value).
  - Score nulo → texto "Índice de Evolução: não calculável".
  - Sem dados nenhuns → mensagem única "Sem base mínima de dados".

## Regras respeitadas
- UI não reimplementa regras.
- Sem dados ≠ zero ≠ erro.
- Sem inventar pontuação.
- Pesos e sinais explicáveis no código (comentário no topo de `lumiereIndex.js`).
- Sem dependências circulares (4 serviços folha; section orquestra).

## Dívidas / evoluções futuras
- Sinais do índice são fixos no código. Torná-los configuráveis fica para Fase 13 (internacionalização).
- Sem testes automatizados (limitação Termux — ver `docs/auditoria-0-a-9.md`).
