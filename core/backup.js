/**
 * core/backup.js — Módulo de Exportação e Restauro de Dados (E1)
 *
 * Responsável por ler as 24 coleções do IndexedDB, gerar um JSON e
 * restaurar os dados a partir desse JSON.
 */

import { dataManager } from './dataManager.js';
import { storageManager } from './storageManager.js';
import { runTransaction } from './storageManager.js';
import { DB_VERSION } from './storageManager.js';

// Lista exata das 24 coleções definidas no storageManager.js
export const ALL_COLLECTIONS = [
  'userProfiles', 'tasks', 'habits', 'habitLogs', 'studies', 'studySessions',
  'goals', 'goalMilestones', 'calendarEvents', 'financeAccounts', 'financeTransactions',
  'budgets', 'notes', 'lumiereBusinesses', 'lumiereProducts', 'lumiereCustomers',
  'lumiereSales', 'reminders', 'categories', 'tags', 'preferences', 'templates',
  'dailyReviews', 'focusSessions'
];

/**
 * Exporta todos os dados da base local para um objeto JSON.
 * @returns {Promise<Object>} O objeto de backup completo.
 */
export async function exportAllData() {
  console.log('[Backup] A iniciar exportação...');
  const data = {};
  let totalRecords = 0;

  for (const collection of ALL_COLLECTIONS) {
    try {
      const records = await dataManager.list(collection);
      data[collection] = records || [];
      totalRecords += data[collection].length;
    } catch (err) {
      console.error('[Backup] Erro crítico ao ler coleção', collection, err?.message);
      throw new Error('Falha ao exportar a coleção ' + collection + '. Backup abortado.');

    }
  }

  const backupPayload = {
    formatVersion: 1,
    dbVersion: DB_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: 'v319',
    totalRecords: totalRecords,
    data: data
  };

  console.log('[Backup] Exportação concluída. Total de registos:', totalRecords);
  return backupPayload;
}

/**
 * Restaura os dados a partir de um objeto de backup.
 * @param {Object} backupPayload - O objeto retornado por exportAllData()
 * @returns {Promise<Object>} { success: boolean, restoredCount: number, errors: string[] }
 */
export async function restoreData(backupPayload) {
  // 1. Validação de Estrutura Básica
  if (!backupPayload || !backupPayload.data) {
    return { success: false, errors: ['Payload de backup inválido ou corrompido.'], restoredCount: 0 };
  }

  // 2. Validação de Versões
  if (backupPayload.formatVersion !== 1) {
    return { success: false, errors: ['Versão de formato de backup incompatível.'], restoredCount: 0 };
  }
  if (!Number.isInteger(backupPayload.dbVersion)) {
    return { success: false, errors: ['Backup inválido: dbVersion ausente ou não é um inteiro.'], restoredCount: 0 };
  }
  if (backupPayload.dbVersion > DB_VERSION) {
    return { success: false, errors: [`Backup da versão ${backupPayload.dbVersion} não pode ser restaurado na versão ${DB_VERSION}.`], restoredCount: 0 };
  }

  // 3. Validação Estrutural e Contagem
  let actualTotalRecords = 0;
  const validationErrors = [];

  for (const collection of ALL_COLLECTIONS) {
    const records = backupPayload.data[collection];
    if (!Array.isArray(records)) {
      validationErrors.push(`[${collection}] A coleção não é uma lista válida.`);
      continue;
    }
    actualTotalRecords += records.length;
  }

  if (typeof backupPayload.totalRecords !== 'number' || backupPayload.totalRecords !== actualTotalRecords) {
    return { success: false, errors: [`Inconsistência: totalRecords (${backupPayload.totalRecords}) não corresponde à soma real (${actualTotalRecords}).`], restoredCount: 0 };
  }

  // Abortar se houver erros estruturais (ex: coleções em falta)
  if (validationErrors.length > 0) {
    console.error('[Backup] Restauro abortado. Erros estruturais:', validationErrors.length);
    return { success: false, errors: validationErrors, restoredCount: 0 };
  }

  // 4. Validação de Registos e Relações Internas
  const backupIds = {};
  for (const collection of ALL_COLLECTIONS) {
    backupIds[collection] = new Set((backupPayload.data[collection] || []).map(r => r.id));
  }

  const RELATIONS = {
    tasks: { goalId: 'goals' },
    habitLogs: { habitId: 'habits' },
    studySessions: { studyId: 'studies' },
    goalMilestones: { goalId: 'goals' },
    financeTransactions: { accountId: 'financeAccounts' },
    lumiereProducts: { businessId: 'lumiereBusinesses' },
    lumiereSales: { customerId: 'lumiereCustomers', productId: 'lumiereProducts' }
  };

  for (const collection of ALL_COLLECTIONS) {
    const records = backupPayload.data[collection];
    if (!Array.isArray(records)) continue; // Defesa contra coleções inválidas
    for (const record of records) {
      try {
        const validation = dataManager._validate(collection, record);
        if (!validation.valid) {
          validationErrors.push(`[${collection}] ID ${record.id || 'sem-id'}: ${validation.errors.join(', ')}`);
        }
      } catch (err) {
        validationErrors.push(`[${collection}] ID ${record.id || 'sem-id'}: Erro de validação - ${err.message}`);
      }

      const relations = RELATIONS[collection];
      if (relations) {
        for (const [field, targetCollection] of Object.entries(relations)) {
          const targetId = record[field];
          if (targetId && !backupIds[targetCollection].has(targetId)) {
            validationErrors.push(`[${collection}] ID ${record.id}: Relação inválida - ${field}="${targetId}" não encontrado no backup.`);
          }
        }
      }
    }
  }

  if (validationErrors.length > 0) {
    console.error('[Backup] Restauro abortado. Erros de validação:', validationErrors.length);
    return { success: false, errors: validationErrors, restoredCount: 0 };
  }

  // 5. Execução Atómica (DENTRO DA TRANSAÇÃO)
  let restoredCount = 0;

  try {
    await runTransaction(async () => {
      for (const collection of ALL_COLLECTIONS) {
        const records = backupPayload.data[collection];

        await storageManager.clear(collection);

        if (records.length > 0) {
          const table = storageManager.getCollection(collection);
          await table.bulkPut(records);
          restoredCount += records.length;
        }
      }
    });

    console.log('[Backup] Restauro concluído com sucesso. Registos restaurados:', restoredCount);
    return { success: true, restoredCount, errors: [] };

  } catch (err) {
    console.error('[Backup] Falha na transação de restauro. Rollback efetuado.', err.message);
    return { success: false, errors: [err.message], restoredCount: 0 };
  }
}

