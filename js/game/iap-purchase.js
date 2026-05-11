/**
 * IAP（開発・テスト用シミュレーション）
 * 実ストア連携時はここを Billing API の結果で置き換える想定。
 */
import { game } from './game-store.js';
import { CHAR_POOL } from '../game-data.js';
import { safeLocalStorageSetItem } from './storage-helpers.js';

const STORAGE_NOADS = 'invader_iap_noads';
const STORAGE_PASS_UNTIL = 'invader_iap_pass_until';

const STARTER_CHAR_ORDER = ['char_swift', 'char_guard', 'char_iron', 'char_flame', 'char_nova'];

export function loadIapFlags() {
  try {
    game.iapNoAds = localStorage.getItem(STORAGE_NOADS) === '1';
    const u = parseInt(localStorage.getItem(STORAGE_PASS_UNTIL) || '0', 10);
    game.iapPassUntil = Number.isFinite(u) && u > 0 ? u : 0;
  } catch (e) {
    game.iapNoAds = false;
    game.iapPassUntil = 0;
  }
}

export function persistIapFlags() {
  safeLocalStorageSetItem(STORAGE_NOADS, game.iapNoAds ? '1' : '0');
  safeLocalStorageSetItem(STORAGE_PASS_UNTIL, String(game.iapPassUntil || 0));
}

/** 月額パスが期限内か（将来のデイリー配布などで利用可） */
export function hasMonthlyPassActive() {
  return Date.now() < (game.iapPassUntil || 0);
}

/**
 * @param {{ id: string, gems?: number, label?: string, price?: number }} pkg
 * @param {{ addGems: (n:number)=>void, saveGachaData: ()=>void }} api
 */
export function applySimulatedIAPPurchase(pkg, { addGems, saveGachaData }) {
  const lines = [];
  const id = pkg.id;

  if (id.startsWith('gem')) {
    const n = Math.max(0, pkg.gems | 0);
    if (n > 0) addGems(n);
    lines.push(`ジェム +${n}`);
    return { ok: true, lines };
  }

  if (id === 'starter') {
    const g = Math.max(0, pkg.gems | 0);
    if (g > 0) addGems(g);
    lines.push(`ジェム +${g}`);
    let grantedLabel = null;
    for (const cid of STARTER_CHAR_ORDER) {
      if (!game.gachaInventory[cid]) {
        game.gachaInventory[cid] = { level: 1 };
        grantedLabel = CHAR_POOL.find(c => c.id === cid)?.label || cid;
        break;
      }
    }
    if (grantedLabel) lines.push(`機体「${grantedLabel}」を解放`);
    else lines.push('（対象機体はすべて開放済み）');
    saveGachaData();
    return { ok: true, lines };
  }

  if (id === 'noad') {
    game.iapNoAds = true;
    persistIapFlags();
    lines.push('広告除去フラグをON（保存済み）');
    return { ok: true, lines };
  }

  if (id === 'pass') {
    const days = 30;
    const base = Math.max(Date.now(), game.iapPassUntil || 0);
    game.iapPassUntil = base + days * 86400000;
    game.iapNoAds = true;
    persistIapFlags();
    lines.push(`月額パス +${days}日（広告除去込み・期限を延長）`);
    return { ok: true, lines };
  }

  return { ok: false, lines: ['未対応の商品です'] };
}
