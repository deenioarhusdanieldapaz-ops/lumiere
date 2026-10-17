/**
 * firebase-config.js — Config partilhada do Firebase.
 *
 * Extraído do index.html para ser importável por outros módulos (ex: core/auth.js).
 * O service worker tem o seu próprio ficheiro (firebase-config-sw.js) porque
 * corre em contexto isolado e não pode importar ES modules.
 */

export const firebaseConfig = {
  apiKey: "AIzaSyD8n3Igc9qD-ZVyC_ONdgFmCBaskoV8P_U",
  authDomain: "lumiere-notificacoes.firebaseapp.com",
  projectId: "lumiere-notificacoes",
  storageBucket: "lumiere-notificacoes.firebasestorage.app",
  messagingSenderId: "668210725053",
  appId: "1:668210725053:web:c55dd5ad4762ab7e0a37d4",
  measurementId: "G-90PHG64T77"
};

export default firebaseConfig;
