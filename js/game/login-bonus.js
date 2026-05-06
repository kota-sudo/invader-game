import { game } from './game-store.js';
import { addInboxItem } from './inbox-storage.js';
import { safeLocalStorageSetItem } from './storage-helpers.js';

export function checkLoginBonus(playSound) {
  const today = new Date().toDateString();
  let last = '';
  try {
    last = localStorage.getItem('invader_login_date') || '';
  } catch (_) {
    return;
  }
  if (last === today) return;

  const yesterday = new Date(Date.now() - 86400000).toDateString();
  let streak = 1;
  try {
    const prev = parseInt(localStorage.getItem('invader_login_streak') || '0', 10);
    streak = last === yesterday ? Math.min(7, (Number.isFinite(prev) ? prev : 0) + 1) : 1;
  } catch (_) {}

  safeLocalStorageSetItem('invader_login_date', today);
  safeLocalStorageSetItem('invader_login_streak', String(streak));

  const coins = 100 + streak * 50;
  const gems = streak >= 7 ? 3 : streak >= 3 ? 1 : 0;
  addInboxItem(game, { label: `🎁 ログインボーナス（${streak}日連続）`, coins, gems, icon: 'login' });
  playSound('login_bonus');
  game.lifeGainDisplay = {
    text: `📬 ログインボーナスを受け取りBOXに追加しました`,
    timer: 220,
    color: '#00ff88',
  };
}
