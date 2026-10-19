
// --- GESTÃO DE LISTENER GLOBAL (TEMPLATES) ---
if (!window.__lumiereTemplateMenuListener) {
  window.__lumiereTemplateMenuListener = true;
  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    if (!e.target.closest('details.templates-item__actions')) {
      document.querySelectorAll('details.templates-item__actions[open]').forEach(d => d.removeAttribute('open'));
    }
  });
}
/**
 * Templates Page
 *
 * Lista de templates reutilizáveis (Tarefas, Hábitos, Estudos, Objetivos, Notas).
 * Consome dataManager.templates.* (Bloco 2.1).
 * NÃO contém regras de negócio.
 */
import { dataManager } from '../../core/dataManager.js';
import { requireAccess } from '../../core/auth.js';
import { eventBus } from '../../core/eventBus.js';
import { createMenu } from '../../components/menu/menu.js';
import { t } from '../../js/i18n.js';

// ============================================================
// Metadados dos módulos destino
// ============================================================
const APPLIES_TO_META = {
  tasks:    { label: 'Tarefas',   icon: '\u{1F4DD}' },
  habits:   { label: 'Hábitos',   icon: '\u{1F504}' },
  studies:  { label: 'Estudos',   icon: '\u{1F4DA}' },
  goals:    { label: 'Objetivos', icon: '\u{1F3AF}' },
  notes:    { label: 'Notas',     icon: '\u{1F4D6}' }
};

const APPLIES_TO_ORDER = ['tasks', 'habits', 'studies', 'goals', 'notes'];

let _container = null;
let _state = {
  templates: [],
  filterAppliesTo: 'all',
  loading: false,
  error: null,
  showForm: false,
  editingId: null
};
let _unsubscribe = null;

export function initTemplates(container) {
  if (!container) {
    console.warn('[Templates] container inválido.');
    return;
  }
  _container = container;

  if (_unsubscribe) _unsubscribe();
  _unsubscribe = eventBus.on('data:changed', (payload) => {
    if (payload && payload.collection === 'templates') {
      loadTemplates();
    }
  });

  loadTemplates();
  

}

async function loadTemplates() {
  _state.loading = true;
  _state.error = null;
  render();

  try {
    const list = await dataManager.list('templates');
    let arr = Array.isArray(list) ? list : [];
    arr = arr.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    _state.templates = arr;
  } catch (err) {
    console.error('[Templates] Erro ao carregar:', err);
    _state.error = err.message || 'Erro ao carregar templates.';
    _state.templates = [];
  } finally {
    _state.loading = false;
    render();
  }
}

function render() {
  if (!_container) return;

  // VERIFICAÇÃO DE PREFILL
  const prefillJson = localStorage.getItem('lumiere_template_prefill');
  if (prefillJson && !_state.showForm) {
    try {
      const prefillData = JSON.parse(prefillJson);
      localStorage.removeItem('lumiere_template_prefill');
      _state.prefillData = prefillData;
      _state.showForm = true;
      _state.editingId = null;
    } catch (e) { console.error("Erro no prefill", e); }
  }


  _container.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'templates-page';

  page.appendChild(renderHeader());

  if (_state.showForm) {
    page.appendChild(renderForm());
  } else {
    page.appendChild(renderFilters());
  }

  if (_state.loading) {
    page.appendChild(renderState('A carregar templates…'));
  } else if (_state.error) {
    page.appendChild(renderState(_state.error, true));
  } else {
    if (_state.showForm) {
      // Formulário aberto — não mostra lista
    } else {
    const visible = getVisibleTemplates();
    if (visible.length === 0) {
      page.appendChild(renderState('Ainda não tens templates. Guarda um hábito/tarefa como template para começares.'));
    } else {
      const list = document.createElement('div');
      list.className = 'templates-list';
      for (const tpl of visible) list.appendChild(renderTemplateItem(tpl));
      page.appendChild(list);
    }
    }
  }

  _container.appendChild(page);
}

function getVisibleTemplates() {
  if (_state.filterAppliesTo === 'all') return _state.templates;
  return _state.templates.filter((tpl) => tpl.appliesTo === _state.filterAppliesTo);
}

