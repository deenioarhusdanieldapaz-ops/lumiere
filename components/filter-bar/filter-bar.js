/**
 * components/filter-bar/filter-bar.js
 * Componente universal de filtros.
 */

import { eventBus } from '../../core/eventBus.js';

export function renderFilterBar(container, options, defaultKey = 'all') {
  let bar = container.querySelector('.filter-bar');
  if (bar) {
    bar.innerHTML = '';
  } else {
    bar = document.createElement('div');
    bar.className = 'filter-bar';
    container.appendChild(bar);
  }

  // Resetar o scroll para o início sempre que a barra é renderizada
  setTimeout(() => { bar.scrollLeft = 0; }, 10);

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-chip' + (opt.key === defaultKey ? ' is-active' : '');
    btn.textContent = opt.label;
    
    btn.addEventListener('click', () => {
      const chips = bar.querySelectorAll('.filter-chip');
      chips.forEach(c => c.classList.remove('is-active'));
      btn.classList.add('is-active');
      eventBus.emit('filter:changed', { page: container.id, filterKey: opt.key });
    });

    bar.appendChild(btn);
  });
  
  return bar;
}
