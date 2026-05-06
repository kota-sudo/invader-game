/** localStorage 書き込み（容量・プライベートモード等で失敗しても例外を投げない） */
export function safeLocalStorageSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (_) {
    return false;
  }
}

export function readJsonObject(key, fallback = {}) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null || raw === '') return { ...fallback };
    const v = JSON.parse(raw);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  } catch (_) {}
  return { ...fallback };
}

export function readJsonArray(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null || raw === '') return [...fallback];
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v;
  } catch (_) {}
  return [...fallback];
}
