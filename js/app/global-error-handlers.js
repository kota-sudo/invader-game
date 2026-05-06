/** 起動時の未処理エラーを #message に表示（デバッグ用） */
export function installGlobalErrorHandlers() {
  window.addEventListener('error', (ev) => {
    const el = document.getElementById('message');
    if (el) {
      el.textContent = `ERROR: ${ev.message}\n${ev.filename}:${ev.lineno}`;
      el.classList.remove('hidden');
    }
  });
  window.addEventListener('unhandledrejection', (ev) => {
    const el = document.getElementById('message');
    if (el) {
      el.textContent = `REJECT: ${ev.reason}`;
      el.classList.remove('hidden');
    }
  });
}
