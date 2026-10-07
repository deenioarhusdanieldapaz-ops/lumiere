/**
 * VoiceInterpreter
 *
 * Transforma transcrição (texto natural) em VoiceIntent estruturado.
 *
 * VoiceIntent:
 *   {
 *     input: 'criar tarefa estudar matemática amanhã',
 *     intent: 'create_task',
 *     title: 'Estudar matemática',
 *     dueDate: '2026-10-08',
 *     priority: 'medium',
 *     category: 'study',
 *     confidence: 0.96,
 *     source: 'voice',
 *     missingFields: [],
 *     ambiguousFields: []
 *   }
 *
 * NÃO grava no IndexedDB.
 * NÃO abre formulários.
 * Devolve apenas o objeto interpretado.
 *
 * Etapa E: foco em create_task. Outros intents ficam como UNKNOWN.
 */

export const INTENTS = {
  CREATE_TASK: 'create_task',
  CREATE_HABIT: 'create_habit',
  CREATE_EVENT: 'create_event',
  CREATE_NOTE: 'create_note',
  CREATE_EXPENSE: 'create_expense',
  CREATE_GOAL: 'create_goal',
  UNKNOWN: 'unknown'
};

/* ============================================================
   Utilitários
   ============================================================ */

function stripAccents(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalize(s) {
  return stripAccents(s).toLowerCase().trim();
}

function pad2(n) { return String(n).padStart(2, '0'); }

function ymdLocal(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
}

function todayLocal() {
  return ymdLocal(new Date());
}

function addDays(ymd, days) {
  const parts = ymd.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + days);
  return ymdLocal(d);
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ============================================================
   Padrões de intenção (ação)
   ============================================================ */

const ACTION_PATTERNS = [
  { intent: INTENTS.CREATE_TASK, patterns: [
    /\b(criar|nova|novo|adicionar|adiciona|marcar|marca|inserir|insere)\s+(uma\s+)?(tarefa|task)\b/,
    /\btarefa\s*[:\-]\s*/,
    /\btask\s*[:\-]\s*/
  ]},
  { intent: INTENTS.CREATE_HABIT, patterns: [
    /\b(criar|novo|nova|adicionar|adiciona|instituir)\s+(um\s+|uma\s+)?(habito|habit)\b/,
    /\bhabito\s*[:\-]\s*/
  ]},
  { intent: INTENTS.CREATE_EVENT, patterns: [
    /\b(criar|novo|nova|adicionar|adiciona|marcar|marca|agendar|agenda)\s+(um\s+|uma\s+)?(evento|compromisso|reuniao)\b/,
    /\bevento\s*[:\-]\s*/
  ]},
  { intent: INTENTS.CREATE_NOTE, patterns: [
    /\b(criar|nova|novo|adicionar|adiciona|anotar|anota|escrever|registar|registra)\s+(uma\s+|um\s+)?(nota|note)\b/,
    /\bnota\s*[:\-]\s*/,
    /\banotar\s+que\b/
  ]},
  { intent: INTENTS.CREATE_EXPENSE, patterns: [
    /\b(adicionar|adiciona|registar|registra|anotar|anota|gastei|paguei|comprei)\s+(uma\s+|um\s+)?(despesa|gasto|transacao|transacao|compra)\b/
  ]},
  { intent: INTENTS.CREATE_GOAL, patterns: [
    /\b(criar|novo|nova|adicionar|adiciona|definir|define|estabelecer)\s+(um\s+|uma\s+)?(objetivo|meta|goal)\b/,
    /\bobjetivo\s*[:\-]\s*/
  ]}
];

function detectIntent(normText) {
  for (const entry of ACTION_PATTERNS) {
    for (const p of entry.patterns) {
      if (p.test(normText)) return { intent: entry.intent, matched: true };
    }
  }
  return { intent: INTENTS.UNKNOWN, matched: false };
}

/* ============================================================
   Datas
   ============================================================ */

const WEEKDAYS = {
  domingo: 0, segunda: 1, 'segunda-feira': 1, terca: 2, 'terca-feira': 2,
  quarta: 3, 'quarta-feira': 3, quinta: 4, 'quinta-feira': 4,
  sexta: 5, 'sexta-feira': 5, sabado: 6
};

const MONTHS = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12
};

