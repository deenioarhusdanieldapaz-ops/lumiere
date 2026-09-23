# Decisão — Navegação mobile (Fase 11 / P3)

**Data:** 16/09/2026
**Estado:** Aprovada — implementação em curso

## Contexto

O Dashboard atual tem 11 sections em lista vertical com scroll longo.
Em mobile o utilizador vê 2-3 por ecrã e tem de fazer scroll grande para
ver o resto. As sections vazias ("Sem dados...") agravam a sensação de
app dispersa.

## Decisão — Opção A: Full-screen

Quando o utilizador clica num card do Dashboard (ex: Tarefas), a vista
muda para full-screen com esse módulo. O Dashboard desaparece. O bottom
nav atualiza o item ativo.

**Razões:**
1. Padrão dominante em apps mainstream (Instagram, WhatsApp, Notion, Linear,
   Todoist, Spotify — 9 em 10 usam full-screen)
2. Performance: renderiza 1 vista de cada vez
3. Consistência: o utilizador já conhece este comportamento
4. Estado independente por vista (filtros, scroll)
5. Módulos têm conteúdo denso (listas, formulários) que precisa de espaço

## Estrutura do bottom nav — 5 itens


O "Mais" abre um sheet deslizante com:
- Estudos, Objetivos, Calendário, Notas, Lumière, Relatórios (disabled),
  Configurações, Insights

**Porquê 5 e não 9:** 9 itens numa barra de 60px é ingovernável —
texto minúsculo, precisão de toque impossível. 5 é o padrão da indústria.

## Dashboard compacto (novo Início)

Estrutura (baseada na referência visual fornecida):
1. Saudação ("Bom dia, Nome")
2. **4 mini-cards em grelha 2×2:** Tarefas · Hábitos · Objetivos · Finanças
3. Gráfico semanal (lineChart)
4. Próximas tarefas (lista curta)
5. Hábitos de hoje (lista com checks)

## Decisão arquivada para o futuro — Opção B

**Opção B: Expandir inline (acordeão)**

Guardada para uso futuro, aplicável quando:
- Preview rápido de 2-3 linhas
- Ajustar filtros com resultados em tempo real
- Conteúdo curto que faz sentido ver no contexto

Exemplos onde já é usada: Apple Wallet, Notas iOS, Twitter/X (respostas),
Airbnb (filtros), Reddit mobile (comentários).

Não aplicável agora porque os módulos do Lumière têm listas longas,
formulários e sub-navegação — precisam de espaço total.

## Adaptação por dispositivo

- **Mobile (< 768px):** sidebar escondida; bottom nav visível
- **Desktop (≥ 768px):** sidebar visível; bottom nav escondido

## Sub-blocos de implementação

| Sub | O que faz |
|---|---|
| P3.1 | Bottom nav (HTML + CSS + JS) |
| P3.2 | Sheet "Mais" (módulos secundários) |
| P3.3 | Dashboard compacto (substituir as 11 sections atuais) |
| P3.4 | Ligação cards → módulos full-screen |
| P3.5 | Adaptação sidebar (esconder em mobile) |
| P3.6 | Teste final + commit |
