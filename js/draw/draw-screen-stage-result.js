/**
 * Stage clear result screen（火星 BG + HUD。日本語のみ・コイン/ジェムはアイコン）
 */
import { game } from '../game/game-store.js';
import {
  CANVAS_W as W,
  CANVAS_H as H,
  STAGE_RESULT_BUTTON_MIN_TIMER,
} from '../game/constants.js';
import { drawCoinInlineIcon, drawGemInlineIcon } from './draw-screen-gacha.js';
import { formatStageForHud } from '../game/gameover-copy.js';

const STAGE_RESULT_BG = './assets/ui/stage-result-mars-bg.png';

let drawDeps;
let computeStageStarMedal;
let formatStageId;
let getImage;
let getPlanet;

export function setStageResultScreenDrawDeps(deps) {
  drawDeps = deps;
  ({
    computeStageStarMedal,
    formatStageId,
    getImage,
    getPlanet,
  } = deps);
}

function drawCoverImage(ctx, img) {
  if (!img?.complete || !img.naturalWidth) return false;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(W / iw, H / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (W - dw) / 2;
  const dy = (H - dh) / 2;
  ctx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
  return true;
}

function drawCornerAccents(ctx, x, y, w, h, col, len = 18) {
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
  ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len);
  ctx.moveTo(x + w, y + h - len); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - len, y + h);
  ctx.moveTo(x + len, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - len);
  ctx.stroke();
}

function drawHudFrame(ctx, x, y, w, h) {
  ctx.strokeStyle = 'rgba(0, 220, 255, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.stroke();
  drawCornerAccents(ctx, x, y, w, h, 'rgba(120, 240, 255, 0.9)', 20);
}

function isStageResultHitHovered(type) {
  const h = game.hoveredBtn;
  return h && h.stageResultType === type;
}

/** 右端基準で「アイコン + +数値」（コイン） */
function drawCoinValueRight(ctx, rightX, yMid, amount, color, fontPx = 16) {
  const str = `+${amount}`;
  ctx.save();
  ctx.font = `bold ${fontPx}px Orbitron,Courier New`;
  ctx.textAlign = 'right';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 5;
  const tw = ctx.measureText(str).width;
  ctx.fillText(str, rightX, yMid);
  ctx.shadowBlur = 0;
  drawCoinInlineIcon(rightX - tw - 18, yMid - 1, Math.min(17, Math.max(13, fontPx)));
  ctx.restore();
}

/** 右端基準で「アイコン + +数値」（ジェム） */
function drawGemValueRight(ctx, rightX, yMid, amount, color, fontPx = 16) {
  const str = `+${amount}`;
  ctx.save();
  ctx.font = `bold ${fontPx}px Orbitron,Courier New`;
  ctx.textAlign = 'right';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 5;
  const tw = ctx.measureText(str).width;
  ctx.fillText(str, rightX, yMid);
  ctx.shadowBlur = 0;
  drawGemInlineIcon(rightX - tw - 16, yMid - 1, Math.min(15, Math.max(11, fontPx - 2)), color);
  ctx.restore();
}

