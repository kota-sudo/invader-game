/**
 * Map / route select screen (extracted from draw-screens.js)
 */
import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';
import {
  STAGE_TYPE_COLORS,
  STAGE_TYPE_DESCS,
  STAGE_TYPE_LABELS,
} from '../game-data.js';

let drawDeps;

export function setMapScreenDrawDeps(deps) {
  drawDeps = deps;
}

export function drawMapScreen() {
  const ctx = drawDeps.ctx;
  ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.shadowColor = '#00ff55'; ctx.shadowBlur = 20;
  ctx.fillText('ROUTE  SELECT', W / 2, 80); ctx.shadowBlur = 0;
  ctx.fillStyle = '#aaa'; ctx.font = '13px Orbitron,Courier New';
  ctx.fillText(`STAGE ${game.stage + 1}  /  1 または 2 キーで選択`, W / 2, 112);
  game.mapRoutes.forEach((type, i) => {
    const rt = type === 'escort' ? 'normal' : type;
    const x = 80 + i * 340, y = 148, w = 300, h = 260;
    const col = STAGE_TYPE_COLORS[rt] || STAGE_TYPE_COLORS.normal;
    ctx.fillStyle = 'rgba(8,8,24,0.92)'; ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.shadowColor = col; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    // 番号
    ctx.fillStyle = col; ctx.font = 'bold 44px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`${i + 1}`, x + w / 2, y + 60);
    // タイプ名
    ctx.fillStyle = '#fff'; ctx.font = 'bold 17px Orbitron,Courier New';
    ctx.fillText(STAGE_TYPE_LABELS[rt] || rt, x + w / 2, y + 105);
    // 説明
    ctx.fillStyle = '#aaa'; ctx.font = '12px Orbitron,Courier New';
    ctx.fillText(STAGE_TYPE_DESCS[rt] || '', x + w / 2, y + 138);
    // アイコン
    ctx.fillStyle = col; ctx.font = '36px Orbitron,Courier New';
    const icons = { normal: '★', boss_rush: '!!', survival: '⏱' };
    ctx.fillText(icons[rt] || icons.normal, x + w / 2, y + 200);
    // 難易度
    const diff = { normal: '★★☆', boss_rush: '★★★', survival: '★★☆' };
    ctx.fillStyle = '#888'; ctx.font = '11px Orbitron,Courier New';
    ctx.fillText(diff[rt] || diff.normal, x + w / 2, y + 238);
  });
  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}