function renderHeader() {
  const header = document.createElement('header');
  header.className = 'templates-header';

  const wrap = document.createElement('div');
  wrap.className = 'templates-header__text';

  const title = document.createElement('h2');
  title.className = 'templates-header__title';
  title.textContent = 'Templates';
  wrap.appendChild(title);

  const sub = document.createElement('p');
  sub.className = 'templates-header__subtitle';
  sub.textContent = 'Poupa tempo. Repete o que funciona.';
  wrap.appendChild(sub);

  header.appendChild(wrap);

  const actions = document.createElement('div');
  actions.className = 'templates-header__actions';

  const btnNew = document.createElement('button');
  btnNew.type = 'button';
  btnNew.className = 'templates-btn templates-btn--primary';
  btnNew.textContent = '+ Novo';
  btnNew.addEventListener('click', () => openForm());
  actions.appendChild(btnNew);

  header.appendChild(actions);
  return header;
}

function renderFilters() {
  const nav = document.createElement('nav');
  nav.className = 'templates-filters';

  const items = [{ id: 'all', label: 'Todas' }];
  for (const key of APPLIES_TO_ORDER) {
    items.push({ id: key, label: APPLIES_TO_META[key].label });
  }

  for (const item of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'templates-filter';
    if (item.id === _state.filterAppliesTo) btn.classList.add('is-active');
    btn.textContent = item.label;
    btn.addEventListener('click', () => {
      _state.filterAppliesTo = item.id;
      render();
    });
    nav.appendChild(btn);
  }

  return nav;
}

