/**
 * Section: Quote
 *
 * Rodapé do Dashboard — citação inspiradora + assinatura manuscrita.
 * NÃO importa Core.
 */

const QUOTES = [
  { text: 'O progresso não acontece por acaso. Acontece por escolha.', author: 'Lumiere' },
  { text: 'A disciplina de hoje é a liberdade de amanhã.', author: 'Lumiere' },
  { text: 'Pequenos passos diários constroem grandes mudanças.', author: 'Lumiere' },
  { text: 'Foca no que podes controlar. O resto segue.', author: 'Lumiere' },
  { text: 'Cada dia é uma nova oportunidade de evoluir.', author: 'Lumiere' }
];

/**
 * Escolhe uma citação — estável durante a sessão (por dia).
 * @returns {Object}
 */
function pickDailyQuote() {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const idx = seed % QUOTES.length;
  return QUOTES[idx];
}

export const quoteSection = {
  id: 'quote',
  order: 999,

  /**
   * @param {HTMLElement} container
   * @param {Object} context
   */
  render(container, context = {}) {
    const wrapper = document.createElement('section');
    wrapper.className = 'dashboard-section dashboard-section--quote';
    wrapper.setAttribute('aria-label', 'Citação');

    const quote = pickDailyQuote();

    const inner = document.createElement('div');
    inner.className = 'dashboard-quote';

    const text = document.createElement('p');
    text.className = 'dashboard-quote__text';
    text.textContent = '“' + quote.text + '”';
    inner.appendChild(text);

    const sign = document.createElement('div');
    sign.className = 'dashboard-quote__sign';
    sign.textContent = quote.author;
    inner.appendChild(sign);

    wrapper.appendChild(inner);
    container.appendChild(wrapper);
  }
};

export default quoteSection;
