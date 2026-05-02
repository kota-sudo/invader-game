/**
 * ステージ選択左マップ（ジグザグ）のノード座標。
 * drawStageSelectScreen 内の計算と一致させること。
 */
export function getStageSelectNodeWorldPos(canvasH, stageNum, panelLeftW = 478) {
  const H = canvasH;
  const leftW = panelLeftW;
  const cx = leftW / 2;
  const topY = Math.max(96, Math.min(140, Math.round(H * 0.16)));
  const bottomPad = 120;
  const vGap = Math.max(86, Math.min(124, Math.floor((H - topY - bottomPad) / 4) * 0.88));
  const zigX = Math.max(80, Math.min(132, Math.floor(leftW * 0.27)));
  const leftX = cx - zigX;
  const rightX = cx + zigX;
  const rNode = 26;
  const rSel = 30;

  const worldStart = (Math.floor((stageNum - 1) / 10)) * 10 + 1;
  const local = ((stageNum - 1) % 10) + 1;
  const groupStart = worldStart + Math.floor((local - 1) / 5) * 5;
  const stages = [0, 1, 2, 3, 4].map((i) => groupStart + i);
  const idx = stages.indexOf(stageNum);
  if (idx < 0) return null;

  const s = stages[idx];
  const i = idx;
  const localS = ((s - 1) % 10) + 1;
  const isMidBoss = localS === 5;
  const isFinalBoss = localS === 10;
  const isSel = s === stageNum;
  const mul = isFinalBoss ? 1.5 : isMidBoss ? 1.2 : 1;
  const t = i / 4;
  const y = topY + (t * t * 0.12 + t * 0.88) * vGap * 4;
  const fan = 0.9 + 0.34 * t;
  const sway = Math.sin((t * 1.15 + 0.15) * Math.PI) * 10;
  const jitter = ((Math.sin(s * 12.9898) * 0.5 + 0.5) * 2 - 1) * 20;
  const x =
    i === 4 ? cx + jitter * 0.25 : (i % 2 === 0 ? leftX * fan : rightX * fan) + sway * (i % 2 === 0 ? -1 : 1) + jitter;
  const r = (isSel ? rSel : rNode) * mul;
  return { x, y, r };
}

/**
 * 自機が追うステージ番号（未開放ノードには行かせない）
 * @param {number} selStage 選択中のステージ（1始まり）
 * @param {number} highestStage 到達済みの最大ステージ
 */
export function getStageSelectShipFollowStage(selStage, highestStage) {
  const s = Math.max(1, Math.floor(selStage || 1));
  const hs = Math.max(1, Math.floor(Number.isFinite(highestStage) ? highestStage : 1));
  return Math.min(s, hs);
}

/** 自機スプライトの追従ターゲット（ノードの少し下＝進行方向側） */
export function getStageSelectShipTarget(canvasH, stageNum, panelLeftW = 478) {
  const p = getStageSelectNodeWorldPos(canvasH, stageNum, panelLeftW);
  if (!p) return null;
  return { x: p.x, y: p.y + p.r * 0.55 + 16, r: p.r };
}
