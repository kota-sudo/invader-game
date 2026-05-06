/**
 * Mode select screen (extracted from draw-screens.js)
 */
import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';
import { hexToRgb } from '../game/color-utils.js';

let drawDeps;
let readWeeklyLocalBoard;

export function setModeSelectScreenDrawDeps(deps) {
  drawDeps = deps;
  ({ readWeeklyLocalBoard } = deps);
}

export function drawModeSelectScreen() {
  const ctx = drawDeps.ctx;
  const t = game.frameCount * 0.016;
  ctx.fillStyle = '#020408'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(10,18,40,0.6)'; ctx.fillRect(0, 0, W, H);
  ctx.shadowColor = '#88aaff'; ctx.shadowBlur = 24;
  ctx.fillStyle = '#ccdeff'; ctx.font = 'bold 22px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('MODE  SELECT', W / 2, 54); ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(100,140,220,0.3)'; ctx.font = '11px Orbitron,Courier New';
  ctx.fillText('対戦形式を選んで出撃', W / 2, 72);

  const cards = [
    {
      id: 'ms_boss', x: 60, y: 88, w: 320, h: 400, col: '#ff8844',
      icon: '!!', title: 'ボスラッシュ', sub: 'BOSS RUSH',
      desc: '連続ボス戦。2体討伐で\nクリア。高リワード。',
      diff: '★★★', hint: '[ 1 / B ]'
    },
    {
      id: 'ms_endless', x: 420, y: 88, w: 320, h: 400, col: '#44ccff',
      icon: '∞', title: 'エンドレス', sub: 'ENDLESS WAVE',
      desc: '無限ウェーブ。ボスを倒す\nたびに難易度上昇。',
      diff: '★★☆', hint: '[ 2 / N ]'
    },
  ];

  cards.forEach(c => {
    const hov = game.hoveredBtn && game.hoveredBtn.id === c.id;
    const pulse = 0.7 + 0.3 * Math.sin(t * 2 + cards.indexOf(c));
    ctx.save();
    ctx.shadowColor = c.col; ctx.shadowBlur = hov ? 30 * pulse : 14 * pulse;
    ctx.fillStyle = hov ? `rgba(${hexToRgb(c.col)},0.18)` : 'rgba(6,10,22,0.96)';
    ctx.strokeStyle = c.col; ctx.lineWidth = hov ? 2.5 : 1.5;
    ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 16); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

    // カラートップバー
    const tg = ctx.createLinearGradient(c.x, c.y, c.x + c.w, c.y);
    tg.addColorStop(0, 'transparent'); tg.addColorStop(0.5, c.col + '55'); tg.addColorStop(1, 'transparent');
    ctx.fillStyle = tg; ctx.fillRect(c.x, c.y, c.w, 3);

    // ヒントキー
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(c.hint, c.x + c.w / 2, c.y + 22);

    // 大アイコン
    ctx.fillStyle = c.col; ctx.font = 'bold 56px Orbitron,Courier New';
    ctx.shadowColor = c.col; ctx.shadowBlur = hov ? 28 : 14;
    ctx.fillText(c.icon, c.x + c.w / 2, c.y + 130); ctx.shadowBlur = 0;

    // タイトル
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px Orbitron,Courier New';
    ctx.fillText(c.title, c.x + c.w / 2, c.y + 170);
    ctx.fillStyle = c.col + 'aa'; ctx.font = '10px Orbitron,Courier New';
    ctx.fillText(c.sub, c.x + c.w / 2, c.y + 188);

    // 説明
    c.desc.split('\n').forEach((line, li) => {
      ctx.fillStyle = 'rgba(180,210,255,0.70)'; ctx.font = '11px Orbitron,Courier New';
      ctx.fillText(line, c.x + c.w / 2, c.y + 218 + li * 18);
    });

    // 難易度
    ctx.fillStyle = 'rgba(255,220,100,0.7)'; ctx.font = 'bold 13px Orbitron,Courier New';
    ctx.fillText(`難易度: ${c.diff}`, c.x + c.w / 2, c.y + 268);

    // 出撃ボタン
    const bg2 = ctx.createLinearGradient(c.x + 20, c.y + 300, c.x + c.w - 20, c.y + 348);
    bg2.addColorStop(0, c.col + '33'); bg2.addColorStop(1, c.col + '11');
    ctx.fillStyle = bg2; ctx.strokeStyle = c.col; ctx.lineWidth = 1.5;
    ctx.shadowColor = c.col; ctx.shadowBlur = hov ? 18 * pulse : 6;
    ctx.beginPath(); ctx.roundRect(c.x + 20, c.y + 308, c.w - 40, 46, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = hov ? '#fff' : c.col; ctx.font = 'bold 14px Orbitron,Courier New';
    ctx.fillText('▶  出  撃', c.x + c.w / 2, c.y + 337);

    ctx.restore();
  });

  const wk = readWeeklyLocalBoard();
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(100,130,200,0.45)'; ctx.font = 'bold 10px Orbitron,Courier New';
  ctx.fillText('週次スコア（端末内・自動で週切替）', 24, H - 118);
  ctx.font = '9px Orbitron,Courier New';
  const fmtTop = (arr, x0, y0) => {
    (arr || []).slice(0, 3).forEach((e, i) => {
      ctx.fillStyle = 'rgba(180,200,240,0.75)';
      ctx.fillText(`${i + 1}. ${(e.name || '?').slice(0, 10)}  ${e.score}`, x0, y0 + i * 12);
    });
    if (!(arr || []).length) {
      ctx.fillStyle = 'rgba(120, 130, 150, 0.6)';
      ctx.fillText('—', x0, y0);
    }
  };
  ctx.fillStyle = 'rgba(255,160,100,0.85)'; ctx.fillText('ボスラッシュ', 34, H - 100);
  fmtTop(wk.boss, 34, H - 86);
  ctx.fillStyle = 'rgba(100,200,255,0.85)'; ctx.fillText('エンドレス', W / 2 + 10, H - 100);
  fmtTop(wk.endless, W / 2 + 10, H - 86);

  ctx.fillStyle = 'rgba(120,150,220,0.30)'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('[ ESC ]  出撃準備に戻る', W / 2, H - 16);
  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}
