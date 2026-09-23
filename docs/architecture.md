# Arquitetura do Lumière Life Manager

## Visão geral

Arquitetura híbrida/inteligente, baseada em camadas:

- **UI (Pages/Components)**: Renderização e interação. Não contém regras de negócio.
- **Core**: Orquestração, State Manager, Storage Manager, Event Bus, Data Manager, Calculations Manager.
- **Data**: Contratos, entidades, relações, validação.
- **Intelligence**: Interpretação de dados calculados (insights, recomendações, prioridades).

## Fluxos principais

- Abertura: Core carrega estado → Data Manager carrega entidades → Calculations calcula métricas → Intelligence avalia → Dashboard monta → UI renderiza.
- Alteração: Módulo salva → Event Bus emite → Core recalcula → Dashboard atualiza seções afetadas.
- Criação de registro: Formulário → validação → Core/Data → Storage → Event → State → Analytics → UI.

## Regras de dependência

- Pages → Core/Data/Components
- Components → Core (se necessário)
- Core → Data e Events
- Intelligence → resultados calculados + contexto
- UI nunca acessa Storage diretamente.
