/**
 * core/backup.js — Módulo de Exportação e Restauro de Dados (E1)
 * 
 * Responsável por ler as 24 coleções do IndexedDB, gerar um JSON e
 * restaurar os dados a partir desse JSON.
 * 
 * Ainda não liga ao Firestore nem à UI.
 */

import { dataManager } from './dataManager.js';
import { storageManager } from './storageManager.js';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// O app já foi inicializado no auth.js/index.html, por isso podemos obter a instância do Firestore
const db = getFirestore();

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
      console.warn('[Backup] Erro ao ler coleção', collection, err);
      data[collection] = [];
    }
  }

  const backupPayload = {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    appVersion: 'v319', // Pode ser atualizado dinamicamente se houver essa info
    totalRecords: totalRecords,
    data: data
  };

  console.log('[Backup] Exportação concluída. Total de registos:', totalRecords);
  return backupPayload;
}

/**
 * Restaura os dados a partir de um objeto de backup.
 * ATENÇÃO: Isto apaga todos os dados atuais antes de inserir os novos.
 * @param {Object} backupPayload - O objeto retornado por exportAllData()
 * @returns {Promise<boolean>}
 */
export async function restoreData(backupPayload) {
  if (!backupPayload || !backupPayload.data) {
    throw new Error('Payload de backup inválido ou corrompido.');
  }

  console.log('[Backup] A iniciar restauro. Registos no backup:', backupPayload.totalRecords);
  
  let restoredCount = 0;

  for (const collection of ALL_COLLECTIONS) {
    const records = backupPayload.data[collection];
    
    // Limpa a tabela atual
    try {
      await dataManager.clear(collection);
    } catch (err) {
      console.warn('[Backup] Erro ao limpar coleção', collection, err);
    }

    // Insere os novos registos
    if (Array.isArray(records) && records.length > 0) {
      for (const record of records) {
        try {
          // Usa o storageManager diretamente para não re-gerar IDs e createdAt durante o restauro
          await storageManager.create(collection, record);
          restoredCount++;
        } catch (err) {
          console.error('[Backup] Erro ao restaurar registo em', collection, record, err);
        }
      }
    }
  }

  console.log('[Backup] Restauro concluído. Registos restaurados:', restoredCount);
  return true;
}

/**
 * Faz o upload do backup para o Firestore, mas apenas se ainda não houver um de hoje.
 * @param {string} uid - ID do utilizador
 */
export async function uploadDailyBackup(uid) {
  if (!uid) return console.warn('[Backup] Sem UID, não é possível enviar backup.');
  
  const today = new Date().toISOString().split('T')[0];
  const backupRef = doc(db, 'backups', uid, 'history', today);

  try {
    const snap = await getDoc(backupRef);
    if (snap.exists()) {
      console.log('[Backup] Já existe um backup para hoje (' + today + '). A saltar.');
      return;
    }

    console.log('[Backup] A criar backup diário na cloud...');
    const payload = await exportAllData();
    
    // O Firestore tem limite de 1MB por documento. Vamos garantir que não ultrapassa.
    const payloadSize = new Blob([JSON.stringify(payload)]).size;
    if (payloadSize > 1000000) {
      console.error('[Backup] O backup é demasiado grande para o Firestore (>1MB). Tamanho:', payloadSize);
      return;
    }

    await setDoc(backupRef, payload);
    console.log('[Backup] Enviado com sucesso para backups/' + uid + '/history/' + today);
    
    // Limpar backups antigos
    await cleanOldBackups(uid);
  } catch (err) {
    console.error('[Backup] Erro ao enviar backup para a cloud:', err);
  }
}

/**
 * Apaga backups com mais de 7 dias.
 * @param {string} uid
 */
async function cleanOldBackups(uid) {
  try {
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
    console.warn('[Backup] Erro ao limpar backups antigos:', err);
  }
}

/**
 * Verifica se existe algum backup na cloud e devolve o mais recente.
 * @param {string} uid
 */
export async function getLatestCloudBackup(uid) {
  if (!uid) return null;
  try {
    const historyRef = collection(db, 'backups', uid, 'history');
    const snap = await getDocs(historyRef);
    
    if (snap.empty) return null;

    // Ordenar os documentos pela data (o ID é a data YYYY-MM-DD) de forma decrescente
    const docs = snap.docs.sort((a, b) => b.id.localeCompare(a.id));
    const latest = docs[0];
    
    console.log('[Backup] Backup mais recente encontrado:', latest.id);
    return { date: latest.id, payload: latest.data() };
  } catch (err) {
    console.error('[Backup] Erro ao procurar backup na cloud:', err);
    return null;
  }
}

/**
 * Força o upload do backup (útil para o botão manual).
 * Substitui o backup do dia, se já existir.
 * @param {string} uid
 */
export async function forceUploadBackup(uid) {
  if (!uid) return { ok: false, error: 'Utilizador não autenticado.' };
  
  const today = new Date().toISOString().split('T')[0];
  const backupRef = doc(db, 'backups', uid, 'history', today);

  try {
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
    console.error('[Backup] Erro no backup manual:', err);
    return { ok: false, error: err.message };
  }
}

export default { exportAllData, restoreData, uploadDailyBackup, forceUploadBackup, getLatestCloudBackup, ALL_COLLECTIONS };