// --- FUNÇÕES DE NUVEM (Import Dinâmico) ---

export async function uploadDailyBackup(uid) {
  if (!uid) return { ok: false, error: 'Utilizador não autenticado.' };

  try {
    const { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const db = getFirestore();
    const today = new Date().toISOString().split('T')[0];
    const backupRef = doc(db, 'backups', uid, 'history', today);

    const snap = await getDoc(backupRef);
    if (snap.exists()) {
      console.log('[Backup] Já existe um backup para hoje (' + today + '). A saltar.');
      return { ok: true, skipped: true, message: 'Backup já realizado hoje.' };
    }

    console.log('[Backup] A criar backup diário na cloud...');
    const payload = await exportAllData();

    const payloadSize = new Blob([JSON.stringify(payload)]).size;
    if (payloadSize > 1000000) {
      console.error('[Backup] O backup é demasiado grande para o Firestore (>1MB). Tamanho:', payloadSize);
      return { ok: false, error: 'Backup demasiado grande (>1MB).' };
    }

    await setDoc(backupRef, payload);
    const maskedUid = uid ? uid.slice(0, 4) + '***' : '***';
    console.log('[Backup] Enviado com sucesso para backups/' + maskedUid + '/history/' + today);

    await cleanOldBackups(uid);
    return { ok: true, date: today };
  } catch (err) {
    console.error('[Backup][Firebase]', err?.code ?? err?.name ?? 'sem-codigo', '—', err?.message ?? 'sem-mensagem');
    return { ok: false, error: err?.message ?? 'Erro desconhecido no upload.' };
  }
}

async function cleanOldBackups(uid) {
  try {
    const { getFirestore, doc, collection, getDocs, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const db = getFirestore();
    const historyRef = collection(db, 'backups', uid, 'history');
    const snap = await getDocs(historyRef);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    let deleted = 0;
    for (const document of snap.docs) {
      if (document.id < cutoffStr) {
        await deleteDoc(doc(db, 'backups', uid, 'history', document.id));
        deleted++;
      }
    }
    if (deleted > 0) console.log('[Backup] Backups antigos apagados:', deleted);
  } catch (err) {
    console.warn('[Backup][Firebase]', err?.code ?? err?.name ?? 'sem-codigo', '—', err?.message ?? 'sem-mensagem');
  }
}

export async function getLatestCloudBackup(uid) {
  if (!uid) return null;

  try {
    const { getFirestore, collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const db = getFirestore();
    const historyRef = collection(db, 'backups', uid, 'history');
    const snap = await getDocs(historyRef);

    if (snap.empty) return null;

    const docs = snap.docs.sort((a, b) => b.id.localeCompare(a.id));
    const latest = docs[0];

    console.log('[Backup] Backup mais recente encontrado:', latest.id);
    return { date: latest.id, payload: latest.data() };
  } catch (err) {
    console.error('[Backup][Firebase]', err?.code ?? err?.name ?? 'sem-codigo', '—', err?.message ?? 'sem-mensagem');
    return null;
  }
}

export async function forceUploadBackup(uid) {
  if (!uid) return { ok: false, error: 'Utilizador não autenticado.' };

  try {
    const { getFirestore, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const db = getFirestore();
    const today = new Date().toISOString().split('T')[0];
    const backupRef = doc(db, 'backups', uid, 'history', today);

    console.log('[Backup] A forçar backup manual para hoje...');
    const payload = await exportAllData();

    const payloadSize = new Blob([JSON.stringify(payload)]).size;
    if (payloadSize > 1000000) {
      return { ok: false, error: 'Backup demasiado grande (>1MB).' };
    }

    await setDoc(backupRef, payload);
    await cleanOldBackups(uid);
    console.log('[Backup] Backup manual concluído.');
    return { ok: true, date: today };
  } catch (err) {
    console.error('[Backup][Firebase]', err?.code ?? err?.name ?? 'sem-codigo', '—', err?.message ?? 'sem-mensagem');
    return { ok: false, error: err?.message ?? 'Erro desconhecido.' };
  }
}

export default { exportAllData, restoreData, uploadDailyBackup, forceUploadBackup, getLatestCloudBackup, ALL_COLLECTIONS };