export function drawStageResult() {
  const ctx = drawDeps.ctx;
  if (!game.stageResultData) return;
  const d = game.stageResultData;
  game.stageResultTimer++;
  const cx = W / 2;

  const planetEarly = typeof getPlanet === 'function' ? getPlanet(d.stage) : null;
  const isMarsPlanet = planetEarly?.name === 'MARS';
  const bg = isMarsPlanet && getImage ? getImage(STAGE_RESULT_BG) : null;
  const hasBg = isMarsPlanet && drawCoverImage(ctx, bg);
  if (!hasBg) {
    const pn = planetEarly?.name || '';
    let bgBase;
    if (pn === 'VENUS') {
      bgBase = ctx.createLinearGradient(0, 0, W, H);
      bgBase.addColorStop(0, 'rgba(14, 10, 4, 0.98)');
      bgBase.addColorStop(0.45, 'rgba(28, 22, 8, 0.96)');
      bgBase.addColorStop(1, 'rgba(8, 6, 2, 0.98)');
    } else if (pn === 'JUPITER') {
      bgBase = ctx.createRadialGradient(W * 0.35, H * 0.2, 0, W * 0.5, H * 0.45, Math.max(W, H) * 0.85);
      bgBase.addColorStop(0, 'rgba(22, 12, 4, 0.96)');
      bgBase.addColorStop(0.55, 'rgba(10, 6, 14, 0.97)');
      bgBase.addColorStop(1, 'rgba(4, 3, 10, 0.98)');
    } else if (pn === 'SATURN') {
      bgBase = ctx.createLinearGradient(0, 0, 0, H);
      bgBase.addColorStop(0, 'rgba(8, 10, 18, 0.98)');
      bgBase.addColorStop(0.5, 'rgba(12, 14, 22, 0.96)');
      bgBase.addColorStop(1, 'rgba(6, 8, 14, 0.98)');
    } else {
      bgBase = ctx.createLinearGradient(0, 0, W * 0.7, H);
      bgBase.addColorStop(0, 'rgba(4, 6, 22, 0.98)');
      bgBase.addColorStop(0.55, 'rgba(8, 4, 18, 0.96)');
      bgBase.addColorStop(1, 'rgba(2, 3, 14, 0.98)');
    }
    ctx.fillStyle = bgBase;
    ctx.fillRect(0, 0, W, H);
  }
  const vg = ctx.createLinearGradient(0, 0, 0, H);
  vg.addColorStop(0, 'rgba(0, 4, 18, 0.72)');
  vg.addColorStop(0.35, 'rgba(0, 2, 10, 0.25)');
  vg.addColorStop(0.7, 'rgba(0, 2, 10, 0.45)');
  vg.addColorStop(1, 'rgba(0, 0, 8, 0.88)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  const margin = 12;
  drawHudFrame(ctx, margin, margin, W - margin * 2, H - margin * 2);

  const subLine = (() => {
    const sid = typeof formatStageId === 'function' ? formatStageId(d.stage) : String(d.stage);
    const kj = planetEarly?.kanji || '宙域';
    return `${kj}　${sid}`;
  })();

  const rankColors = { S: '#ffdd00', A: '#ff8844', B: '#44aaff', C: '#aaaaaa' };
  const rc = rankColors[d.rank] || '#aaa';

  const titleAlpha = Math.min(1, game.stageResultTimer / 18);
  ctx.save(); ctx.globalAlpha = titleAlpha;
  ctx.fillStyle = '#f4fbff';
  ctx.font = 'bold 22px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 200, 255, 0.65)';
  ctx.shadowBlur = 18;
  const stageHud =
    typeof formatStageId === 'function' ? formatStageId(d.stage) : formatStageForHud(d.stage);
  ctx.fillText(`STAGE ${stageHud} COMPLETE`, cx, 56);
  ctx.shadowBlur = 0;

  const subY = 78;
  ctx.strokeStyle = 'rgba(255, 120, 60, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 200, subY); ctx.lineTo(cx - 100, subY);
  ctx.moveTo(cx + 100, subY); ctx.lineTo(cx + 200, subY);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 150, 90, 0.95)';
  ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.fillText(subLine, cx, subY + 4);
  ctx.restore();

  const rankCy = 138;
  const rankAlpha = Math.min(1, Math.max(0, (game.stageResultTimer - 12) / 18));
  const rankScale = rankAlpha < 1 ? 0.72 + rankAlpha * 0.28 : 1;
  ctx.save(); ctx.globalAlpha = rankAlpha;
  ctx.translate(cx, rankCy);
  ctx.scale(rankScale, rankScale);
  ctx.strokeStyle = 'rgba(255, 120, 40, 0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 78, -0.15 * Math.PI, 1.15 * Math.PI);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.35)';
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.arc(0, 0, 86, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = rc;
  ctx.font = 'bold 88px Orbitron,Courier New';
  ctx.textAlign = 'center';
  ctx.shadowColor = rc;
  ctx.shadowBlur = 26;
  ctx.fillText(d.rank, 0, 30);
  ctx.shadowBlur = 0;
  ctx.restore();

  const starN = typeof d.starsEarned === 'number'
    ? d.starsEarned
    : computeStageStarMedal(d.hits, d.maxCombo, d.stageType);
  const starAlpha = Math.min(1, Math.max(0, (game.stageResultTimer - 20) / 16));
  ctx.save(); ctx.globalAlpha = starAlpha;
  ctx.textAlign = 'center';
  const sy = rankCy + 64;
  const starStep = 34;
  const starFont = 26;
  for (let i = 0; i < 3; i++) {
    const on = i < starN;
    ctx.fillStyle = on ? 'rgba(255, 220, 100, 0.98)' : 'rgba(40, 48, 64, 0.55)';
    ctx.shadowColor = on ? 'rgba(255, 200, 80, 0.75)' : 'transparent';
    ctx.shadowBlur = on ? 12 : 0;
    ctx.font = `bold ${starFont}px Orbitron,Courier New`;
    ctx.fillText(on ? '★' : '☆', cx - starStep + i * starStep, sy);
  }
  ctx.shadowBlur = 0;
  ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  if (d.starsSkippedMedal) {
    ctx.fillStyle = 'rgba(180, 195, 215, 0.95)';
    ctx.fillText('★はコンティニューのため記録されません', cx, sy + 22);
  } else {
    const full = starN >= 3;
    ctx.fillStyle = full ? 'rgba(255, 230, 140, 0.98)' : 'rgba(200, 215, 235, 0.95)';
    ctx.fillText(
      full ? '★ 3/3 すべて達成！' : `★ ${starN}/3 獲得`,
      cx,
      sy + 22,
    );
    ctx.font = '10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillStyle = 'rgba(165, 185, 210, 0.9)';
    ctx.fillText('ランク・★は被弾が少なく、コンボが高いほど上がります', cx, sy + 38);
  }
  ctx.restore();

  const panelW = Math.min(420, W - margin * 4);
  const starCaptionH = d.starsSkippedMedal ? 32 : 44;
  let rowY = sy + starCaptionH + 8;

  const secLabAlpha = Math.min(1, Math.max(0, (game.stageResultTimer - 22) / 12));
  ctx.save();
  ctx.globalAlpha = secLabAlpha;
  ctx.fillStyle = 'rgba(150, 175, 200, 0.9)';
  ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('── 今回の実績 ──', cx, rowY + 10);
  ctx.restore();
  rowY += 20;

  const statRows = [
    { icon: '⊕', l: '撃破数', value: d.kills, c: '#00ffcc', kind: 'num' },
    { icon: '◇', l: '被弾数', value: d.hits, c: d.hits === 0 ? '#ffe8a0' : '#ff8888', kind: 'num' },
    { icon: '⚡', l: '最大コンボ', value: d.maxCombo, c: '#66ddff', kind: 'num' },
  ];
  const rowH = 28;
  const gap = 4;
  statRows.forEach((s, i) => {
    const rowAlpha = Math.min(1, Math.max(0, (game.stageResultTimer - 24 - i * 5) / 12));
    const bx = cx - panelW / 2;
    ctx.save(); ctx.globalAlpha = rowAlpha;
    ctx.fillStyle = 'rgba(8, 12, 22, 0.72)';
    ctx.strokeStyle = 'rgba(60, 100, 140, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(bx, rowY, panelW, rowH, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(0, 220, 255, 0.9)';
    ctx.font = 'bold 12px Orbitron,Courier New';
    ctx.textAlign = 'left';
    ctx.fillText(s.icon, bx + 10, rowY + rowH / 2 + 4);
    ctx.fillStyle = 'rgba(210, 220, 240, 0.96)';
    ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    const labX = bx + 30;
    ctx.fillText(s.l, labX, rowY + rowH / 2 + 4);
    if (s.l === '被弾数' && d.hits === 0) {
      const lw = ctx.measureText(s.l).width;
      ctx.font = 'bold 9px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
      ctx.fillStyle = 'rgba(255, 215, 150, 0.88)';
      ctx.fillText('ノーダメ', labX + lw + 6, rowY + rowH / 2 + 4);
    }
    const yMid = rowY + rowH / 2 + 5;
    const rx = bx + panelW - 10;
    ctx.fillStyle = s.c;
    ctx.shadowColor = s.c;
    ctx.shadowBlur = 4;
    ctx.font = 'bold 15px Orbitron,Courier New';
    ctx.textAlign = 'right';
    ctx.fillText(String(s.value), rx, yMid);
    ctx.shadowBlur = 0;
    ctx.restore();
    rowY += rowH + gap;
  });

  const profGain = typeof d.profileExpGained === 'number' ? d.profileExpGained : null;
  if (profGain != null && profGain > 0) {
    const rowAlpha = Math.min(1, Math.max(0, (game.stageResultTimer - 38) / 12));
    const bx = cx - panelW / 2;
    const profH = d.profileLeveled ? rowH + 16 : rowH;
    ctx.save();
    ctx.globalAlpha = rowAlpha;
    ctx.fillStyle = 'rgba(18, 14, 36, 0.78)';
    ctx.strokeStyle = 'rgba(180, 160, 255, 0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(bx, rowY, panelW, profH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(200, 180, 255, 0.95)';
    ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('✦ プロフィール EXP', bx + 10, rowY + rowH / 2 + 2);
    ctx.fillStyle = '#dde8ff';
    ctx.font = 'bold 16px Orbitron,Courier New';
    ctx.textAlign = 'right';
    ctx.shadowColor = 'rgba(180, 200, 255, 0.55)';
    ctx.shadowBlur = 5;
    ctx.fillText(`+${profGain}`, bx + panelW - 12, rowY + rowH / 2 + 6);
    ctx.shadowBlur = 0;
    if (d.profileLeveled && d.profileNewLevel) {
      ctx.fillStyle = 'rgba(255, 230, 150, 0.98)';
      ctx.font = 'bold 10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Lv.${d.profileNewLevel} にレベルアップ！`, cx, rowY + rowH + 4);
    }
    ctx.restore();
    rowY += profH + gap;
  }

  rowY += 4;

  const clearC = typeof d.clearRewardCoins === 'number' ? d.clearRewardCoins : 0;
  const clearG = typeof d.clearRewardGems === 'number' ? d.clearRewardGems : 0;
  const rankC = Math.max(0, d.rankBonus | 0);
  const rankG = typeof d.rankGems === 'number' ? d.rankGems : 0;
  const totalC = clearC + rankC;
  const totalG = clearG + rankG;

  const hasStageLoot = clearC > 0 || clearG > 0;
  const hasRankLoot = rankC > 0 || rankG > 0;
  const detailLines = (hasStageLoot ? 1 : 0) + (hasRankLoot ? 1 : 0);
  const rewardPanelH = 24 + Math.max(detailLines, 1) * 15 + 12 + 30;

  const rewardAlpha = Math.min(1, Math.max(0, (game.stageResultTimer - 44) / 14));
  ctx.save(); ctx.globalAlpha = rewardAlpha;
  const tbx = cx - panelW / 2;
  const tby = rowY;
  ctx.fillStyle = 'rgba(24, 36, 52, 0.88)';
  ctx.strokeStyle = 'rgba(255, 200, 100, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(tbx, tby, panelW, rewardPanelH, 10); ctx.fill(); ctx.stroke();

  ctx.fillStyle = 'rgba(255, 230, 160, 0.98)';
  ctx.font = 'bold 13px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('獲得報酬', tbx + 14, tby + 16);

  const gemCol = '#9ae8ff';
  const detailPx = 13;
  let ry = tby + 30;
  const rxLine = tbx + panelW - 14;

  const drawRewardDetailLine = (label, cCoins, cGems) => {
    ctx.fillStyle = 'rgba(175, 190, 210, 0.95)';
    ctx.font = `bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(label, tbx + 14, ry);
    let rxv = rxLine;
    if (cGems > 0) {
      drawGemValueRight(ctx, rxv, ry + 1, cGems, gemCol, detailPx);
      ctx.font = `bold ${detailPx}px Orbitron,Courier New`;
      rxv -= ctx.measureText(`+${cGems}`).width + 28;
    }
    if (cCoins > 0) {
      drawCoinValueRight(ctx, rxv, ry + 1, cCoins, '#ffcc66', detailPx);
    }
    ry += 15;
  };

  if (hasStageLoot) drawRewardDetailLine('ステージ（ドロップ・クリア）', clearC, clearG);
  if (hasRankLoot) drawRewardDetailLine(`ランクボーナス（${d.rank}）`, rankC, rankG);
  if (!hasStageLoot && !hasRankLoot) {
    ctx.fillStyle = 'rgba(150, 165, 185, 0.9)';
    ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('（ステージ報酬・ランクボーナスなし）', tbx + 14, ry);
    ry += 15;
  }

  ctx.strokeStyle = 'rgba(255, 200, 100, 0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tbx + 12, ry + 2);
  ctx.lineTo(tbx + panelW - 12, ry + 2);
  ctx.stroke();
  ry += 10;

  ctx.fillStyle = 'rgba(230, 240, 255, 0.96)';
  ctx.font = 'bold 12px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('合計', tbx + 14, ry + 8);

  const yTot = ry + 8;
  let rx = tbx + panelW - 12;
  const totFont = 19;
  if (totalG > 0) {
    drawGemValueRight(ctx, rx, yTot, totalG, gemCol, totFont);
    ctx.font = `bold ${totFont}px Orbitron,Courier New`;
    rx -= ctx.measureText(`+${totalG}`).width + 34;
  }
  drawCoinValueRight(ctx, rx, yTot, totalC, '#ffcc66', totFont);
  ctx.restore();

  const bottomPad = 10;
  const retryH = 46;
  const mainBh = 48;
  const gapBtn = 10;
  const by = H - bottomPad - retryH - gapBtn - mainBh;

  if (!Array.isArray(game._stageResultHits)) game._stageResultHits = [];
  game._stageResultHits = [];
  if (game.stageResultTimer > STAGE_RESULT_BUTTON_MIN_TIMER) {
    const innerW = W - margin * 4;
    const bw = Math.floor((innerW - gapBtn) / 2);
    const b1x = margin * 2;
    const b2x = b1x + bw + gapBtn;
    const retryW = bw;
    const ryx = Math.floor(cx - retryW / 2);
    const ryy = by + mainBh + gapBtn;

    game._stageResultHits.push({ type: 'next', x: b1x, y: by, w: bw, h: mainBh });
    game._stageResultHits.push({ type: 'select', x: b2x, y: by, w: bw, h: mainBh });
    game._stageResultHits.push({ type: 'retry', x: ryx, y: ryy, w: retryW, h: retryH });

    const hNext = isStageResultHitHovered('next');
    const hSel = isStageResultHitHovered('select');
    const hRetry = isStageResultHitHovered('retry');

    ctx.save(); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0, 40, 72, 0.92)';
    ctx.strokeStyle = hNext ? '#55eeff' : '#00ccff';
    ctx.lineWidth = hNext ? 3 : 2.2;
    ctx.shadowColor = '#00ccff';
    ctx.shadowBlur = hNext ? 20 : 12;
    ctx.beginPath(); ctx.roundRect(b1x, by, bw, mainBh, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#ccfbff';
    ctx.font = 'bold 14px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('次のステージへ', b1x + bw / 2, by + mainBh / 2 + 5);
    ctx.restore();

    ctx.save(); ctx.globalAlpha = 0.96;
    ctx.fillStyle = 'rgba(16, 20, 28, 0.92)';
    ctx.strokeStyle = hSel ? 'rgba(120, 160, 200, 0.85)' : 'rgba(70, 90, 120, 0.75)';
    ctx.lineWidth = hSel ? 2 : 1.4;
    ctx.beginPath(); ctx.roundRect(b2x, by, bw, mainBh, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = hSel ? '#dde8f8' : '#99aabb';
    ctx.font = 'bold 14px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ステージ選択', b2x + bw / 2, by + mainBh / 2 + 5);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.92 + (hRetry ? 0.08 : 0);
    ctx.fillStyle = hRetry ? 'rgba(36, 44, 62, 0.96)' : 'rgba(28, 32, 44, 0.92)';
    ctx.strokeStyle = hRetry ? 'rgba(180, 200, 240, 0.75)' : 'rgba(100, 120, 150, 0.65)';
    ctx.lineWidth = hRetry ? 2 : 1.4;
    ctx.beginPath(); ctx.roundRect(ryx, ryy, retryW, retryH, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = hRetry ? '#eef4ff' : '#c8d4e8';
    ctx.font = 'bold 14px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('リトライ', ryx + retryW / 2, ryy + retryH / 2 + 5);
    ctx.restore();
  } else if (game.stageResultTimer > 0) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillStyle = 'rgba(180, 200, 230, 0.75)';
    ctx.fillText('まもなくボタンが表示されます', cx, H - bottomPad - 8);
    ctx.restore();
  }
}
