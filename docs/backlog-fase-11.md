# Backlog — Fase 11 (pendentes)

**Data:** 15/09/2026
**Estado:** em curso

## Já concluído

| Bloco | Item | Estado |
|---|---|---|
| **A** | Sistema de ícones SVG (Lucide inline, 13 ícones) | ✅ Fechado |
| **B.1** | Cabeçalho da sidebar (símbolo + LUMIÈRE + LIFE MANAGER) | ✅ Fechado |
| **B.2** | Secções da sidebar + renomeações + Relatórios (disabled) | ✅ Fechado |
| **B.3** | Rodapé com avatar + nome + "Meu progresso" | ✅ Fechado |
| **B.4** | Topbar com brand + sino + avatar | ✅ Fechado |
| **B.5** | Ajustes de tamanho + correção de layout sticky | ✅ Fechado |

## Pendentes

### Pendente 1 — Painel de notificações (sino)

**Onde se implementa:**
- **Handler** → novo ficheiro `js/notifications.js`
- **Painel** → `index.html` + CSS (dropdown)
- **Conteúdo** → lê entidade `Reminder` do IndexedDB via `dataManager`

**O que faz:**
- Clique no sino abre dropdown por baixo
- Lista de lembretes próximos/atrasados
- Botão "marcar como visto"
- Contador no ponto vermelho

**Estimativa:** 2-4 horas

**Dependências:**
- Entidade `Reminder` já existe em `data/contracts/`
- `dataManager` já expõe `.list('reminders')`

---

### Pendente 2 — Página de perfil + upload de foto

**Onde se implementa:**
- **Página** → novo módulo `pages/profile/profile.js + .css + .html`
- **Handler** → `js/app.js` (ouvir clique em `btn-profile` e `topbar-user`)
- **Upload** → `<input type="file">` + leitura como base64
- **Persistência** → IndexedDB (entidade `UserProfile`) + fallback localStorage

**O que faz:**
- Ecrã de perfil com campos (nome, foto, tema, etc.)
- Upload de foto de perfil (guardada como base64)
- Avatar no rodapé/topbar passa a mostrar foto em vez de iniciais

**Estimativa:** 4-6 horas

**Dependências:**
- Entidade `UserProfile` já existe em `data/contracts/`
- Preferências já guardadas em `localStorage.lumierePreferences`

---

### Pendente 3 — Dashboard cards (Bloco C)

**Onde se implementa:**
- **Dashboard** → `pages/dashboard/sections/*` + novo CSS
- **Cards** identificados na referência:
  1. Progresso Geral (círculo 78%)
  2. Hoje (3 de 5 tarefas)
  3. Objetivo Principal (barra 68%)
  4. Finanças (valores)
  5. Lumière (12 vendas + meta)
  6. Progresso Semanal (gráfico linha)
  7. Visão Geral Rápida (lista com checks)

**Estimativa:** 5-7 horas

**Dependências:**
- Cálculos já existem em `core/calculationsManager.js`
- Intelligence já existe (`core/intelligence/`)

---

### Pendente 4 — Gráficos + rodapé (Bloco D)

**Onde se implementa:**
- **Círculo progresso** → SVG animado
- **Gráfico linha** → SVG puro (sem biblioteca)
- **Rodapé citação** → HTML + CSS + assinatura

**Estimativa:** 3-4 horas

**Dependências:**
- Nenhuma

---

## Ordem recomendada

1. **Pendente 1** (sino) — pequeno, visível, fecha funcionalidade parcial
2. **Pendente 2** (perfil) — importante para uso real
3. **Pendente 3** (Dashboard cards) — redesign maior
4. **Pendente 4** (gráficos + rodapé) — fecha Fase 11

## Notas

- Cada pendente é um **bloco autónomo** com commit próprio
- Todos seguem o protocolo: inspecionar → planear → aplicar → verificar → commit
- Se um pendente revelar dependência nova, para e reporta antes de avançar
