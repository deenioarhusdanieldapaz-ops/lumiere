/**
 * Preview de Componentes — arquivo temporário de teste visual.
 * NÃO faz parte da árvore oficial. Pode ser removido após validação.
 */
import { createCard, createProgress, createEmptyState, createMenu } from '../components/index.js';

// ---------- CARD ----------
const cardsRoot = document.getElementById('preview-cards');

cardsRoot.appendChild(createCard({
  title: 'Card padrão',
  subtitle: 'Subtítulo opcional',
  content: 'Conteúdo de exemplo do card.'
}));

cardsRoot.appendChild(createCard({
  title: 'Card clicável',
  content: 'Clique em mim (ou use Enter/Espaço).',
  clickable: true,
  onClick: () => alert('Card clicado!')
}));

cardsRoot.appendChild(createCard({
  title: 'Card destacado',
  subtitle: 'variant highlight',
  content: 'Este card tem borda dourada.',
  variant: 'highlight'
}));

cardsRoot.appendChild(createCard({
  title: 'Card com ações',
  content: 'Possui ações no cabeçalho.',
  actions: ['edit', 'delete'],
  onAction: (a) => alert(`Ação: ${a}`)
}));

// ---------- PROGRESS ----------
const progressRoot = document.getElementById('preview-progress');

[0, 35, 70, 100].forEach(v => {
  progressRoot.appendChild(createProgress({
    value: v,
    label: `Progresso ${v}%`,
    size: 'md'
  }));
});

progressRoot.appendChild(createProgress({ label: 'Carregando', variant: 'loading', size: 'md' }));
progressRoot.appendChild(createProgress({ label: 'Sem dados', variant: 'empty', size: 'md' }));
progressRoot.appendChild(createProgress({ label: 'Erro ao carregar', variant: 'error', size: 'md' }));

// Tamanhos
['sm', 'md', 'lg'].forEach(s => {
  progressRoot.appendChild(createProgress({ value: 60, label: `Tamanho ${s}`, size: s }));
});

// ---------- EMPTY STATE ----------
const emptyRoot = document.getElementById('preview-empty');

emptyRoot.appendChild(createEmptyState({
  title: 'Sem tarefas',
  message: 'Você ainda não criou nenhuma tarefa.',
  icon: '○'
}));

emptyRoot.appendChild(createEmptyState({
  title: 'Sem tarefas',
  message: 'Você ainda não criou nenhuma tarefa.',
  icon: '○',
  actionLabel: 'Criar tarefa',
  onAction: () => alert('Criar tarefa clicado')
}));

emptyRoot.appendChild(createEmptyState({
  title: 'Sem dados',
  message: 'Versão compacta.',
  variant: 'compact'
}));

emptyRoot.appendChild(createEmptyState({
  title: 'Sem dados',
  message: 'Versão inline (sem borda).',
  variant: 'inline'
}));

// ---------- MENU ----------
const menuRoot = document.getElementById('preview-menu');

menuRoot.appendChild(createMenu({
  items: [
    { id: 'edit', label: 'Editar' },
    { id: 'duplicate', label: 'Duplicar' },
    { id: 'delete', label: 'Eliminar' }
  ],
  onSelect: (id) => alert(`Menu: ${id}`)
}));

menuRoot.appendChild(createMenu({
  align: 'left',
  triggerLabel: '▼',
  triggerAriaLabel: 'Mais opções',
  items: [
    { id: 'open', label: 'Abrir' },
    { id: 'archive', label: 'Arquivar', disabled: true },
    { id: 'settings', label: 'Configurações' }
  ],
  onSelect: (id) => alert(`Menu left: ${id}`)
}));
