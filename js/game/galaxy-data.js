/**
 * 銀河マップの惑星定義（ワールド追加時はこの配列を拡張）
 * firstStage: その惑星に入場できるようになる最低 highestStage（1-based）
 * lastStage: そのワールドの最終ステージ番号
 */

/**
 * routeAnchorPct … 航路が刺さる点（惑星球の中心寄り）。無い場合は nodePct（ノード枠の中心）。
 * @typedef {{
 *   id: string;
 *   nameJa: string;
 *   nameEn: string;
 *   themeColor: string;
 *   firstStage: number;
 *   lastStage: number;
 *   nodePct: { x: number; y: number };
 *   routeAnchorPct?: { x: number; y: number };
 *   routeColor: string;
 *   unlockHintJa: string | null;
 *   recommendedPower: number;
 *   featureJa: string;
 *   descriptionJa: string;
 * }} GalaxyPlanetDef
 */

/** コア（航路の基準点）。ノードの left/top% と同じ座標系 */
export const GALAXY_MAP_HUB_PCT = { x: 50, y: 43.2 };

/** @type {GalaxyPlanetDef[]} */
export const GALAXY_PLANETS = [
  {
    id: 'mars',
    nameJa: '火星',
    nameEn: 'MARS',
    themeColor: '#ff5533',
    firstStage: 1,
    lastStage: 10,
    nodePct: { x: 24, y: 38 },
    routeAnchorPct: { x: 24, y: 33.2 },
    routeColor: 'rgba(255, 100, 70, 0.5)',
    unlockHintJa: null,
    recommendedPower: 1200,
    featureJa: '高火力敵が出現',
    descriptionJa: '最初の主戦場。赤い荒れ地と基地跡が続くエリアで、基礎武装の試しに最適。',
  },
  {
    id: 'venus',
    nameJa: '金星',
    nameEn: 'VENUS',
    themeColor: '#eebb33',
    firstStage: 11,
    lastStage: 20,
    nodePct: { x: 64, y: 26 },
    routeAnchorPct: { x: 64, y: 22 },
    routeColor: 'rgba(255, 210, 100, 0.4)',
    unlockHintJa: 'ステージ 1-10 をクリアすると解放されます',
    recommendedPower: 2800,
    featureJa: '熱波と高速弾幕',
    descriptionJa: '濃厚な大気と雷雲。中距離の敵が増え、回避ルートの読みが重要になる。',
  },
  {
    id: 'frostia',
    nameJa: '氷惑星',
    nameEn: 'FROSTIA',
    themeColor: '#66c8ff',
    firstStage: 21,
    lastStage: 30,
    nodePct: { x: 80, y: 50 },
    routeAnchorPct: { x: 80, y: 45.5 },
    routeColor: 'rgba(120, 200, 255, 0.38)',
    unlockHintJa: 'ステージ 2-10 をクリアすると解放されます',
    recommendedPower: 4500,
    featureJa: '滑走床・凍結弾',
    descriptionJa: '極低温ゾーン。移動が遅く感じるウェーブや、弾速変化に注意。',
  },
  {
    id: 'voltis',
    nameJa: '機械惑星',
    nameEn: 'VOLTIS',
    themeColor: '#44eedd',
    firstStage: 31,
    lastStage: 40,
    nodePct: { x: 52, y: 79 },
    routeAnchorPct: { x: 52, y: 73.8 },
    routeColor: 'rgba(80, 255, 230, 0.32)',
    unlockHintJa: 'ステージ 3-10 をクリアすると解放されます',
    recommendedPower: 6200,
    featureJa: 'ドローン群・レーザ網',
    descriptionJa: '工廠惑星。パターン化した敵編隊とギミック床が増えるワールド。',
  },
  {
    id: 'venomia',
    nameJa: '毒惑星',
    nameEn: 'VENOMIA',
    themeColor: '#aa66ee',
    firstStage: 41,
    lastStage: 50,
    nodePct: { x: 18, y: 70 },
    routeAnchorPct: { x: 18, y: 65.2 },
    routeColor: 'rgba(180, 120, 255, 0.32)',
    unlockHintJa: 'ステージ 4-10 をクリアすると解放されます',
    recommendedPower: 8000,
    featureJa: '毒霧・回復阻害',
    descriptionJa: '酸性の霧が視界を削るエリア。長期戦になるため火力と生存のバランスが鍵。',
  },
];

/** 仕様メモ用エイリアス（例の `planets` と同じ配列） */
export const planets = GALAXY_PLANETS;

/** @param {object} g game */
export function isGalaxyPlanetUnlocked(p, g) {
  const hs = Math.max(1, g.highestStage | 0);
  return hs >= p.firstStage;
}

/** プレイに進めるか（現状は解放と同義） */
export function isGalaxyPlanetPlayable(p, g) {
  return isGalaxyPlanetUnlocked(p, g);
}

/** 航路・ノードを明るく見せるか */
export function isGalaxyPlanetUnlockedVisual(p, g) {
  return isGalaxyPlanetUnlocked(p, g);
}

export function formatStageIdGlobal(stageNum) {
  const s = Math.max(1, Math.floor(stageNum || 1));
  const w = Math.floor((s - 1) / 10) + 1;
  const local = ((s - 1) % 10) + 1;
  return `${w}-${local}`;
}

/** 惑星カード用：そのワールド内での最高到達表記 */
export function getGalaxyPlanetReachLabel(p, highestStage) {
  const hs = Math.max(1, highestStage | 0);
  if (hs < p.firstStage) return '—';
  const cap = Math.min(hs, p.lastStage);
  return formatStageIdGlobal(cap);
}

export function getGalaxyStageRangeLabel(p) {
  const w0 = Math.floor((p.firstStage - 1) / 10) + 1;
  const a = ((p.firstStage - 1) % 10) + 1;
  const b = ((p.lastStage - 1) % 10) + 1;
  return `${w0}-${a}〜${w0}-${b}`;
}

export function getGalaxyBossStageLabel(p) {
  const w0 = Math.floor((p.lastStage - 1) / 10) + 1;
  const local = ((p.lastStage - 1) % 10) + 1;
  return `${w0}-${local}`;
}

/** 惑星ワールド内進捗に応じた★（1〜3）。未解放は 0 */
export function getGalaxyPlanetStarCount(p, g) {
  const hs = Math.max(1, g.highestStage | 0);
  if (hs < p.firstStage) return 0;
  const span = p.lastStage - p.firstStage + 1;
  const cleared = Math.min(hs, p.lastStage) - p.firstStage + 1;
  return Math.min(3, Math.max(1, Math.ceil((cleared * 3) / span)));
}

/** ★表示用（満たした数と空き） */
export function formatGalaxyStars(n) {
  const c = Math.max(0, Math.min(3, n | 0));
  return '★'.repeat(c) + '☆'.repeat(3 - c);
}
