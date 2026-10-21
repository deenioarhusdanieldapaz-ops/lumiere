import { getWeeklyStats } from '../../core/weeklyReview.js';
import { createDataState } from './weeklyReview.data.js';
import { createScreen2 } from './weeklyReview.screen2.js';
import { createScreen3 } from './weeklyReview.screen3.js';
import { createScreen4 } from './weeklyReview.screen4.js';
import { createScreen5 } from './weeklyReview.screen5.js';
import { createScreen6 } from './weeklyReview.screen6.js';
import { createScreen7 } from './weeklyReview.screen7.js';
import { stateManager } from '../../core/stateManager.js';

let _container = null;
let _stats = null;
let _reviewData = {
  reflection: { well: '', difficult: '' },
  wellbeing: '',
  priorities: ['', '', ''],
  notes: ''
};

export async function initWeeklyReview(container) {
  _container = container;
  try {
    _stats = await getWeeklyStats();
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    _stats = { tasks: { total: 0, completed: 0, percent: 0 }, habits: { total: 0, completed: 0, list: [] }, goals: { total: 0, completed: 0, list: [] }, weekStart: '', weekEnd: '' };
  }
  renderScreen1();
}

function renderScreen1() {
  if (!_container) return;
  _container.innerHTML = '';
  _container.appendChild(createDataState(_stats));
  setTimeout(() => {
    _container.querySelector('#wr1-btn-next')?.addEventListener('click', () => renderScreen2());
    _container.querySelector('#wr-btn-back')?.addEventListener('click', () => stateManager.navigateTo('overview'));
    _container.querySelector('#wr1-summary-chevron')?.addEventListener('click', () => renderScreen2());
    _container.querySelector('#wr1-btn-details')?.addEventListener('click', () => renderScreen3());
    _container.querySelector('#wr1-shortcut-reflection')?.addEventListener('click', () => renderScreen4());
  }, 50);
}

function renderScreen2() {
  if (!_container) return;
  _container.innerHTML = '';
  _container.appendChild(createScreen2(_stats));
  setTimeout(() => {
    _container.querySelector('#wr2-btn-back')?.addEventListener('click', () => renderScreen1());
    _container.querySelector('.wr2-btn-voltar')?.addEventListener('click', () => renderScreen3());
  }, 50);
}

function renderScreen3() {
  if (!_container) return;
  _container.innerHTML = '';
  _container.appendChild(createScreen3(_stats));
}

function renderScreen4() {
  if (!_container) return;
  _container.innerHTML = '';
  _container.appendChild(createScreen4(_stats, _reviewData));
}

function renderScreen5() {
  if (!_container) return;
  _container.innerHTML = '';
  _container.appendChild(createScreen5(_stats, _reviewData));
}

function renderScreen6() {
  if (!_container) return;
  _container.innerHTML = '';
  _container.appendChild(createScreen6(_stats, _reviewData));
}

function renderScreen7() {
  if (!_container) return;
  _container.innerHTML = '';
  _container.appendChild(createScreen7());
  setTimeout(() => {
    _container.querySelector('#wr7-btn-close')?.addEventListener('click', () => stateManager.navigateTo('overview'));
    _container.querySelector('#wr7-btn-progress')?.addEventListener('click', () => stateManager.navigateTo('overview'));
    _container.querySelector('#wr7-btn-restart')?.addEventListener('click', () => {
      _reviewData = { reflection: { well: '', difficult: '' }, wellbeing: '', priorities: ['', '', ''], notes: '' };
      renderScreen1();
    });
  }, 50);
}

document.addEventListener('weekly-review:go-to-screen1', () => renderScreen1());
document.addEventListener('weekly-review:go-to-screen2', () => renderScreen2());
document.addEventListener('weekly-review:go-to-screen3', () => renderScreen3());
document.addEventListener('weekly-review:go-to-screen4', () => renderScreen4());
document.addEventListener('weekly-review:go-to-screen5', () => renderScreen5());
document.addEventListener('weekly-review:go-to-screen6', () => renderScreen6());
document.addEventListener('weekly-review:go-to-screen7', () => renderScreen7());
