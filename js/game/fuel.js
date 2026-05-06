import { getLocalDateKey } from './date-utils.js';
import { game, actions } from './game-store.js';
import { safeLocalStorageSetItem } from './storage-helpers.js';

export const FUEL_CAP = 10;
export const FUEL_COST_PER_RUN = 1;
/** ゲームオーバー時のコンティニュー（同一ステージ先頭から再開）。★はそのクリアで更新されない */
export const CONTINUE_GEM_COST = 10;
const FUEL_REGEN_MS = 30 * 60 * 1000; // 30分で1回復
const FUEL_DAILY_GRANT = 5; // デイリー配布（カスタム：初期値）
const FUEL_GEM_COST = 1; // 燃料不足時、💎で出撃（1回あたり）

export function saveFuel() {
  safeLocalStorageSetItem('invader_fuel', String(Math.max(0, Math.floor(game.fuel || 0))));
  safeLocalStorageSetItem('invader_fuel_ts', String(Math.floor(game.fuelTs || Date.now())));
  safeLocalStorageSetItem('invader_fuel_daily', String(game.fuelDaily || ''));
}

/** HUD 用: 残り時間を MM:SS 表示 */
export function formatFuelMmSs(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function syncFuel(now = Date.now()) {
  if (!Number.isFinite(game.fuel)) game.fuel = FUEL_CAP;
  if (!Number.isFinite(game.fuelTs) || game.fuelTs <= 0) game.fuelTs = now;

  // 日付更新でデイリー配布（端末ローカル日付）
  const today = getLocalDateKey();
  if (game.fuelDaily !== today) {
    game.fuelDaily = today;
    const before = game.fuel || 0;
    if (before < FUEL_CAP) {
      game.fuel = Math.min(FUEL_CAP, before + FUEL_DAILY_GRANT);
      if (game.fuel > before) {
        game.lifeGainDisplay = { text: `⛽ 燃料 +${game.fuel - before}（デイリー配布）`, timer: 160, color: '#44ddff' };
      }
    }
    saveFuel();
  }

  // 自然回復（オフラインも含む）
  if ((game.fuel || 0) >= FUEL_CAP) {
    game.fuel = FUEL_CAP;
    game.fuelTs = now;
    return;
  }
  const elapsed = Math.max(0, now - game.fuelTs);
  const gain = Math.floor(elapsed / FUEL_REGEN_MS);
  if (gain > 0) {
    game.fuel = Math.min(FUEL_CAP, (game.fuel || 0) + gain);
    game.fuelTs = game.fuelTs + gain * FUEL_REGEN_MS;
    if (game.fuel >= FUEL_CAP) game.fuelTs = now;
    saveFuel();
  }
}

export function fuelNextRegenMs(now = Date.now()) {
  syncFuel(now);
  if ((game.fuel || 0) >= FUEL_CAP) return 0;
  const base = Number.isFinite(game.fuelTs) ? game.fuelTs : now;
  const passed = Math.max(0, now - base);
  const rem = FUEL_REGEN_MS - (passed % FUEL_REGEN_MS);
  return rem;
}

export function addFuel(n) {
  if (!Number.isFinite(n) || n === 0) return;
  syncFuel();
  game.fuel = Math.max(0, Math.min(FUEL_CAP, (game.fuel || 0) + Math.floor(n)));
  if (game.fuel >= FUEL_CAP) game.fuelTs = Date.now();
  saveFuel();
  actions.updateHUD?.();
}

export function tryConsumeFuelForRun() {
  syncFuel();
  const have = game.fuel || 0;
  if (have >= FUEL_COST_PER_RUN) {
    game.fuel = have - FUEL_COST_PER_RUN;
    saveFuel();
    actions.updateHUD?.();
    return true;
  }
  const rem = fuelNextRegenMs();
  const msg = `燃料不足（0/${FUEL_CAP}） 次回復: ${formatFuelMmSs(rem)}`;
  // 💎で購入して出撃（2タップ確認）
  if ((game.gems || 0) >= FUEL_GEM_COST) {
    const now = Date.now();
    if (game.fuelGemConfirm && (now - game.fuelGemConfirm) < 3000) {
      game.fuelGemConfirm = 0;
      game.gems -= FUEL_GEM_COST;
      actions.saveGems?.();
      actions.updateHUD?.();
      game.lifeGainDisplay = { text: `💎${FUEL_GEM_COST} で燃料を補給して出撃`, timer: 160, color: '#cc88ff' };
      return true;
    }
    game.fuelGemConfirm = now;
    game.lifeGainDisplay = { text: `${msg}  ·  💎${FUEL_GEM_COST}で補給して出撃（もう一度タップ）`, timer: 220, color: '#ff6644' };
    return false;
  }
  game.lifeGainDisplay = { text: msg, timer: 220, color: '#ff6644' };
  return false;
}

/** ステージ選択から出撃へ進める燃料／💎補給の可否（描画・クリック判定用） */
export function stageSelectFuelLaunchOk() {
  syncFuel();
  if ((game.fuel || 0) >= FUEL_COST_PER_RUN) return true;
  if ((game.gems || 0) >= FUEL_GEM_COST) return true;
  return false;
}
