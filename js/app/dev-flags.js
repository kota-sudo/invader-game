/**
 * 開発用フラグ（本番ビルドでは URL / localStorage の両方で明示時のみ有効）
 * - 全装備解放: `?dev_equips=1` または `localStorage.invader_dev_unlock_equips === '1'`
 */
export function isDevUnlockAllEquips() {
  try {
    if (typeof window !== 'undefined' && window.location?.search) {
      const q = new URLSearchParams(window.location.search);
      if (q.get('dev_equips') === '1') return true;
    }
  } catch (_) {}
  try {
    return localStorage.getItem('invader_dev_unlock_equips') === '1';
  } catch (_) {
    return false;
  }
}
