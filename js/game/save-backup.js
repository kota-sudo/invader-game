/**
 * invader_* localStorage の JSON 書き出し／読み込み（端末移行・バックアップ用）
 */
const PREFIX = 'invader_';
const SAVE_EXPORT_VERSION = 1;
export const SAVE_IMPORT_SESSION_KEY = 'invader_save_import_notice';

export function collectInvaderLocalStorage() {
  const keys = {};
  if (typeof localStorage === 'undefined') return keys;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys[k] = localStorage.getItem(k) ?? '';
    }
  } catch (e) {
    /* ignore */
  }
  return keys;
}

export function buildInvaderSaveExportObject() {
  return {
    v: SAVE_EXPORT_VERSION,
    app: 'invader-game',
    exportedAt: new Date().toISOString(),
    keys: collectInvaderLocalStorage(),
  };
}

/** @returns {boolean} */
export function downloadInvaderSaveJson() {
  if (typeof document === 'undefined' || typeof Blob === 'undefined') return false;
  const obj = buildInvaderSaveExportObject();
  const json = JSON.stringify(obj);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  a.href = url;
  a.download = `invader-save-${stamp}.json`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * @param {string} text
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function parseAndApplyInvaderSaveJsonText(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: 'json' };
  }
  if (!obj || obj.v !== SAVE_EXPORT_VERSION || !obj.keys || typeof obj.keys !== 'object') {
    return { ok: false, error: 'format' };
  }
  let bytes = 0;
  const entries = Object.entries(obj.keys);
  for (const [k, v] of entries) {
    if (typeof k !== 'string' || !k.startsWith(PREFIX)) continue;
    if (typeof v !== 'string') return { ok: false, error: 'bad_key' };
    if (k.length > 120 || v.length > 2_000_000) return { ok: false, error: 'bad_size' };
    bytes += v.length;
    if (bytes > 8_000_000) return { ok: false, error: 'too_large' };
  }
  for (const [k, v] of entries) {
    if (typeof k !== 'string' || !k.startsWith(PREFIX)) continue;
    if (typeof v !== 'string') continue;
    try {
      localStorage.setItem(k, v);
    } catch (e) {
      return { ok: false, error: 'quota' };
    }
  }
  return { ok: true };
}

/**
 * ファイル選択 → 検証して localStorage に反映 → 成功時は `location.reload()`
 * @param {(r: { ok: boolean, error?: string }) => void} [onResult] 失敗時のみ（成功時は reload）
 */
export function triggerInvaderSaveImportFilePick(onResult) {
  if (typeof document === 'undefined') return;
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'application/json,.json';
  inp.style.display = 'none';
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    const done = () => {
      try {
        inp.remove();
      } catch (e) {
        /* ignore */
      }
    };
    if (!f) {
      onResult?.({ ok: false, error: 'cancel' });
      done();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const r = parseAndApplyInvaderSaveJsonText(text);
      if (r.ok) {
        try {
          sessionStorage.setItem(SAVE_IMPORT_SESSION_KEY, JSON.stringify({ ok: true }));
        } catch (e) {
          /* ignore */
        }
        if (typeof location !== 'undefined') location.reload();
      } else {
        onResult?.(r);
      }
      done();
    };
    reader.onerror = () => {
      onResult?.({ ok: false, error: 'read' });
      done();
    };
    reader.readAsText(f, 'utf-8');
  };
  document.body.appendChild(inp);
  inp.click();
}
