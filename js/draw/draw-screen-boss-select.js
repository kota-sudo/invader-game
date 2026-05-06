/**
 * Boss select screen (extracted from draw-screens.js)
 */
import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';
import { hexToRgb } from '../game/color-utils.js';

let drawDeps;
let BOSS_SELECT_DATA;
let drawBossCardSprite;

export function setBossSelectScreenDrawDeps(deps) {
  drawDeps = deps;
  ({ BOSS_SELECT_DATA, drawBossCardSprite } = deps);
}

export function drawBossSelectScreen() {
  const ctx = drawDeps.ctx;
  const t = game.frameCount * 0.016;
  ctx.fillStyle = '#020408'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(8,16,40,0.7)'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(0,100,255,0.04)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  ctx.shadowColor = '#ff8844'; ctx.shadowBlur = 28;
  ctx.fillStyle = '#ff8844'; ctx.font = 'bold 22px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('BOSS  SELECT', W / 2, 26); ctx.shadowBlur = 0;

  // 難易度タブ
  const DIFF_LABELS = ['🌙 EASY', '⚡ NORMAL', '🔥 HARD'];
  const DIFF_COLS = ['#44ff88', '#88aaff', '#ff5544'];
  const tabW = 106, tabH = 22, tabGap = 8;
  const tabX0 = Math.floor((W - 3 * tabW - 2 * tabGap) / 2), tabY = 34;
  game._bossDiffHits = [];
  DIFF_LABELS.forEach((lbl, i) => {
    const tx = tabX0 + i * (tabW + tabGap), isAct = (game.bossDifficulty ?? 1) === i, tc = DIFF_COLS[i];
    ctx.fillStyle = isAct ? `rgba(${hexToRgb(tc)},0.22)` : 'rgba(10,12,22,0.8)';
    ctx.strokeStyle = isAct ? tc : tc + '44'; ctx.lineWidth = isAct ? 1.5 : 1;
    if (isAct) { ctx.shadowColor = tc; ctx.shadowBlur = 10; }
    ctx.beginPath(); ctx.roundRect(tx, tabY, tabW, tabH, 5); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = isAct ? '#fff' : tc + '99';
    ctx.font = `bold ${isAct ? 10 : 9}px Orbitron,Courier New`; ctx.textAlign = 'center';
    ctx.fillText(lbl, tx + tabW / 2, tabY + 15);
    game._bossDiffHits.push({ idx: i, x: tx, y: tabY, w: tabW, h: tabH });
  });
  ctx.textAlign = 'left';

  // ── 通算統計バー ──
  {
    const totalKills = Object.values(game.bossKillsByType || {}).reduce((s, v) => s + (v || 0), 0);
    let bestDiff = -1;
    for (const k of Object.keys(game.bossKillsByType || {})) {
      const d2 = parseInt(k.split('_')[1] || 0, 10);
      if ((game.bossKillsByType[k] || 0) > 0) bestDiff = Math.max(bestDiff, d2);
    }
    const bestDiffLabel = ['EASY', 'NORMAL', 'HARD'][bestDiff] || '-';
    const bestDiffCol = ['#44ff88', '#88aaff', '#ff5544'][bestDiff] || '#556';
    const sRanks = Object.values(game.bossBestRankByType || {}).filter(r => r === 'S').length;
    const statBarY = 59;
    ctx.fillStyle = 'rgba(6,10,28,0.7)';
    ctx.beginPath(); ctx.roundRect(12, statBarY, W - 24, 18, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(80,100,180,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(12, statBarY, W - 24, 18, 4); ctx.stroke();
    const stats = [
      { label: '総討伐', val: `${totalKills}回`, col: '#88ffaa' },
      { label: 'MAX難易度', val: bestDiffLabel, col: bestDiffCol },
      { label: 'Sランク', val: `${sRanks} / ${BOSS_SELECT_DATA.length}`, col: '#ffdd00' },
    ];
    const sw = (W - 24) / stats.length;
    stats.forEach((s, i) => {
      const sx = 12 + i * sw + sw / 2;
      ctx.textAlign = 'center'; ctx.font = '8px Orbitron,Courier New'; ctx.fillStyle = 'rgba(150,160,200,0.6)';
      ctx.fillText(s.label, sx, statBarY + 8);
      ctx.fillStyle = s.col; ctx.font = 'bold 9px Orbitron,Courier New';
      ctx.fillText(s.val, sx, statBarY + 17);
    });
    ctx.textAlign = 'left';
  }

  const featuredIdx = Math.floor(Date.now() / (7 * 24 * 3600 * 1000)) % BOSS_SELECT_DATA.length;
  const showDouble = (game.bossDifficulty ?? 1) === 2;
  game._bossSelectHits = [];
  const cols = 3, cardW = 248, cardH = 228, gapX = 12, gapY = 12;
  const startX = Math.floor((W - cols * cardW - (cols - 1) * gapX) / 2), startY = 80;

  BOSS_SELECT_DATA.forEach((boss, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const cx = startX + col * (cardW + gapX), cy = startY + row * (cardH + gapY);
    const locked = game.highestStage < boss.stageReq;
    const _dk = `${boss.id}_${game.bossDifficulty ?? 1}`;
    const kills = game.bossKillsByType?.[_dk] || 0;
    const best = game.bossBestScoreByType?.[_dk] || 0;
    const bestRank = game.bossBestRankByType?.[_dk] || null;
    const isCur = game.bossSelectCursor === i;
    const isFeat = i === featuredIdx && !locked;
    const pulse = 0.75 + 0.25 * Math.sin(t * 2.2 + i * 0.9);

    ctx.save();
    if (!locked) {
      const grad = ctx.createLinearGradient(cx, cy, cx + cardW, cy + cardH);
      grad.addColorStop(0, `rgba(${hexToRgb(boss.col)},${isCur ? 0.20 : 0.07})`);
      grad.addColorStop(1, 'rgba(4,6,14,0.97)');
      ctx.fillStyle = grad;
      ctx.strokeStyle = isFeat ? (isCur ? '#ffd700' : '#ffd70066') : (isCur ? boss.col : boss.col + '44');
      ctx.lineWidth = isCur ? 2.5 : (isFeat ? 2 : 1);
      if (isCur) { ctx.shadowColor = boss.col; ctx.shadowBlur = 22 * pulse; }
      else if (isFeat) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10 + 5 * Math.sin(t * 2.5); }
    } else {
      ctx.fillStyle = 'rgba(10,10,16,0.95)'; ctx.strokeStyle = '#1a1a2a'; ctx.lineWidth = 1;
    }
    ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

    if (!locked) {
      ctx.fillStyle = (isFeat ? '#ffd700' : boss.col) + (isCur ? 'cc' : (isFeat ? '88' : '44'));
      ctx.beginPath(); ctx.roundRect(cx, cy, cardW, 3, [10, 10, 0, 0]); ctx.fill();

      // 左上: 討伐ティア
      if (kills > 0) {
        const tierLabel = kills >= 30 ? 'MASTER' : kills >= 10 ? 'GOLD' : kills >= 5 ? 'SILVER' : 'BRONZE';
        const tierCol = kills >= 30 ? '#ff88ff' : kills >= 10 ? '#ffd700' : kills >= 5 ? '#c0c0dd' : '#cc8855';
        ctx.fillStyle = `rgba(${hexToRgb(tierCol)},0.22)`;
        ctx.strokeStyle = tierCol; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(cx + 6, cy + 7, 56, 16, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = tierCol; ctx.font = 'bold 8px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText(tierLabel, cx + 34, cy + 19);
      }
      // 右上: ランクバッジ
      if (bestRank) {
        const rankCol = { S: '#ffdd00', A: '#ff8833', B: '#44aaff', C: '#cccccc' }[bestRank];
        ctx.fillStyle = `rgba(${hexToRgb(rankCol)},0.22)`;
        ctx.strokeStyle = rankCol; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(cx + cardW - 36, cy + 7, 30, 16, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = rankCol; ctx.shadowColor = rankCol; ctx.shadowBlur = 6;
        ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText(bestRank, cx + cardW - 21, cy + 19); ctx.shadowBlur = 0;
      }
      // FEATURED バッジ
      if (isFeat) {
        const fby = bestRank ? cy + 27 : cy + 7;
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 3.2);
        ctx.fillStyle = 'rgba(255,215,0,0.22)'; ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(cx + cardW - 54, fby, 48, 16, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 6;
        ctx.font = 'bold 8px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText('★ FEAT', cx + cardW - 30, fby + 12); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }

      drawBossCardSprite(cx + cardW / 2, cy + 38, boss, t, 24, isCur);

      // ボス名
      ctx.fillStyle = isCur ? '#ffffff' : '#ddeeff';
      ctx.font = `bold ${isCur ? 15 : 14}px Orbitron,Courier New`; ctx.textAlign = 'center';
      ctx.shadowColor = boss.col; ctx.shadowBlur = isCur ? 8 : 0;
      ctx.fillText(boss.nameJp, cx + cardW / 2, cy + 77); ctx.shadowBlur = 0;
      ctx.fillStyle = boss.col + (isCur ? 'ff' : 'bb'); ctx.font = '10px Orbitron,Courier New';
      ctx.fillText(boss.nameEn, cx + cardW / 2, cy + 90);

      ctx.strokeStyle = boss.col + (isCur ? '55' : '28'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx + 14, cy + 96); ctx.lineTo(cx + cardW - 14, cy + 96); ctx.stroke();

      // 説明
      ctx.fillStyle = isCur ? 'rgba(200,220,255,0.85)' : 'rgba(180,200,255,0.70)';
      ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText(boss.desc, cx + cardW / 2, cy + 110);

      // ドロップ
      const isBonusDrop = isFeat || showDouble;
      ctx.fillStyle = isBonusDrop ? 'rgba(255,220,60,0.85)' : 'rgba(160,170,185,0.70)';
      ctx.font = '9px Orbitron,Courier New';
      ctx.fillText(isBonusDrop ? 'DROP ×2' : 'DROP', cx + cardW / 2, cy + 124);
      boss.drops.forEach((d, di) => {
        ctx.fillStyle = isBonusDrop ? 'rgba(255,225,90,0.95)' : 'rgba(255,210,120,0.90)';
        ctx.font = '11px Orbitron,Courier New';
        ctx.fillText(d, cx + cardW / 2 + (di === 0 ? -40 : 40), cy + 139);
      });

      // 統計
      ctx.textAlign = 'left';
      ctx.fillStyle = kills > 0 ? '#aaffaa' : '#556'; ctx.font = 'bold 10px Orbitron,Courier New';
      ctx.fillText(`討伐 ${kills}`, cx + 10, cy + 156);
      ctx.textAlign = 'right';
      ctx.fillStyle = best > 0 ? '#ffe8aa' : '#556'; ctx.font = '10px Orbitron,Courier New';
      ctx.fillText(best > 0 ? `Best ${best.toLocaleString()}` : '-', cx + cardW - 10, cy + 156);
      ctx.textAlign = 'center';

      const bpulse = isCur ? pulse : 0.6, btnCol = isFeat && isCur ? '#ffd700' : boss.col;
      ctx.shadowColor = btnCol; ctx.shadowBlur = isCur ? 14 * bpulse : 3;
      ctx.fillStyle = isCur ? `rgba(${hexToRgb(btnCol)},0.25)` : 'rgba(10,12,22,0.8)';
      ctx.strokeStyle = btnCol + (isCur ? 'cc' : '55'); ctx.lineWidth = isCur ? 1.5 : 1;
      ctx.beginPath(); ctx.roundRect(cx + 10, cy + 162, cardW - 20, 36, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = isCur ? '#fff' : btnCol + 'cc';
      ctx.font = `bold ${isCur ? 14 : 12}px Orbitron,Courier New`;
      ctx.fillText(isFeat ? '★  挑  戦' : '▶  挑  戦', cx + cardW / 2, cy + 186);

      game._bossSelectHits.push({ bossId: boss.id, x: cx, y: cy, w: cardW, h: cardH, idx: i });
    } else {
      ctx.fillStyle = '#2a2a3a'; ctx.font = '28px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('🔒', cx + cardW / 2, cy + cardH / 2 - 16);
      ctx.fillStyle = '#443'; ctx.font = '10px Orbitron,Courier New';
      ctx.fillText(`Stage ${boss.stageReq}  でアンロック`, cx + cardW / 2, cy + cardH / 2 + 10);
      ctx.fillStyle = '#334'; ctx.font = 'bold 11px Orbitron,Courier New';
      ctx.fillText(boss.nameJp, cx + cardW / 2, cy + cardH / 2 + 28);
    }
    ctx.restore();
  });

  ctx.fillStyle = 'rgba(4,6,14,0.95)'; ctx.fillRect(0, H - 26, W, 26);
  ctx.strokeStyle = 'rgba(50,80,140,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, H - 26); ctx.lineTo(W, H - 26); ctx.stroke();
  ctx.fillStyle = 'rgba(150,170,220,0.4)'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('[ ← → ↑ ↓ ]  選択  ·  [ Enter ]  挑戦  ·  [ Q / E ]  難易度  ·  [ ESC ]  戻る', W / 2, H - 8);
  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}
