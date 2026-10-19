/**
 * core/filterEngine.js
 * Motor de filtragem universal.
 */

export function applyFilters(items, activeFilter) {
  if (!items || !Array.isArray(items)) return [];
  if (!activeFilter || activeFilter === 'all') return items;

  return items.filter(item => {
    // Lógica para Tarefas
    if (activeFilter === 'pending') return item.status !== 'completed' && item.status !== 'cancelled';
    if (activeFilter === 'completed') return item.status === 'completed';
    if (activeFilter === 'high') return item.priority === 'high';

    // Lógica para Hábitos (exemplo futuro)
    if (activeFilter === 'active') return item.status !== 'archived';
    if (activeFilter === 'archived') return item.status === 'archived';

    // Lógica para Finanças (exemplo futuro)
    if (activeFilter === 'income') return item.type === 'income';
    if (activeFilter === 'expense') return item.type === 'expense';

    // Default
    return true;
  });
}
