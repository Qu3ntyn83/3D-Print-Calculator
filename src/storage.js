// Speicher-Adapter: dieselbe Oberfläche läuft an drei Orten.
//  - Windows-App (Tauri): JSON-Datei im App-Datenordner
//  - Webapp im Docker-Container: REST-API mit SQLite
//  - Statisch gehostet / Entwicklung: localStorage des Browsers

export const isTauri = () => typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

const LS_KEY = 'ppc-data-v1';

async function tauriStore() {
  const { load } = await import('@tauri-apps/plugin-store');
  const st = await load('data.json', { autoSave: false });
  return {
    kind: 'file',
    async load() { return (await st.get('data')) ?? null; },
    async save(data) { await st.set('data', data); await st.save(); },
  };
}

async function serverStore() {
  const res = await fetch('api/data', { headers: { Accept: 'application/json' } });
  if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  if (res.status !== 204 && !ct.includes('application/json')) throw new Error('no api');
  const initial = res.status === 204 ? null : await res.json();
  return {
    kind: 'server',
    async load() { return initial; },
    async save(data) {
      const r = await fetch('api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    },
  };
}

function browserStore() {
  return {
    kind: 'browser',
    async load() { try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; } },
    async save(data) { localStorage.setItem(LS_KEY, JSON.stringify(data)); },
  };
}

export async function openStore() {
  if (isTauri()) return tauriStore();
  try { return await serverStore(); } catch { return browserStore(); }
}
