/** スターダスト交換所の週サイクル（ゲーム状態に依存しない） */

export const STARDUST_SHOP_CYCLE_MS = 7 * 24 * 60 * 60 * 1000;
const CYCLE_ANCHOR_UTC = Date.UTC(2020, 0, 1, 0, 0, 0, 0);

export const STARDUST_SHOP_ROTATIONS = [
  { costMult: 1, lineJa: '通常週' },
  { costMult: 0.9, lineJa: 'セール週（10% OFF）' },
  { costMult: 1.05, lineJa: '品薄週（+5%）' },
];

export const STARDUST_SHOP_WEEK_COUNT = STARDUST_SHOP_ROTATIONS.length;

export function getStardustShopCycleIndex(now = Date.now()) {
  const n = Math.floor(Number(now)) || 0;
  const phase = Math.floor((n - CYCLE_ANCHOR_UTC) / STARDUST_SHOP_CYCLE_MS);
  return ((phase % STARDUST_SHOP_WEEK_COUNT) + STARDUST_SHOP_WEEK_COUNT) % STARDUST_SHOP_WEEK_COUNT;
}

export function getMsUntilNextStardustShopCycle(now = Date.now()) {
  const n = Math.floor(Number(now)) || 0;
  const elapsed = (n - CYCLE_ANCHOR_UTC) % STARDUST_SHOP_CYCLE_MS;
  return STARDUST_SHOP_CYCLE_MS - elapsed;
}

export function formatStardustShopRotationCountdownJa(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `あと ${d}日 ${h}時間`;
  if (h > 0) return `あと ${h}時間 ${m}分`;
  return `あと ${m}分`;
}