/**
 * Procura expressões de data no texto normalizado.
 * Devolve { dueDate: 'YYYY-MM-DD'|null, matchedText: string|null }.
 */
function extractDate(normText) {
  const today = todayLocal();

  // "depois de amanhã"
  if (/\bdepois de amanha\b/.test(normText)) {
    return { dueDate: addDays(today, 2), matchedText: 'depois de amanhã' };
  }

  // "amanhã"
  if (/\bamanha\b/.test(normText)) {
    return { dueDate: addDays(today, 1), matchedText: 'amanhã' };
  }

  // "hoje"
  if (/\bhoje\b/.test(normText)) {
    return { dueDate: today, matchedText: 'hoje' };
  }

  // "próxima semana" / "semana que vem"
  if (/\b(proxima semana|semana que vem)\b/.test(normText)) {
    return { dueDate: addDays(today, 7), matchedText: 'próxima semana' };
  }

  // "próximo mês"
  if (/\b(proximo mes|mes que vem)\b/.test(normText)) {
    return { dueDate: addDays(today, 30), matchedText: 'próximo mês' };
  }

  // "segunda", "terça-feira", etc (próxima ocorrência, sem contar hoje)
  for (const key of Object.keys(WEEKDAYS)) {
    const re = new RegExp('\\b' + key + '\\b');
    if (re.test(normText)) {
      const targetDay = WEEKDAYS[key];
      const now = new Date();
      const currentDay = now.getDay();
      let diff = (targetDay - currentDay + 7) % 7;
      if (diff === 0) diff = 7; // mesma weekday → próxima semana
      return { dueDate: addDays(today, diff), matchedText: key };
    }
  }

  // "dia 15" ou "no dia 15"
  const mDay = normText.match(/\b(?:no\s+)?dia\s+(\d{1,2})\b/);
  if (mDay) {
    const day = parseInt(mDay[1], 10);
    if (day >= 1 && day <= 31) {
      const now = new Date();
      const y = now.getFullYear();
      const mo = now.getMonth();
      const candidateThis = new Date(y, mo, day);
      if (candidateThis < now) {
        const candidateNext = new Date(y, mo + 1, day);
        return { dueDate: ymdLocal(candidateNext), matchedText: 'dia ' + day };
      }
      return { dueDate: ymdLocal(candidateThis), matchedText: 'dia ' + day };
    }
  }

  // "15 de outubro" ou "15 de outubro de 2026"
  const mFull = normText.match(/\b(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?\b/);
  if (mFull) {
    const day = parseInt(mFull[1], 10);
    const monthName = mFull[2];
    const yearOpt = mFull[3];
    const month = MONTHS[monthName];
    if (month) {
      const year = yearOpt ? parseInt(yearOpt, 10) : new Date().getFullYear();
      const d = new Date(year, month - 1, day);
      return { dueDate: ymdLocal(d), matchedText: mFull[0] };
    }
  }

  return { dueDate: null, matchedText: null };
}

/* ============================================================
   Categoria
   ============================================================ */

const CATEGORY_KEYWORDS = {
  study: ['estudar','estudo','matematica','fisica','quimica','biologia','historia','geografia','exame','prova','teste','aula','escola','universidade','disciplina','livro','curso','ler','leitura','trabalho de casa','tpc'],
  work: ['trabalho','reuniao','projeto','cliente','escritorio','chefe','relatorio','apresentacao','email','call','prazo','entrega','deadline','meeting','equipa','colega'],
  health: ['medico','dentista','ginasio','treino','correr','exercicio','farmacia','remedio','consulta','consulta','saude','hospital','vacina','alongar','yoga','caminhada'],
  finance: ['pagar','pagamento','dinheiro','banco','fatura','conta','comprar','investimento','poupanca','transferencia','despesa','receita','salario','orcamento','bci','millennium','emola','mpesa'],
  home: ['casa','limpar','arrumar','compras','supermercado','cozinhar','jantar','almoco','pequeno-almoco','lavar','roupa','passar','engomar','mercado','jardim'],
  lumiere: ['lumiere','negocio','produto','venda','stock','encomenda','fornecedor','cliente lumiere','faturacao','marketplace'],
  leisure: ['filme','serie','jogo','musica','amigos','familia','viagem','praia','ferias','descansar','relaxar','diversao','passeio','cinema'],
  personal: []
};

function inferCategory(normText) {
  let bestMatch = null;
  let bestScore = 0;
  for (const cat of Object.keys(CATEGORY_KEYWORDS)) {
    if (cat === 'personal') continue;
    for (const kw of CATEGORY_KEYWORDS[cat]) {
      if (normText.indexOf(kw) !== -1) {
        const score = kw.length; // keywords mais longas = mais específicas
        if (score > bestScore) {
          bestScore = score;
          bestMatch = cat;
        }
      }
    }
  }
  return bestMatch;
}

/* ============================================================
   Prioridade
   ============================================================ */

function inferPriority(normText) {
  if (/\b(urgente|urgencia|imediatamente|agora mesmo|hoje mesmo|para ja)\b/.test(normText)) return 'urgent';
  if (/\b(importante|prioritario|essencial|critico|alta prioridade)\b/.test(normText)) return 'high';
  if (/\b(baixa prioridade|quando puder|sem pressa|opcional|talvez|se der)\b/.test(normText)) return 'low';
  return null;
}

/* ============================================================
   Extração do título
   ============================================================ */

// Frases que devem desaparecer do início
const ACTION_PREFIXES = [
  /^(criar|nova|novo|adicionar|adiciona|marcar|marca|inserir|insere|instituir|definir|define|estabelecer|anotar|anota|escrever|registar|registra|agendar|agenda|gastei|paguei|comprei)\s+/,
  /^((uma|um|a|o)\s+)?(tarefa|task|habito|evento|compromisso|reuniao|nota|note|despesa|gasto|transacao|compra|objetivo|meta|goal)\b\s*/,
  /^\s*tarefa\s*[:\-]\s*/,
  /^\s*task\s*[:\-]\s*/,
  /^\s*habito\s*[:\-]\s*/,
  /^\s*evento\s*[:\-]\s*/,
  /^\s*nota\s*[:\-]\s*/,
  /^\s*objetivo\s*[:\-]\s*/,
  /^\s*anotar\s+que\s+/
];

function findTitleInRaw(normalizedTitle, rawText) {
  if (!normalizedTitle || !rawText) return normalizedTitle || '';
  const rawWords = rawText.split(/\s+/);
  const normWords = rawWords.map(w => normalize(w));
  const titleWords = normalizedTitle.split(/\s+/);

  for (let i = 0; i <= normWords.length - titleWords.length; i++) {
    let ok = true;
    for (let j = 0; j < titleWords.length; j++) {
      if (normWords[i + j] !== titleWords[j]) { ok = false; break; }
    }
    if (ok) {
      return rawWords.slice(i, i + titleWords.length).join(' ');
    }
  }
  return normalizedTitle;
}

function extractTitle(normText, matchedDateText, priorityMatchedText) {
  let s = normText;

  // Remover prefixos de ação (aplicar repetidamente, por causa de "criar uma tarefa ...")
  let changed = true;
  let safety = 0;
  while (changed && safety < 10) {
    changed = false;
    safety++;
    for (const p of ACTION_PREFIXES) {
      if (p.test(s)) {
        s = s.replace(p, '').trim();
        changed = true;
      }
    }
  }

  // Remover palavras de data/hora (matchedText pode ter acentos, normalizar)
  if (matchedDateText) {
    const cleanMatch = normalize(matchedDateText);
    s = s.replace(new RegExp('\\b' + cleanMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'), '').trim();
  }

  // Remover palavra de prioridade (já capturada em campo próprio)
  s = s.replace(/\b(urgente|urgencia|imediatamente|agora mesmo|hoje mesmo|para ja|importante|prioritario|essencial|critico|alta prioridade|baixa prioridade|quando puder|sem pressa|opcional|talvez|se der)\b/gi, '').trim();

  // Remover "no" ou "para" ou "em" que sobraram
  s = s.replace(/\s+(no|para|em|na|ao|à)\s*$/gi, '').trim();
  s = s.replace(/\s+(no|para|em|na|ao|à)\s+/gi, ' ').trim();

  // Remover vírgulas/pontos duplicados
  s = s.replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').trim();
  s = s.replace(/^[\s,.\-:]+|[\s,.\-:]+$/g, '').trim();

  return s;
}

/* ============================================================
   Cálculo da confiança
   ============================================================ */

function computeConfidence({ actionMatched, title, dueDate, category, priority }) {
  let c = 0;
  if (actionMatched) c += 0.35;
  if (title && title.split(/\s+/).length >= 2) c += 0.30;
  else if (title && title.length > 0) c += 0.15;
  if (dueDate) c += 0.15;
  if (category && category !== 'personal') c += 0.10;
  if (priority) c += 0.05;
  if (c > 1) c = 1;
  return Math.round(c * 100) / 100;
}

/* ============================================================
   API
   ============================================================ */

export const VoiceInterpreter = {
  /**
   * Interpreta uma transcrição.
   * @param {string} text
   * @returns {Object} VoiceIntent
   */
  interpret(text) {
    const raw = String(text || '').trim();
    const norm = normalize(raw);

    const baseIntent = {
      input: raw,
      intent: INTENTS.UNKNOWN,
      title: '',
      dueDate: null,
      priority: null,
      category: null,
      confidence: 0,
      source: 'voice',
      missingFields: [],
      ambiguousFields: []
    };

    if (!norm) {
      baseIntent.missingFields.push('input');
      return baseIntent;
    }

    // 1. Detetar intenção
    const { intent, matched: actionMatched } = detectIntent(norm);
    baseIntent.intent = intent;

    if (intent === INTENTS.UNKNOWN) {
      baseIntent.missingFields.push('action');
      return baseIntent;
    }

    // 2. Só implementamos create_task nesta etapa
    if (intent !== INTENTS.CREATE_TASK) {
      baseIntent.ambiguousFields.push('intent_not_implemented');
      return baseIntent;
    }

    // 3. Extrair data
    const dateInfo = extractDate(norm);
    if (dateInfo.dueDate) baseIntent.dueDate = dateInfo.dueDate;

    // 4. Inferir categoria
    const cat = inferCategory(norm);
    if (cat) baseIntent.category = cat;
    else baseIntent.category = 'personal';

    // 5. Inferir prioridade
    const prio = inferPriority(norm);
    if (prio) baseIntent.priority = prio;
    else baseIntent.priority = 'medium';

    // 6. Extrair título (do texto normalizado) e recuperar versão com acentos do texto original
    const titleNorm = extractTitle(norm, dateInfo.matchedText, prio);
    if (titleNorm) {
      const titleRaw = findTitleInRaw(titleNorm, raw);
      baseIntent.title = capitalize(titleRaw);
    } else {
      baseIntent.missingFields.push('title');
    }

    // 7. Confiança
    baseIntent.confidence = computeConfidence({
      actionMatched,
      title: baseIntent.title,
      dueDate: baseIntent.dueDate,
      category: baseIntent.category,
      priority: prio
    });

    return baseIntent;
  }
};

export default VoiceInterpreter;
