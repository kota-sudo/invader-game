/**
 * Stage clear result screen（火星 BG + HUD。日本語のみ・コイン/ジェムはアイコン）
 */
import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';
import { drawCoinInlineIcon, drawGemInlineIcon } from './draw-screen-gacha.js';

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
function drawCoinValueRight(ctx, rightX, yMid, amount, color) {
  const str = `+${amount}`;
  ctx.save();
  ctx.font = 'bold 16px Orbitron,Courier New';
  ctx.textAlign = 'right';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 5;
  const tw = ctx.measureText(str).width;
  ctx.fillText(str, rightX, yMid);
  ctx.shadowBlur = 0;
  drawCoinInlineIcon(rightX - tw - 18, yMid - 1, 16);
  ctx.restore();
}

/** 右端基準で「アイコン + +数値」（ジェム） */
function drawGemValueRight(ctx, rightX, yMid, amount, color) {
  const str = `+${amount}`;
  ctx.save();
  ctx.font = 'bold 16px Orbitron,Courier New';
  ctx.textAlign = 'right';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 5;
  const tw = ctx.measureText(str).width;
  ctx.fillText(str, rightX, yMid);
  ctx.shadowBlur = 0;
  drawGemInlineIcon(rightX - tw - 16, yMid - 1, 14, color);
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
    ctx.fillStyle = 'rgba(2, 4, 12, 0.97)';
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
  ctx.fillText(`STAGE ${d.stage} COMPLETE`, cx, 56);
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
  const rankScale = rankAlpha < 1 ? 0.72 + rankAlpha * 0.28 : 1 + Math.sin(Math.max(0, game.stageResultTimer - 32) * 0.28) * 0.03;
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
  const sy = rankCy + 58;
  for (let i = 0; i < 3; i++) {
    const on = i < starN;
    ctx.fillStyle = on ? 'rgba(255, 220, 100, 0.98)' : 'rgba(40, 48, 64, 0.55)';
    ctx.shadowColor = on ? 'rgba(255, 200, 80, 0.75)' : 'transparent';
    ctx.shadowBlur = on ? 12 : 0;
    ctx.font = 'bold 22px Orbitron,Courier New';
    ctx.fillText(on ? '★' : '☆', cx - 28 + i * 28, sy);
  }
  ctx.shadowBlur = 0;
  if (d.starsSkippedMedal) {
    ctx.fillStyle = 'rgba(160, 175, 200, 0.95)';
    ctx.font = '10px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText('（コンティニュー使用のため、このクリアは★未更新）', cx, sy + 20);
  }
  ctx.restore();

  const stats = [
    { icon: '⊕', l: '撃破数', value: d.kills, c: '#00ffcc', kind: 'num' },
    { icon: '◇', l: '被弾数', value: d.hits, c: d.hits === 0 ? '#ffe8a0' : '#ff8888', kind: 'num' },
    { icon: '⚡', l: '最大コンボ', value: d.maxCombo, c: '#66ddff', kind: 'num' },
    { icon: '◎', l: 'ランクボーナス', value: d.rankBonus, c: rc, kind: 'coin' },
  ];

  const panelW = Math.min(400, W - margin * 4);
  const rowH = 34;
  const gap = 6;
  let rowY = sy + 28;

  stats.forEach((s, i) => {
    const rowAlpha = Math.min(1, Math.max(0, (game.stageResultTimer - 26 - i * 6) / 14));
    const bx = cx - panelW / 2;
    ctx.save(); ctx.globalAlpha = rowAlpha;
    ctx.fillStyle = 'rgba(8, 12, 22, 0.72)';
    ctx.strokeStyle = 'rgba(60, 100, 140, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(bx, rowY, panelW, rowH, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(0, 220, 255, 0.9)';
    ctx.font = 'bold 13px Orbitron,Courier New';
    ctx.textAlign = 'left';
    ctx.fillText(s.icon, bx + 10, rowY + rowH / 2 + 4);
    ctx.fillStyle = 'rgba(210, 220, 240, 0.96)';
    ctx.font = 'bold 13px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
    ctx.fillText(s.l, bx + 32, rowY + rowH / 2 + 4);
    const yMid = rowY + rowH / 2 + 5;
    const rx = bx + panelW - 10;
    if (s.kind === 'coin') drawCoinValueRight(ctx, rx, yMid, s.value, s.c);
    else {
      ctx.fillStyle = s.c;
      ctx.shadowColor = s.c;
      ctx.shadowBlur = 5;
      ctx.font = 'bold 16px Orbitron,Courier New';
      ctx.textAlign = 'right';
      ctx.fillText(String(s.value), rx, yMid);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    rowY += rowH + gap;
  });

  const gems = typeof d.rankGems === 'number' ? d.rankGems : 0;
  const totalAlpha = Math.min(1, Math.max(0, (game.stageResultTimer - 58) / 14));
  ctx.save(); ctx.globalAlpha = totalAlpha;
  const tbx = cx - panelW / 2;
  const tby = rowY + 4;
  const totalH = 38;
  ctx.fillStyle = 'rgba(24, 36, 52, 0.88)';
  ctx.strokeStyle = 'rgba(255, 200, 100, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(tbx, tby, panelW, totalH, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255, 230, 160, 0.98)';
  ctx.font = 'bold 13px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('合計報酬', tbx + 12, tby + totalH / 2 + 4);

  const yTot = tby + totalH / 2 + 5;
  let rx = tbx + panelW - 10;
  const gemCol = '#9ae8ff';
  ctx.font = 'bold 16px Orbitron,Courier New';
  if (gems > 0) {
    drawGemValueRight(ctx, rx, yTot, gems, gemCol);
    rx -= ctx.measureText(`+${gems}`).width + 32;
  }
  drawCoinValueRight(ctx, rx, yTot, d.rankBonus, '#ffcc66');
  ctx.restore();

  const bottomPad = 10;
  const retryH = 46;
  const mainBh = 48;
  const gapBtn = 10;
  const by = H - bottomPad - retryH - gapBtn - mainBh;

  if (!Array.isArray(game._stageResultHits)) game._stageResultHits = [];
  game._stageResultHits = [];
  if (game.stageResultTimer > 60) {
    const pulse = 0.78 + Math.sin(game.stageResultTimer * 0.08) * 0.22;
    const innerW = W - margin * 4;
    const bw = Math.floor((innerW - gapBtn) / 2);
    const b1x = margin * 2;
    const b2x = b1x + bw + gapBtn;

    game._stageResultHits.push({ type: 'next', x: b1x, y: by, w: bw, h: mainBh });
    game._stageResultHits.push({ type: 'select', x: b2x, y: by, w: bw, h: mainBh });
    const retryW = innerW;
    const ryx = margin * 2;
    const ryy = by + mainBh + gapBtn;
    game._stageResultHits.push({ type: 'retry', x: ryx, y: ryy, w: retryW, h: retryH });

    const hNext = isStageResultHitHovered('next');
    const hSel = isStageResultHitHovered('select');
    const hRetry = isStageResultHitHovered('retry');

    ctx.save(); ctx.globalAlpha = pulse;
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

    ctx.save(); ctx.globalAlpha = pulse * 0.88;
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
  }
}