function renderTemplateItem(tpl) {
  const item = document.createElement('article');
  item.className = 'lum-card lum-card--template templates-item';

  const meta = APPLIES_TO_META[tpl.appliesTo] || { label: '—', icon: '📌' };

  const header = document.createElement('div');
  header.className = 'lum-card__header templates-item__header';
  const headerLeft = document.createElement('div');
  headerLeft.className = 'lum-card__header-left templates-item__header-left';

  // Ícone SVG de Prancheta (Premium)
  const icon = document.createElement('span');
  icon.className = 'lum-card__icon templates-item__icon';
  const svgIcon = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 14l2 2 4-4"></path></svg>';
  
  if (tpl.icon) {
    icon.textContent = tpl.icon;
  } else {
    icon.innerHTML = svgIcon;
  }
  icon.setAttribute('aria-hidden', 'true');
  headerLeft.appendChild(icon);

  const name = document.createElement('h3');
  name.className = 'lum-card__title templates-item__name';
  name.textContent = tpl.name || '(sem nome)';
  headerLeft.appendChild(name);
  header.appendChild(headerLeft);

  // Menu de 3 Pontos (Sólido e Ancorado)
  const actions = document.createElement('details');
  actions.className = 'lum-card__actions templates-item__actions';
  const summary = document.createElement('summary');
  summary.className = 'templates-item__menu-btn';
  summary.innerHTML = '⋮';
  summary.setAttribute('aria-label', 'Opções do template');
  actions.appendChild(summary);
  
  const menuDropdown = document.createElement('div');
  menuDropdown.className = 'templates-item__menu-dropdown';

  const btnEdit = document.createElement('button');
  btnEdit.type = 'button';
  btnEdit.innerHTML = '✎ Editar';
  btnEdit.addEventListener('click', (e) => { e.preventDefault(); actions.removeAttribute('open'); openForm(tpl.id); });
  menuDropdown.appendChild(btnEdit);

  const btnDuplicate = document.createElement('button');
  btnDuplicate.type = 'button';
  btnDuplicate.innerHTML = '⧉ Duplicar';
  btnDuplicate.addEventListener('click', (e) => { e.preventDefault(); actions.removeAttribute('open'); handleDuplicate(tpl); });
  menuDropdown.appendChild(btnDuplicate);

  const btnDelete = document.createElement('button');
  btnDelete.type = 'button';
  btnDelete.innerHTML = '✕ Eliminar';
  btnDelete.addEventListener('click', (e) => { e.preventDefault(); actions.removeAttribute('open'); handleDelete(tpl); });
  menuDropdown.appendChild(btnDelete);

  actions.appendChild(menuDropdown);
  header.appendChild(actions);
  item.appendChild(header);

  // Tags
  const meta_row = document.createElement('div');
  meta_row.className = 'templates-item__meta';
  if (tpl.appliesTo && APPLIES_TO_META[tpl.appliesTo]) meta_row.appendChild(metaTag(meta.label));
  if (tpl.category) meta_row.appendChild(metaTag(t('category', tpl.category)));
  if (tpl.usageCount && tpl.usageCount > 0) meta_row.appendChild(metaTag('Usado ' + tpl.usageCount + 'x'));
  item.appendChild(meta_row);

  // Descrição Expansível (Ler Mais)
  if (tpl.description) {
    const descWrap = document.createElement('div');
    descWrap.className = 'templates-item__desc-wrap';
    const desc = document.createElement('p');
    desc.className = 'templates-item__description';
    desc.textContent = tpl.description;
    descWrap.appendChild(desc);

    const btnReadMore = document.createElement('button');
    btnReadMore.type = 'button';
    btnReadMore.className = 'templates-item__read-more';
    btnReadMore.textContent = 'Ler mais';
    btnReadMore.style.display = 'none';
    descWrap.appendChild(btnReadMore);
    item.appendChild(descWrap);

    btnReadMore.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = descWrap.classList.toggle('is-expanded');
      btnReadMore.textContent = isExpanded ? 'Mostrar menos' : 'Ler mais';
      if (!isExpanded) btnReadMore.style.display = (desc.scrollHeight > desc.clientHeight + 2) ? 'block' : 'none';
    });

    const observer = new ResizeObserver(() => {
      if (descWrap.classList.contains('is-expanded')) {
        btnReadMore.style.display = 'block';
        return;
      }
      btnReadMore.style.display = (desc.scrollHeight > desc.clientHeight + 2) ? 'block' : 'none';
    });
    observer.observe(desc);
    
    const listObserver = new MutationObserver(() => {
      if (!document.body.contains(desc)) {
        observer.disconnect();
        listObserver.disconnect();
      }
    });
    listObserver.observe(document.body, { childList: true, subtree: true });
  }

  // Rodapé (Data e Seta)
  const footer = document.createElement('div');
  footer.className = 'templates-item__footer';
  
  let dateStr = '';
  if (tpl.createdAt || tpl.updatedAt) {
    const d = new Date(tpl.createdAt || tpl.updatedAt);
    const now = new Date();
    const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    const timeStr = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    dateStr = isToday ? `Hoje, ${timeStr}` : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}, ${timeStr}`;
  } else {
    dateStr = 'Hoje, 09:00'; // Fallback visual se não houver data
  }

  const dateSpan = document.createElement('span');
  dateSpan.className = 'templates-item__footer-info';
  const calIcon = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px; vertical-align:text-bottom;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
  dateSpan.innerHTML = calIcon;
  dateSpan.appendChild(document.createTextNode(' ' + dateStr));
  footer.appendChild(dateSpan);

  const arrowIcon = document.createElement('span');
  arrowIcon.className = 'templates-item__arrow';
  arrowIcon.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';
  footer.appendChild(arrowIcon);

  item.appendChild(footer);
  return item;
}

function metaTag(text) {
  const span = document.createElement('span');
  span.className = 'templates-item__tag';
  span.textContent = text;
  return span;
}

function renderState(message, isError = false) {
  const el = document.createElement('div');
  el.className = 'templates-state' + (isError ? ' templates-state--error' : '');
  el.textContent = message;
  return el;
}

async function handleDelete(tpl) {
  const name = tpl.name || '(sem nome)';
  if (!confirm('Apagar o template "' + name + '"?')) return;
  try {
    await dataManager.delete('templates', tpl.id);
    console.log('[Templates] Eliminado:', tpl.id);
  } catch (err) {
    console.error('[Templates] Erro ao eliminar:', err);
    alert('Erro ao eliminar: ' + (err.message || 'desconhecido'));
  }
}

async function handleDuplicate(tpl) {
  try {
    const copy = Object.assign({}, tpl);
    delete copy.id;
    delete copy.createdAt;
    delete copy.updatedAt;
    let baseName = tpl.name || 'Template';
    baseName = baseName.replace(/\s*\(cópia(?:\s+\d+)?\)\s*$/i, '');
    copy.name = baseName + ' (cópia)';
    await dataManager.create('templates', copy);
    console.log('[Templates] Duplicado:', tpl.id);
  } catch (err) {
    console.error('[Templates] Erro ao duplicar:', err);
    alert('Erro ao duplicar: ' + (err.message || 'desconhecido'));
  }
}

export const templatesPage = { init: initTemplates };
export default templatesPage;

// ==========================================
// GESTÃO DO FORMULÁRIO DE TEMPLATES
// ==========================================
function openForm(prefillData = null) {
  _state.editingId = null; // Neste patch apenas criamos novos
  _state.prefillData = prefillData;
  _state.showForm = true;
  render();
}

function renderForm() {
  const form = document.createElement('form');
  form.className = 'templates-form';
  form.noValidate = true;
  
  // Título do Formulário
  const title = document.createElement('h3');
  title.className = 'templates-form__title';
  title.textContent = 'Guardar como Template';
  form.appendChild(title);

  // Grid
  const grid = document.createElement('div');
  grid.className = 'templates-form__grid';

  const prefill = _state.prefillData || {};

  // Nome
  const wrapName = document.createElement('div');
  wrapName.className = 'templates-form__field templates-form__field--full';
  wrapName.innerHTML = '<label>Nome do Template *</label>';
  const inputName = document.createElement('input');
  inputName.type = 'text';
  inputName.name = 'name';
  inputName.required = true;
  inputName.value = prefill.name || '';
  wrapName.appendChild(inputName);
  grid.appendChild(wrapName);

  // Módulo Destino (Applies To)
  const wrapApplies = document.createElement('div');
  wrapApplies.className = 'templates-form__field';
  wrapApplies.innerHTML = '<label>Módulo Destino *</label>';
  const selectApplies = document.createElement('select');
  selectApplies.name = 'appliesTo';
  const opcoes = [
    { val: 'tasks', label: 'Tarefas' },
    { val: 'habits', label: 'Hábitos' },
    { val: 'studies', label: 'Estudos' },
    { val: 'goals', label: 'Objetivos' },
    { val: 'notes', label: 'Notas' }
  ];
  opcoes.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.val;
    opt.textContent = o.label;
    if (prefill.appliesTo === o.val) opt.selected = true;
    selectApplies.appendChild(opt);
  });
  wrapApplies.appendChild(selectApplies);
  grid.appendChild(wrapApplies);

  // Categoria
  const wrapCat = document.createElement('div');
  wrapCat.className = 'templates-form__field';
  wrapCat.innerHTML = '<label>Categoria *</label>';
  const selectCat = document.createElement('select');
  selectCat.name = 'category';
  const cats = ['personal','work','study','health','finance','home','lumiere','leisure','other'];
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c.charAt(0).toUpperCase() + c.slice(1);
    if (prefill.category === c) opt.selected = true;
    selectCat.appendChild(opt);
  });
  wrapCat.appendChild(selectCat);
  grid.appendChild(wrapCat);

  // Descrição
  const wrapDesc = document.createElement('div');
  wrapDesc.className = 'templates-form__field templates-form__field--full';
  wrapDesc.innerHTML = '<label>Descrição</label>';
  const inputDesc = document.createElement('textarea');
  inputDesc.name = 'description';
  inputDesc.value = prefill.description || '';
  wrapDesc.appendChild(inputDesc);
  grid.appendChild(wrapDesc);

  form.appendChild(grid);

  // Esconder o payload num input hidden (para guardar os dados originais da tarefa/nota)
  const hiddenPayload = document.createElement('input');
  hiddenPayload.type = 'hidden';
  hiddenPayload.name = 'payload';
  hiddenPayload.value = JSON.stringify(prefill.payload || {});
  form.appendChild(hiddenPayload);

  // Ações
  const actions = document.createElement('div');
  actions.className = 'templates-form__actions';
  
  const btnCancel = document.createElement('button');
  btnCancel.type = 'button';
  btnCancel.className = 'templates-btn';
  btnCancel.textContent = 'Cancelar';
  btnCancel.addEventListener('click', () => { _state.showForm = false; _state.prefillData = null; render(); });
  actions.appendChild(btnCancel);

  const btnSave = document.createElement('button');
  btnSave.type = 'submit';
  btnSave.className = 'templates-btn templates-btn--primary';
  btnSave.textContent = 'Guardar Template';
  actions.appendChild(btnSave);

  form.appendChild(actions);

  // Evento de Submissão
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    
    const newTemplate = {
      id: crypto.randomUUID?.() || Date.now().toString(36),
      name: formData.get('name'),
      appliesTo: formData.get('appliesTo'),
      category: formData.get('category'),
      description: formData.get('description'),
      payload: JSON.parse(formData.get('payload')),
      icon: '',
      tags: [],
      usageCount: 0,
      lastUsedAt: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      btnSave.textContent = 'A guardar...';
      btnSave.disabled = true;
      await dataManager.create('templates', newTemplate);
      _state.showForm = false;
      _state.prefillData = null;
      // O eventBus do loadTemplates vai tratar de recarregar a lista
    } catch (err) {
      console.error(err);
      alert('Erro ao guardar template: ' + err.message);
      btnSave.textContent = 'Guardar Template';
      btnSave.disabled = false;
    }
  });

  return form;
}
