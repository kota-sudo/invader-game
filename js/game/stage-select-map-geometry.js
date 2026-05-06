/**
 * ステージ選択左マップのノード座標・スクロール範囲。
 * `stage-select-overlay.js` の SVG と一致させること。
 *
 * 火星ワールド（ローカル 1〜10）: 中央縦軸基準のジグザグ。
 * 1=L, 2=R, 3=L, 4=R, 5=C(MID), 6=R, 7=L, 8=R, 9=L, 10=C(BOSS)
 */

/** 調整用定数（他惑星でも流用しやすいようオブジェクト化） */
export const STAGE_SELECT_LAYOUT = {
  /** ローカルステージ1のノード中心Y（スクロールコンテンツ座標） */
  firstNodeY: 138,
  /** 隣接ステージ間の縦間隔（中心〜中心） */
  nodeSpacingY: 72,
  /** 中央軸から左右への振れ幅（px） */
  amplitudeX: 104,
  /** 最終ノードより下の余白（チップ・下端クリップ防止） */
  bottomPadding: 112,
};

/** ローカルステージ 1..10 の横位置（L/R/C） */
const LOCAL_NODE_SIDE = /** @type {const} */ ([
  null,
  'L',
  'R',
  'L',
  'R',
  'C',
  'R',
  'L',
  'R',
  'L',
  'C',
]);

/**
 * @param {number} canvasH
 * @param {number} [panelLeftW=478]
 */
export function getStageSelectMapSpatialConstants(canvasH, panelLeftW = 478) {
  const H = canvasH;
  const leftW = panelLeftW;
  const cx = leftW / 2;
  const { firstNodeY, nodeSpacingY, amplitudeX, bottomPadding } = STAGE_SELECT_LAYOUT;

  const leftX = cx - amplitudeX;
  const rightX = cx + amplitudeX;

  /** @type {Record<number, { x: number; y: number }>} */
  const layoutPos = {};
  for (let ls = 1; ls <= 10; ls++) {
    const side = LOCAL_NODE_SIDE[ls];
    const y = firstNodeY + (ls - 1) * nodeSpacingY;
    let x = cx;
    if (side === 'L') x = leftX;
    else if (side === 'R') x = rightX;
    layoutPos[ls] = { x, y };
  }

  const rNode = 22;
  const rSel = 27;
  const y10 = layoutPos[10].y;
  const contentBottom = y10 + rSel * 1.35 + bottomPadding;
  const maxScroll = Math.max(0, Math.ceil(contentBottom - H));

  return {
    H,
    leftW,
    cx,
    leftX,
    rightX,
    amplitudeX,
    firstNodeY,
    nodeSpacingY,
    layoutPos,
    rNode,
    rSel,
    contentBottom,
    maxScroll,
  };
}

/**
 * @param {number} canvasH
 * @param {number} stageNum 1-based グローバル
 * @param {number} [panelLeftW=478]
 */
export function getStageSelectNodeWorldPos(canvasH, stageNum, panelLeftW = 478) {
  const S = getStageSelectMapSpatialConstants(canvasH, panelLeftW);
  const { layoutPos, rNode, rSel } = S;

  const worldStart = Math.floor((stageNum - 1) / 10) * 10 + 1;
  const stages = Array.from({ length: 10 }, (_, i) => worldStart + i);
  const idx = stages.indexOf(stageNum);
  if (idx < 0) return null;

  const s = stages[idx];
  const localS = ((s - 1) % 10) + 1;
  const isMidBoss = localS === 5;
  const isFinalBoss = localS === 10;
  const mul = isFinalBoss ? 1.35 : isMidBoss ? 1.12 : 1;
  const lp = layoutPos[localS];
  if (!lp) return null;
  const r = rSel * mul;
  return { x: lp.x, y: lp.y, r };
}

/**
 * 自機インジケータが追うステージ番号（選択中ノード＝マップ上のカーソル）
 * @param {number} selStage 選択中のステージ（1始まり）
 */
export function getStageSelectShipFollowStage(selStage, _highestStage) {
  void _highestStage;
  return Math.max(1, Math.floor(selStage || 1));
}

/**
 * 自機スプライトの追従ターゲット（ノードの下＝進行方向側）。
 */
export function getStageSelectShipTarget(canvasH, stageNum, panelLeftW = 478, _highestStage) {
  void _highestStage;
  const p = getStageSelectNodeWorldPos(canvasH, stageNum, panelLeftW);
  if (!p) return null;
  const localS = ((stageNum - 1) % 10) + 1;
  const isMidBoss = localS === 5;
  const isFinalBoss = localS === 10;
  let dx = 0;
  let dy;
  if (isFinalBoss) {
    dy = p.r + 92;
    dx = -26;
  } else if (isMidBoss) {
    dy = p.r + 76;
    dx = -18;
  } else {
    dy = p.r + 34;
  }
  return { x: p.x + dx, y: p.y + dy, r: p.r };
}

/**
 * 選択ステージが画面縦の focusFrac 付近に来るスクロール量（0..maxScroll）
 * @param {number} focusFrac 0=上端, 0.5=中央付近
 */
export function getStageSelectIdealScroll(stageNum, canvasH, panelLeftW = 478, focusFrac = 0.36) {
  const S = getStageSelectMapSpatialConstants(canvasH, panelLeftW);
  const p = getStageSelectNodeWorldPos(canvasH, stageNum, panelLeftW);
  if (!p) return 0;
  const want = p.y - S.H * focusFrac;
  return Math.max(0, Math.min(S.maxScroll, Math.round(want)));
}
