/**
 * UI drawing functions separated from main.js
 * Contains HUD, overlays, buttons, and other UI elements
 */

import { game, readTitleBackgroundImageSrc } from '../game/game-store.js';
import { getImage } from '../game/image-cache.js';
import { CANVAS_W as W, CANVAS_H as H, POWERUP_DURATION } from '../game/constants.js';
import { getTitlePromptY, getTitleCoreGuideY } from '../game/title-layout.js';

/** タイトル画面カラー統一（仕様⑦）。メニューは赤ネオン、TAP 誘導のみクールブルー（コンセプト参照） */
const TITLE_MAIN = '#ff3b1f';
const TITLE_GLOW = '#ff6a3d';
const TITLE_SUB = '#ffb37a';
const TITLE_TAP_GLOW = '#44c8ff';
const TITLE_STATUS_OK = '#3dff9a';
/** 仕様⑧：赤粒子は最大 30 のみループ */
const TITLE_RISE_PARTICLE_N = 30;
import { EXP_TABLE, STAGE_TYPE_LABELS, WEAPON_COLOR, WEAPON_LABEL, getStageBattleBackground } from '../game-data.js';

let drawDeps;
let ctx;
let currentWeapon;
let DASH_COOLDOWN;
let ULTIMATE_MAX;
let getPlanet;
let getWaveCount;
let getTheme;
let UI_BUTTONS;

export function setDrawDependencies(deps) {
  drawDeps = deps;
  ctx = deps.ctx;
  ({
    currentWeapon,
    DASH_COOLDOWN,
    ULTIMATE_MAX,
    getPlanet,
    getWaveCount,
    getTheme,
    UI_BUTTONS,
  } = deps);
}

/**
 * 全 UI ボタン描画。
 * タイトルは TITLE_MAIN / TITLE_GLOW で統一。START は 1.2 倍ヒット（ui-buttons）に合わせ強めパルス。
 * START hover 時：横方向に光が流れるスイープ（clip 内グラデ・キャンバスなので CSS アニメは未使用）。
 */
function drawUIButtons() {
  const ctx = drawDeps.ctx;
  const btns = UI_BUTTONS[game.state];
  if (!btns) return;
  const onTitle = game.state === 'title';
  btns.forEach(btn => {
    const x = btn.x || 0, y = btn.y || 0, w = btn.w || 80, h = btn.h || 30;
    const hovered = game.hoveredBtn === btn;
    const pressed = game.uiLastTap?.id === btn.id && game.frameCount - game.uiLastTap.frame < 9;
    const isBack = btn.id === 'back' || btn.id === 'close';
    const mars = !!btn.titleMars;
    const wideHex = !!btn.titleHexWide;
    const titlePill = !!btn.titlePill;
    const hexIcon = !!btn.titleHexIcon;
    const isStart = btn.id === 'title_start';
    const titleGlow = game.state === 'title' && game.titleBtnPressFx?.id === btn.id && game.frameCount <= game.titleBtnPressFx.until;

    const col = mars && onTitle ? TITLE_MAIN : mars ? '#ff5520' : isBack ? '#ff8844' : '#0cf';
    const glowCol = mars && onTitle ? TITLE_GLOW : col;
    const cx = x + w / 2, cy = y + h / 2;
    const pressScale = pressed ? (isStart ? 0.96 : 0.97) : 1;
    const startPulse = isStart && (wideHex || titlePill) ? 1 + 0.038 * Math.sin(game.frameCount * 0.1) : 1;
    let bright = 1;
    if (hovered) bright *= 1.1;
    if (isStart && mars) bright *= 1.22;
    const filterStr = bright !== 1 ? `brightness(${bright})` : 'none';

    const titlePillRadius = (pw, ph) => Math.min(ph * 0.5, pw * 0.14, 26);

    if (titlePill || wideHex || hexIcon) {
      ctx.save();
      ctx.filter = filterStr;
      const blurBase = hovered ? 24 : 15;
      const blurPulse = isStart && mars && (wideHex || titlePill) ? 8 + 8 * Math.sin(game.frameCount * 0.1) : 0;
      const blurPress = titleGlow ? 22 : 0;
      ctx.shadowColor = glowCol;
      ctx.shadowBlur = blurBase + blurPulse + blurPress;
      ctx.translate(cx, cy);
      ctx.scale(pressScale * startPulse, pressScale * startPulse);
      ctx.translate(-cx, -cy);
      ctx.fillStyle = hovered
        ? 'rgba(55, 12, 6, 0.88)'
        : 'rgba(12, 4, 6, 0.72)';
      ctx.strokeStyle = hovered ? TITLE_GLOW : (onTitle && mars ? `rgba(255, 107, 61, 0.95)` : 'rgba(255, 110, 55, 0.92)');
      ctx.lineWidth = hovered ? 2.5 : 2;
      if (hexIcon) {
        const cxx = x + w / 2, cyy = y + h / 2;
        titleFlatHexPath(ctx, cxx, cyy, Math.min(w, h) * 0.48, Math.PI / 6);
        ctx.fill();
        ctx.stroke();
      } else if (titlePill) {
        const pr = titlePillRadius(w, h);
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, pr);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.roundRect(x + 4, y + 4, w - 8, h - 8, Math.max(3, pr - 3));
        ctx.strokeStyle = `rgba(255, 59, 31, ${hovered ? 0.65 : 0.42})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        if (isStart && mars && titlePill && hovered) {
          const sweep = (Date.now() / 1000 * 44) % (w + 100);
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, pr);
          ctx.clip();
          const g = ctx.createLinearGradient(x + sweep - 70, y, x + sweep + 30, y);
          g.addColorStop(0, 'rgba(255,255,255,0)');
          g.addColorStop(0.45, 'rgba(255, 220, 190, 0.38)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
          ctx.restore();
        }
      } else {
        drawTitleWideHexButtonPath(ctx, x, y, w, h);
        ctx.fill();
        ctx.stroke();
        if (isStart && mars && wideHex && hovered) {
          const sweep = (Date.now() / 1000 * 44) % (w + 100);
          ctx.save();
          drawTitleWideHexButtonPath(ctx, x, y, w, h);
          ctx.clip();
          const g = ctx.createLinearGradient(x + sweep - 70, y, x + sweep + 30, y);
          g.addColorStop(0, 'rgba(255,255,255,0)');
          g.addColorStop(0.45, 'rgba(255, 220, 190, 0.38)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
          ctx.restore();
        }
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = hovered ? '#fff' : (onTitle && mars ? TITLE_SUB : 'rgba(255, 210, 180, 0.98)');
      ctx.font = hexIcon ? 'bold 14px Orbitron,Courier New' : titlePill ? 'bold 13px Orbitron,Courier New' : 'bold 12px Orbitron,Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(btn.label, x + w / 2, y + h / 2 + (hexIcon ? 5 : titlePill ? 5 : 4));
      ctx.textAlign = 'left';
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.filter = filterStr;
    const blurExtra = titleGlow ? 14 : 0;
    ctx.shadowColor = mars && onTitle ? TITLE_GLOW : col;
    ctx.shadowBlur = (hovered ? 18 : 8) + blurExtra;
    ctx.translate(cx, cy);
    ctx.scale(pressScale, pressScale);
    ctx.translate(-cx, -cy);
    ctx.fillStyle = hovered
      ? (mars ? 'rgba(90,20,8,0.96)' : isBack ? 'rgba(80,30,0,0.97)' : 'rgba(0,80,120,0.97)')
      : (mars ? 'rgba(28,8,4,0.94)' : isBack ? 'rgba(40,12,0,0.92)' : 'rgba(0,40,70,0.92)');
    ctx.strokeStyle = hovered ? col : (mars ? 'rgba(255,100,60,0.85)' : isBack ? 'rgba(180,80,0,0.7)' : '#0a6080');
    ctx.lineWidth = hovered ? 2 : mars ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = hovered ? '#fff' : col; ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(btn.label, x + w / 2, y + h / 2 + 4);
    ctx.textAlign = 'left';
    ctx.restore();
  });
}

function drawPauseOverlay() {
  const ctx = drawDeps.ctx;
  ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, 0, W, H);
  const cx = W / 2;
  const pAccent = getTheme().accent;
  ctx.shadowColor = pAccent; ctx.shadowBlur = 30;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 40px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('PAUSED', cx, 120); ctx.shadowBlur = 0;
  ctx.fillStyle = '#556'; ctx.font = '11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  ctx.fillText('再開: 「続ける」または ESC', cx, 148);

  const hpRatio = game.playerStats?.maxHp > 0 ? game.playerStats.hp / game.playerStats.maxHp : 1;
  const hpColor = hpRatio > 0.5 ? '#00ff88' : hpRatio > 0.25 ? '#ffaa00' : '#ff3333';
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(cx - 160, 168, 320, 14, 4); ctx.fill();
  ctx.fillStyle = hpColor; ctx.shadowColor = hpColor; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.roundRect(cx - 160, 168, 320 * Math.max(0, Math.min(1, hpRatio)), 14, 4); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ccc'; ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText(`HP  ${game.playerStats?.hp ?? 0} / ${game.playerStats?.maxHp ?? 0}`, cx, 194);

  const stats = [
    { l: 'ATK', v: `×${(game.playerStats?.atk ?? 1).toFixed(2)}`, c: '#ff8844' },
    { l: 'DEF', v: `${game.playerStats?.def ?? 0}%`, c: '#44aaff' },
    { l: 'CRIT', v: `${game.playerStats?.crit ?? 0}%`, c: '#ffdd00' },
    { l: 'SPD', v: `+${game.playerStats?.spd ?? 0}`, c: '#88ffcc' },
  ];
  stats.forEach((s, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const bx = cx - 158 + col * 162, by = 210 + row * 48;
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(bx, by, 150, 38, 5); ctx.fill();
    ctx.strokeStyle = '#1a2a1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(bx, by, 150, 38, 5); ctx.stroke();
    ctx.fillStyle = '#445'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.fillText(s.l, bx + 10, by + 14);
    ctx.fillStyle = s.c; ctx.shadowColor = s.c; ctx.shadowBlur = 5;
    ctx.font = 'bold 15px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText(s.v, bx + 140, by + 28); ctx.shadowBlur = 0;
  });

  game._pauseBtnHits = [];
  const btnFont = 'bold 11px Orbitron,"Hiragino Sans","Yu Gothic",sans-serif';
  const bw = 168, bh = 44, gap = 14;
  const yBtn = 318;
  const xResume = cx - bw - gap / 2;
  const xQuit = cx + gap / 2;
  const drawPauseActionBtn = (x, y, w, h, label, type, col, fillBase) => {
    const hovered = game.hoveredBtn?.pauseHitType === type;
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = hovered ? 16 : 8;
    ctx.fillStyle = hovered ? fillBase.hover : fillBase.base;
    ctx.strokeStyle = hovered ? col : fillBase.stroke;
    ctx.lineWidth = hovered ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = hovered ? '#fff' : col;
    ctx.font = btnFont; ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 4);
    ctx.textAlign = 'left';
    ctx.restore();
    game._pauseBtnHits.push({ type, x, y, w, h });
  };
  drawPauseActionBtn(xResume, yBtn, bw, bh, '続ける', 'resume', '#44ddff', {
    base: 'rgba(0,50,80,0.94)', hover: 'rgba(0,80,120,0.97)', stroke: '#0a6080',
  });
  drawPauseActionBtn(xQuit, yBtn, bw, bh, 'ゲームを終わる', 'quit', '#ffaa66', {
    base: 'rgba(40,12,0,0.92)', hover: 'rgba(80,30,0,0.97)', stroke: 'rgba(180,80,0,0.7)',
  });

  ctx.fillStyle = '#334'; ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText(`STAGE ${game.stage}  ·  SCORE ${game.score}  ·  COMBO ${game.combo}`, cx, 432);
  ctx.textAlign = 'left';
}

function drawGameOverOverlay() {
  const ctx = drawDeps.ctx;
  game._gameoverHits = [];
  const cx = W / 2;

  // Background image (full-bleed)
  const bgSrc = './assets/ui/gameover-bg-mars.png';
  const bg = getImage(bgSrc);
  if (bg?.complete && bg.naturalWidth) {
    const iw = bg.naturalWidth, ih = bg.naturalHeight;
    const s = Math.max(W / iw, H / ih);
    const dw = iw * s, dh = ih * s;
    const dx = (W - dw) / 2, dy = (H - dh) / 2;
    ctx.save();
    ctx.drawImage(bg, 0, 0, iw, ih, dx, dy, dw, dh);
    ctx.restore();
  } else {
    ctx.fillStyle = '#06040a';
    ctx.fillRect(0, 0, W, H);
  }

  // Dim + vignette for readability
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(cx, H * 0.42, H * 0.18, cx, H * 0.42, H * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Main panel
  const pw = Math.min(520, Math.max(360, W * 0.62));
  const ph = Math.min(420, Math.max(320, H * 0.56));
  const px = Math.floor(cx - pw / 2);
  const py = Math.floor(H * 0.18);
  const r = 16;
  const accent = '#44ff88';
  const hoverId = game.hoveredBtn?.id || '';

  ctx.save();
  ctx.fillStyle = 'rgba(2, 4, 14, 0.92)';
  ctx.strokeStyle = 'rgba(120, 255, 180, 0.38)';
  ctx.shadowColor = 'rgba(80, 255, 140, 0.22)';
  ctx.shadowBlur = 26;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, r);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Header strip
  const hg = ctx.createLinearGradient(px, py, px, py + 56);
  hg.addColorStop(0, 'rgba(60, 255, 140, 0.16)');
  hg.addColorStop(1, 'rgba(60, 255, 140, 0)');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.roundRect(px + 2, py + 2, pw - 4, 58, [r - 2, r - 2, 0, 0]);
  ctx.fill();

  ctx.fillStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 14;
  ctx.font = '900 34px Orbitron,Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('ゲームオーバー', cx, py + 44);
  ctx.shadowBlur = 0;

  // Stats
  ctx.fillStyle = 'rgba(220, 245, 255, 0.86)';
  ctx.font = '900 16px Orbitron,Courier New';
  ctx.fillText(`スコア: ${game.score | 0}`, cx, py + 96);
  ctx.fillStyle = 'rgba(190, 220, 255, 0.55)';
  ctx.font = '900 13px Orbitron,Courier New';
  ctx.fillText(`STAGE ${game.stage}`, cx, py + 120);

  // Actions
  const bw = Math.min(360, pw - 80);
  const bh = 48;
  const bx = Math.floor(cx - bw / 2);
  const y1 = py + 156;
  const gap = 14;

  const btn = (y, label, sub, type, col, disabled = false) => {
    const hovered = hoverId === `go_${type}` && !disabled;
    const baseFill = hovered ? 'rgba(30, 60, 46, 0.92)' : 'rgba(10, 18, 26, 0.92)';
    const stroke = hovered ? col : 'rgba(120, 160, 200, 0.18)';
    ctx.save();
    ctx.fillStyle = baseFill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = hovered ? 2.2 : 1.4;
    ctx.shadowColor = col;
    ctx.shadowBlur = hovered ? 18 : 10;
    ctx.globalAlpha = disabled ? 0.4 : 1;
    ctx.beginPath();
    ctx.roundRect(bx, y, bw, bh, 12);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = disabled ? 'rgba(220, 240, 255, 0.35)' : '#eaf6ff';
    ctx.font = '900 15px Orbitron,Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, y + 30);
    if (sub) {
      ctx.fillStyle = disabled ? 'rgba(180, 210, 255, 0.28)' : 'rgba(180, 210, 255, 0.55)';
      ctx.font = '900 11px Orbitron,Courier New';
      ctx.fillText(sub, cx, y + 44);
    }
    ctx.restore();
    game._gameoverHits.push({ type, x: bx, y, w: bw, h: bh, disabled });
  };

  btn(y1, 'SPACE: タイトル', '出撃準備へ戻る', 'title', '#44ff88');
  btn(y1 + (bh + gap), 'R: 即リトライ', `STAGE ${game.startStage} 先頭から`, 'retry', '#88ccff');
  btn(y1 + (bh + gap) * 2, 'C: コンティニュー', '💎 10  /  ★更新なし', 'continue', '#ffcc66', false);

  // Footer hint
  ctx.fillStyle = 'rgba(150, 185, 220, 0.40)';
  ctx.font = '900 11px Orbitron,Courier New';
  ctx.fillText('クリックでも選べます', cx, py + ph - 18);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawCriticalVignette() {
  const ctx = drawDeps.ctx;
  const ratio = game.playerStats?.maxHp > 0 ? game.playerStats.hp / game.playerStats.maxHp : 1;
  if (ratio >= 0.3) return;
  const danger = (0.3 - ratio) / 0.3;
  const alpha = 0.15 + danger * 0.35 + Math.sin(game.frameCount * 0.2) * 0.08;
  const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.85);
  grad.addColorStop(0, 'rgba(255,0,0,0)');
  grad.addColorStop(1, `rgba(255,0,0,${alpha})`);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
}

function drawJoystick() {
  const ctx = drawDeps.ctx;
  if (!game.joystick?.active) return;
  const cx = game.joystick.baseX ?? game.joystick.cx, cy = game.joystick.baseY ?? game.joystick.cy;
  const dx = game.joystick.dx, dy = game.joystick.dy;
  const JR = 65;
  ctx.save();
  ctx.globalAlpha = 0.62;
  ctx.strokeStyle = 'rgba(0,220,255,0.9)'; ctx.lineWidth = 2;
  ctx.shadowColor = '#00ccff'; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(cx, cy, JR, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.28; ctx.fillStyle = 'rgba(0,120,180,0.45)';
  ctx.beginPath(); ctx.arc(cx, cy, JR, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.8; ctx.fillStyle = 'rgba(0,255,255,0.7)';
  ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 22, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawScreenFlash() {
  const ctx = drawDeps.ctx;
  if (!game.screenFlash) return;
  const { r, g, b, alpha } = game.screenFlash;
  const edgeA = alpha * 0.52;
  const cx = W / 2;
  const cy = H / 2;
  ctx.save();
  const grad = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.18, cx, cy, Math.max(W, H) * 0.72);
  grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
  grad.addColorStop(0.45, `rgba(${r},${g},${b},${edgeA * 0.22})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},${edgeA})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  game.screenFlash.alpha -= game.screenFlash.decay;
  if (game.screenFlash.alpha <= 0) game.screenFlash = null;
}

function drawVignette() {
  const ctx = drawDeps.ctx;
  const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.82);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
}

/** タイトル用フルブリード背景画像。読めたら true（手描き背景はスキップ） */
function tryDrawTitleBackgroundImage() {
  const src = readTitleBackgroundImageSrc();
  if (!src) return false;
  const img = getImage(src);
  if (!img.complete || !img.naturalWidth) return false;
  const ctx = drawDeps.ctx;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(W / iw, H / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (W - dw) / 2;
  const dy = (H - dh) / 2;
  ctx.save();
  ctx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
  ctx.restore();
  return true;
}

/** 戦闘シーンのステージ背景（画像 + 暗めオーバーレイ）。読み込めない場合は false */
function drawBattleBackground() {
  const ctx = drawDeps.ctx;
  game._battleBackdropActive = false;
  const src = getStageBattleBackground(game.stage);
  if (!src) return false;
  const img = getImage(src);
  if (!img.complete || !img.naturalWidth) return false;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(W / iw, H / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (W - dw) / 2;
  const dy = (H - dh) / 2;
  ctx.save();
  ctx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
  ctx.fillStyle = 'rgba(6, 2, 10, 0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(180, 40, 20, 0.08)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  game._battleBackdropActive = true;
  return true;
}

function drawStarfield() {
  const ctx = drawDeps.ctx;
  const isTitleFull = game.state === 'title' && game.titleBgQuality === 'full';
  const dimStars = !!game._battleBackdropActive;
  if (dimStars) ctx.globalAlpha = 0.38;
  for (const s of game.stars) {
    const tw = 0.4 + Math.sin(s.twinkle) * 0.6;
    ctx.globalAlpha = isTitleFull ? Math.min(1, tw * (0.55 + (s.layer || 1) * 0.22)) : tw * (0.4 + (s.layer || 1) * 0.18);
    const onTitle = game.state === 'title';
    ctx.fillStyle = onTitle
      ? ((s.layer || 1) >= 2 ? '#ffccb0' : '#fff6f0')
      : ((s.layer || 1) >= 2 ? '#aaf' : '#fff');
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

/** 上辺水平の正六角形パス（中心 cx,cy、外接円半径 R） */
function titleFlatHexPath(ctx, cx, cy, R, rot) {
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const ang = rot + Math.PI / 6 + k * (Math.PI / 3);
    const x = cx + R * Math.cos(ang);
    const y = cy + R * Math.sin(ang);
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** タイトル用・横長の尖りボタン（コンセプトの六角メニュー寄せ） */
function drawTitleWideHexButtonPath(ctx, x, y, w, h) {
  const chop = Math.min(18, w * 0.07);
  const cy = y + h / 2;
  ctx.beginPath();
  ctx.moveTo(x + chop, y + 1);
  ctx.lineTo(x + w - chop, y + 1);
  ctx.lineTo(x + w - 1, cy);
  ctx.lineTo(x + w - chop, y + h - 1);
  ctx.lineTo(x + chop, y + h - 1);
  ctx.lineTo(x + 1, cy);
  ctx.closePath();
}

/** 赤色帯・星雲っぽい霧（火星地表ムード） */
function drawTitleNebulaMist(t, strength) {
  const ctx = drawDeps.ctx;
  ctx.save();
  const s = strength;
  const g1 = ctx.createRadialGradient(W * 0.18, H * 0.38, 0, W * 0.18, H * 0.38, 200 * s);
  g1.addColorStop(0, `rgba(160, 35, 28, ${0.09 * s})`);
  g1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);
  const g2 = ctx.createRadialGradient(W * 0.82, H * 0.45, 0, W * 0.82, H * 0.45, 240 * s);
  g2.addColorStop(0, `rgba(90, 18, 40, ${0.07 * s})`);
  g2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);
  const g3 = ctx.createLinearGradient(0, H * 0.5, 0, H);
  g3.addColorStop(0, 'rgba(0,0,0,0)');
  g3.addColorStop(0.55, `rgba(50, 8, 14, ${0.35 * s})`);
  g3.addColorStop(1, `rgba(28, 4, 10, ${0.72 * s})`);
  ctx.fillStyle = g3;
  ctx.fillRect(0, H * 0.48, W, H * 0.52);
  ctx.restore();
}

/** 漂うエンバー粒子 */
function drawTitleEmbers(t, strength) {
  const ctx = drawDeps.ctx;
  ctx.save();
  const s = strength;
  for (let i = 0; i < 36; i++) {
    const a = t * 0.35 + i * 1.73;
    const x = (W * 0.15 + (i * 97) % (W * 0.7)) + Math.sin(a) * 14;
    const y = (H * 0.12 + (i * 53) % (H * 0.55)) + Math.cos(a * 0.9) * 10;
    const r = 1.2 + (i % 3) * 0.6;
    ctx.fillStyle = `rgba(255, ${100 + (i % 5) * 20}, 60, ${0.12 * s})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 手前の荒い地表シルエット */
function drawTitleHorizonTerrain(t, strength) {
  const ctx = drawDeps.ctx;
  const s = strength;
  const baseY = H * 0.58 + (1 - s) * 18;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-2, H + 2);
  ctx.lineTo(-2, baseY + 28);
  for (let i = 0; i <= 28; i++) {
    const x = (i / 28) * (W + 4);
    const y = baseY + Math.sin(i * 1.85 + t * 0.35) * (18 * s) + Math.sin(i * 0.7 + t * 0.2) * (10 * s);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 2, H + 2);
  ctx.closePath();
  ctx.fillStyle = `rgba(18, 4, 10, ${0.88 + 0.08 * s})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(110, 28, 42, ${0.28 * s})`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** 遠景の尖塔シルエット */
function drawTitleSpires(t, strength) {
  const ctx = drawDeps.ctx;
  const s = strength;
  const base = H * 0.56 + (1 - s) * 24;
  ctx.save();
  ctx.fillStyle = `rgba(14, 5, 12, ${0.55 * s})`;
  ctx.beginPath();
  ctx.moveTo(22, base + 95);
  ctx.lineTo(40, base - 88 * s);
  ctx.lineTo(54, base - 82 * s);
  ctx.lineTo(36, base + 95);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(W - 22, base + 95);
  ctx.lineTo(W - 40, base - 82 * s);
  ctx.lineTo(W - 54, base - 76 * s);
  ctx.lineTo(W - 36, base + 95);
  ctx.fill();
  ctx.restore();
}

/** 中央の「コア」巨大シルエット（参照の機体＋赤いコア発光） */
function drawTitleMechMass(t, cx, strength) {
  const ctx = drawDeps.ctx;
  const s = strength;
  const bob = Math.sin(t * 0.28) * 1.5 * s;
  const bx = cx + bob;
  const by = H * 0.5;
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.45 * s;
  ctx.fillStyle = 'rgba(10, 3, 8, 0.92)';
  ctx.beginPath();
  ctx.moveTo(bx - 105, by + 115 * s);
  ctx.lineTo(bx - 68, by + 38 * s);
  ctx.lineTo(bx - 82, by - 18 * s);
  ctx.lineTo(bx + 82, by - 18 * s);
  ctx.lineTo(bx + 68, by + 38 * s);
  ctx.lineTo(bx + 105, by + 115 * s);
  ctx.lineTo(bx + 42, by + 92 * s);
  ctx.lineTo(bx + 28, by + 22 * s);
  ctx.lineTo(bx - 28, by + 22 * s);
  ctx.lineTo(bx - 42, by + 92 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(16, 5, 11, 0.94)';
  ctx.fillRect(bx - 78, by - 88 * s, 156, 95 * s);
  ctx.fillRect(bx - 112, by - 78 * s, 58, 38 * s);
  ctx.fillRect(bx + 54, by - 78 * s, 58, 38 * s);
  ctx.fillRect(bx - 38, by - 118 * s, 76, 48 * s);
  const eyeY = by - 22 * s;
  // 赤コア脈動：scale 1→1.05、opacity 0.8→1.0（ゆっくり・仕様①）
  const slow = t * 1.55;
  const pulse = 0.5 + 0.5 * Math.sin(slow);
  const coreScale = 1 + 0.05 * pulse;
  const coreOp = 0.8 + 0.2 * pulse;
  ctx.save();
  ctx.translate(bx, eyeY);
  ctx.scale(coreScale, coreScale);
  ctx.translate(-bx, -eyeY);
  ctx.globalAlpha = coreOp;
  const rg = ctx.createRadialGradient(bx, eyeY, 2, bx, eyeY, 40 * s);
  rg.addColorStop(0, `rgba(255, 59, 31, ${(0.82 + 0.12 * pulse) * s})`);
  rg.addColorStop(0.4, `rgba(255, 106, 61, ${0.35 * s})`);
  rg.addColorStop(0.75, `rgba(160, 24, 18, ${0.2 * s})`);
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(bx, eyeY, 34 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = (0.45 + 0.35 * pulse) * s;
  ctx.strokeStyle = 'rgba(255, 106, 61, 0.62)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(bx, eyeY, 12 * s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/** ごく薄いフィルムグレイン。update 頻度を半分（t*12）にして負荷削減 */
function drawTitleFilmGrain(t, intensity = 1) {
  const ctx = drawDeps.ctx;
  ctx.save();
  const k = (Math.floor(t * 12) % 500) * 17;
  ctx.globalAlpha = 0.028 * intensity;
  ctx.fillStyle = '#ccc';
  for (let i = 0; i < 320; i++) {
    const vx = ((i * 7919 + k) % W) | 0;
    const vy = ((i * 6907 + k * 3) % H) | 0;
    ctx.fillRect(vx, vy, 1, 1);
  }
  ctx.globalAlpha = 0.018 * intensity;
  ctx.fillStyle = '#400';
  for (let i = 0; i < 140; i++) {
    const vx = ((i * 4999 + k * 2) % W) | 0;
    const vy = ((i * 4807 + k) % H) | 0;
    ctx.fillRect(vx, vy, 2, 1);
  }
  ctx.restore();
}

/** タイトル背後のハニカム（ショップ六角と同系の幾何学） */
function drawTitleHexBackdrop(t, cx, bgFull) {
  const ctx = drawDeps.ctx;
  const R = bgFull ? 24 : 18;
  const rows = bgFull ? 8 : 5;
  const cols = bgFull ? 12 : 7;
  const wStep = Math.sqrt(3) * R;
  const hStep = 1.5 * R;
  const baseX = cx - (cols - 1) * wStep * 0.5;
  const baseY = H * 0.4 - (rows * hStep) / 2;
  ctx.save();
  ctx.lineWidth = 1;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const ox = (row % 2) * (wStep / 2);
      const hx = baseX + col * wStep + ox;
      const hy = baseY + row * hStep;
      const dist = Math.hypot(hx - cx, hy - H * 0.36) / (H * 0.5);
      const pulse = 0.4 + 0.12 * Math.sin(t * 0.65 + col * 0.35 + row * 0.28);
      const baseA = bgFull ? 0.11 : 0.078;
      const a = baseA * (1 - dist * 0.9) * pulse;
      if (a <= 0.018) continue;
      ctx.strokeStyle = `rgba(255,110,70,${a})`;
      titleFlatHexPath(ctx, hx, hy, R * 0.92, t * 0.07 + (col + row) * 0.05);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 175, 120, ${a * 0.38})`;
      titleFlatHexPath(ctx, hx, hy, R * 0.7, -t * 0.05);
      ctx.stroke();
      if (bgFull) {
        ctx.strokeStyle = `rgba(200, 90, 55, ${a * 0.28})`;
        titleFlatHexPath(ctx, hx, hy, R * 0.58, t * 0.04);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/** ロゴ背後の「コア」シルエット（積層六角＋リアクタ発光） */
function drawTitleCoreSilhouette(t, cx, titleY) {
  const ctx = drawDeps.ctx;
  const cy = titleY - 6;
  const bob = Math.sin(t * 0.52) * 2.5;
  ctx.save();
  for (let i = 3; i >= 1; i--) {
    const rr = 46 + i * 16 + bob * 0.25;
    const alpha = 0.05 + (4 - i) * 0.035;
    ctx.strokeStyle = `rgba(255,95,55,${alpha})`;
    ctx.lineWidth = i === 1 ? 2 : 1.2;
    ctx.shadowColor = 'rgba(255,70,35,0.45)';
    ctx.shadowBlur = i === 1 ? 14 : 5;
    titleFlatHexPath(ctx, cx, cy, rr, t * 0.12 * (i % 2 === 0 ? 1 : -1));
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  for (let j = -1; j <= 1; j++) {
    const yy = cy + j * 26;
    const sc = 1 - Math.abs(j) * 0.1;
    titleFlatHexPath(ctx, cx, yy, 22 * sc, t * 0.18 + j * 0.35);
    ctx.fillStyle = `rgba(6, 3, 10, ${0.78 - Math.abs(j) * 0.12})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,150,95,${0.42})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  const p2 = 0.5 + 0.5 * Math.sin(t * 1.55);
  const sc2 = 1 + 0.05 * p2;
  const op2 = 0.8 + 0.2 * p2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sc2, sc2);
  ctx.translate(-cx, -cy);
  ctx.globalAlpha = op2;
  const rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 36);
  rg.addColorStop(0, `rgba(255, 179, 122, ${0.38 + 0.1 * Math.sin(t * 2.1)})`);
  rg.addColorStop(0.5, 'rgba(255, 59, 31, 0.14)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(cx, cy, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  titleFlatHexPath(ctx, cx, cy, 78 + bob * 0.2, -t * 0.09);
  ctx.strokeStyle = 'rgba(255, 190, 130, 0.16)';
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
}

function drawTitleDistantSilhouette(t) {
  const ctx = drawDeps.ctx;
  if (game.titleBgQuality !== 'full') return;
  if (game.state === 'title_warp') return;
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#140208';
  // Simplified distant silhouette
  for (let i = 0; i < 5; i++) {
    const x = i * 200 + Math.sin(t + i) * 20, y = H * 0.6 + Math.cos(t * 0.7 + i) * 10;
    ctx.fillRect(x, y, 150, 200);
  }
  ctx.restore();
}

/** 左上：火星本体（インベーダー的なドット世界観の「拠点」） */
function drawTitleMarsTopLeft(t, scale = 1) {
  const ctx = drawDeps.ctx;
  const mx = 78, my = 72;
  const bob = Math.sin(t * 0.38) * 2.5;
  ctx.save();
  ctx.translate(mx + bob * 0.4, my + bob * 0.2);
  ctx.scale(scale, scale);
  const r = 50;
  const g = ctx.createRadialGradient(-14, -14, 6, 0, 0, r);
  g.addColorStop(0, '#ffaa66');
  g.addColorStop(0.35, '#d65a28');
  g.addColorStop(0.72, '#8a3014');
  g.addColorStop(1, '#3a1008');
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
  // クレーター（シルエット）
  ctx.fillStyle = 'rgba(30, 8, 4, 0.42)';
  [[-20, -8, 12], [14, 6, 10], [-6, 20, 8], [24, -22, 7], [-28, 14, 5]].forEach(([cx, cy, cr]) => {
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = 'rgba(255, 200, 160, 0.18)';
  ctx.beginPath(); ctx.arc(-16, -18, 8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255, 140, 100, 0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/** 火星周辺の漂う小惑星（矩形ブロックでレトロ感） */
function drawTitleAsteroids(t, scale = 1) {
  const ctx = drawDeps.ctx;
  ctx.save();
  ctx.translate(78, 72);
  ctx.scale(scale, scale);
  for (let i = 0; i < 10; i++) {
    const base = t * 0.22 + i * 1.17;
    const dist = 62 + (i % 4) * 34 + Math.sin(t * 0.31 + i * 0.9) * 14;
    const x = Math.cos(base) * dist * 0.95;
    const y = Math.sin(base * 1.07) * dist * 0.72;
    const rot = base * 0.8 + i;
    const sz = 4 + (i % 3) * 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = i % 2 === 0 ? '#6a5a4a' : '#4a4038';
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(-sz, -sz * 0.7, sz * 2, sz * 1.4, 1);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function titleEffectIsMobile() {
  try {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia && window.matchMedia('(max-width: 560px)').matches) return true;
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
  } catch (e) {}
  return false;
}

/**
 * 旧CRT風走査線（タイトルのみ）。設定 OFF で非表示。
 * 既定は弱め（合成 ~0.3 相当）、写真背景・モバイルでさらに弱体化。
 * アニメは Date.now の粗いバケットのみ（毎フレームの位相計算を避ける軽量処理）。描画は偶数フレームのみで負荷半減。
 */
function drawTitleRetroScanlines(photoBg) {
  if (game.settings?.titleScanlines === false) return;
  if ((game.frameCount & 1) === 1) return;
  const ctx = drawDeps.ctx;
  const mobile = titleEffectIsMobile();
  const photoMul = photoBg ? 0.62 : 1;
  const mobMul = mobile ? 0.68 : 1;
  const strength = photoMul * mobMul;
  const bucket = (Date.now() / 180) | 0;
  const roll = bucket & 1;
  ctx.save();
  ctx.globalAlpha = 0.11 * strength;
  ctx.fillStyle = '#000';
  for (let y = roll; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  ctx.globalAlpha = 0.065 * strength;
  ctx.fillStyle = 'rgba(220, 45, 30, 0.95)';
  for (let y = 2 + roll; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  ctx.restore();
}

/** 視線誘導⑥：タイトル→TAP→START へ向かう縦の柔らかい光柱＋うっすら中心ライン */
function drawTitleVerticalCenterGlow(intensity = 1) {
  const ctx = drawDeps.ctx;
  const cx = W * 0.5;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createLinearGradient(cx, 0, cx, H);
  g.addColorStop(0, 'rgba(255, 59, 31, 0)');
  g.addColorStop(0.38, `rgba(255, 106, 61, ${0.045 * intensity})`);
  g.addColorStop(0.52, `rgba(255, 179, 122, ${0.065 * intensity})`);
  g.addColorStop(0.68, `rgba(255, 106, 61, ${0.05 * intensity})`);
  g.addColorStop(1, 'rgba(255, 40, 28, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.09 * intensity;
  const narrow = ctx.createLinearGradient(cx - 10, 0, cx + 10, 0);
  narrow.addColorStop(0, 'rgba(255, 179, 122, 0)');
  narrow.addColorStop(0.5, `rgba(255, 200, 170, ${0.22 * intensity})`);
  narrow.addColorStop(1, 'rgba(255, 179, 122, 0)');
  ctx.fillStyle = narrow;
  ctx.fillRect(cx - 14, H * 0.08, 28, H * 0.88);
  ctx.restore();
}

/** ハンガーデッキ付き背景用：下帯だけわずかに落として UI を読ませる（写真 L1 の上に乗せる） */
function drawTitleDeckReadabilityVignette() {
  const ctx = drawDeps.ctx;
  ctx.save();
  const g = ctx.createLinearGradient(0, H * 0.52, 0, H);
  g.addColorStop(0, 'rgba(4, 2, 10, 0)');
  g.addColorStop(0.45, 'rgba(8, 3, 14, 0.22)');
  g.addColorStop(1, 'rgba(2, 0, 6, 0.58)');
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = g;
  ctx.fillRect(0, H * 0.52, W, H * 0.48);
  ctx.restore();
}

/** 遠景の熱揺らぎ風：水平バンドをサインで数 px だけずらして重ねるのみ（シェーダ不要） */
function drawTitleHeatShimmer(t, skipOnPhoto = false) {
  if (skipOnPhoto) return;
  if (game.titleBgQuality !== 'full') return;
  const ctx = drawDeps.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.045;
  for (let band = 0; band < 14; band++) {
    const y0 = H * 0.22 + band * 26;
    const shift = Math.sin(t * 1.05 + band * 0.55) * 2.2;
    ctx.fillStyle = band % 2 === 0 ? 'rgba(255, 60, 40, 0.12)' : 'rgba(255, 30, 20, 0.06)';
    ctx.fillRect(shift, y0, W, 5);
  }
  ctx.restore();
}

/**
 * 赤粒子：ゆっくり上昇（⑤⑧）。最大 TITLE_RISE_PARTICLE_N のみ・位相は t のみで軽量。
 */
function drawTitleRisingRedParticles(t, intensity = 1) {
  const ctx = drawDeps.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < TITLE_RISE_PARTICLE_N; i++) {
    const th = i * 2.17;
    const x = W * 0.5 + Math.sin(t * 0.07 + th) * (W * 0.42) + (i % 5) * 11;
    const rise = (t * 9 + i * 23) % (H * 0.75);
    const y = H * 0.72 - rise + Math.cos(t * 0.08 + th) * 10;
    const a = (0.05 + 0.04 * Math.sin(t * 0.28 + i * 0.37)) * intensity;
    const r = 0.9 + (i % 3) * 0.45;
    ctx.fillStyle = `rgba(255, 59, 31, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** ⑤：微弱な霧が横に流れる（大きな半透明帯を数本・遅い位相） */
function drawTitleDriftFog(t, intensity = 1) {
  const ctx = drawDeps.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let k = 0; k < 3; k++) {
    const dx = Math.sin(t * 0.11 + k * 1.9) * (W * 0.12);
    const y0 = H * (0.25 + k * 0.18);
    ctx.globalAlpha = (0.04 + k * 0.012) * intensity;
    ctx.fillStyle = k % 2 === 0 ? 'rgba(255, 107, 61, 0.35)' : 'rgba(255, 59, 31, 0.2)';
    ctx.fillRect(dx - W * 0.05, y0, W * 1.12, 36 + k * 10);
  }
  ctx.restore();
}

/** ⑤：小さなデブリがふわっと浮遊（矩形数個・遅いサインのみ） */
function drawTitleFloatingDebris(t, intensity = 1) {
  const ctx = drawDeps.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 10; i++) {
    const ang = t * 0.13 + i * 0.97;
    const rx = W * 0.5 + Math.cos(ang) * (90 + i * 12);
    const ry = H * 0.4 + Math.sin(ang * 0.87) * (40 + i * 5);
    const rot = t * 0.2 + i;
    const sz = 2 + (i % 3);
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(rot);
    ctx.globalAlpha = (0.12 + (i % 4) * 0.02) * intensity;
    ctx.fillStyle = 'rgba(255, 140, 100, 0.55)';
    ctx.fillRect(-sz, -sz * 0.6, sz * 2, sz * 1.2);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * 写真背景時の L2 補助：画面中央付近に赤コアの脈動だけ重ねる（画像内ボスと合成）。
 */
function drawTitleMidCoreOverImage(t, cx, cy, blend = 1) {
  const ctx = drawDeps.ctx;
  const slow = t * 1.55;
  const pulse = 0.5 + 0.5 * Math.sin(slow);
  const coreScale = 1 + 0.05 * pulse;
  const coreOp = (0.8 + 0.2 * pulse) * blend;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(coreScale, coreScale);
  ctx.translate(-cx, -cy);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = coreOp;
  const rg = ctx.createRadialGradient(cx, cy, 3, cx, cy, 48);
  rg.addColorStop(0, `rgba(255, 59, 31, ${0.58 * blend})`);
  rg.addColorStop(0.35, `rgba(255, 106, 61, ${0.28 * blend})`);
  rg.addColorStop(1, 'rgba(255, 40, 20, 0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(cx, cy, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.35 * coreOp * blend;
  ctx.strokeStyle = TITLE_GLOW;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 16 + pulse * 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawTitleWarp() {
  const ctx = drawDeps.ctx;
  const total = 48;
  const p = Math.min(1, game.titleWarpTimer / total);
  const p2 = p * p;
  const cx = W / 2, cy = H / 2;
  const maxR = Math.hypot(W, H) * 0.55;

  // 奥行きのある宇宙（中心がワープトンネル）
  const tunnel = ctx.createRadialGradient(cx, cy, 8 + p * 120, cx, cy, maxR + p * 200);
  tunnel.addColorStop(0, `rgba(240,250,255,${0.15 + p2 * 0.85})`);
  tunnel.addColorStop(0.12, `rgba(100,180,255,${0.2 + p2 * 0.5})`);
  tunnel.addColorStop(0.35, `rgba(30,50,120,${0.35 + p * 0.35})`);
  tunnel.addColorStop(1, '#020208');
  ctx.fillStyle = tunnel;
  ctx.fillRect(0, 0, W, H);

  const warmCore = ctx.createRadialGradient(cx, cy, 2 + p * 24, cx, cy, 56 + p * 200);
  warmCore.addColorStop(0, `rgba(255,200,160,${p2 * 0.22})`);
  warmCore.addColorStop(0.35, `rgba(255,120,60,${p2 * 0.12})`);
  warmCore.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = warmCore;
  ctx.fillRect(0, 0, W, H);

  // 六角トンネル口＋吹き飛ぶ破片（奥行きの手がかり）
  ctx.save();
  ctx.translate(cx, cy);
  const hexR = 22 + p * 520;
  ctx.strokeStyle = `rgba(210,255,255,${0.2 + p2 * 0.65})`;
  ctx.lineWidth = 2.2 + p * 4;
  titleFlatHexPath(ctx, 0, 0, hexR, p * 3.1);
  ctx.stroke();
  ctx.lineWidth = 1;
  for (let h = 0; h < 20; h++) {
    const ang = (h / 20) * Math.PI * 2 + p * 6.2 + h * 0.31;
    const spread = 0.28 + (h % 4) * 0.07;
    const rad = 36 + p * 440 + (h % 6) * 22;
    const hx = Math.cos(ang) * rad * spread;
    const hy = Math.sin(ang) * rad * spread;
    const al = (1 - p * 0.85) * 0.38;
    ctx.strokeStyle = `rgba(170,230,255,${al})`;
    titleFlatHexPath(ctx, hx, hy, 6 + p * 22, ang * 2.1 + p * 4);
    ctx.stroke();
  }
  ctx.restore();

  // 中心から放射するハイパースペース線
  ctx.save();
  ctx.translate(cx, cy);
  const rays = 72;
  for (let i = 0; i < rays; i++) {
    const twist = Math.sin(i * 0.18 + p * 14) * 0.14;
    const a = (i / rays) * Math.PI * 2 + p * 2.2 + twist;
    const wobble = Math.sin(i * 9.17 + p * 10) * 0.04;
    const inner = 24 + p * 90;
    const outer = inner + (140 + p * 340) * (0.55 + 0.45 * ((i * 13) % 7) / 7);
    const al = 0.05 + p2 * 0.58;
    ctx.strokeStyle = `rgba(200,235,255,${al})`;
    ctx.lineWidth = 1.1 + p * 2.4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a + wobble) * inner, Math.sin(a + wobble) * inner);
    ctx.lineTo(Math.cos(a + wobble) * outer, Math.sin(a + wobble) * outer);
    ctx.stroke();
  }
  ctx.restore();

  // 星を「流線」に見せる短いストローク（既存 starfield の上）
  ctx.save();
  ctx.globalAlpha = 0.35 + p2 * 0.45;
  ctx.strokeStyle = 'rgba(220,240,255,0.85)';
  ctx.lineWidth = 1;
  for (const s of game.stars) {
    if ((s.layer || 0) < 1) continue;
    const vx = -0.9 - (s.layer || 1) * 0.5;
    const vy = 0.55 + (s.layer || 1) * 0.35;
    const len = 6 + p * 28 * (0.5 + (s.layer || 1) * 0.2);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + vx * len, s.y + vy * len);
    ctx.stroke();
  }
  ctx.restore();

  // 前方へ進む感じのシアンフラッシュ（ピークを中盤に）
  const flash = Math.sin(p * Math.PI) * (1 - p * 0.35);
  ctx.fillStyle = `rgba(80,200,255,${flash * 0.14})`;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = `rgba(255,255,255,${flash * 0.08})`;
  ctx.lineWidth = 1.5;
  titleFlatHexPath(ctx, cx, cy, 18 + p * maxR * 0.42, -p * 2.8);
  ctx.stroke();
}

/** コックピット／モニタ枠：二重オレンジ枠＋四隅ブラケット（コンセプト参照） */
function drawTitleTermBezel() {
  const ctx = drawDeps.ctx;
  ctx.save();
  ctx.shadowColor = 'rgba(255, 80, 30, 0.35)';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = 'rgba(255, 100, 45, 0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, W - 4, H - 4);
  ctx.shadowBlur = 5;
  ctx.strokeStyle = 'rgba(180, 50, 20, 0.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(6, 6, W - 12, H - 12);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 150, 90, 0.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, W - 20, H - 20);
  const L = 20;
  const inset = 12;
  ctx.strokeStyle = 'rgba(255, 120, 65, 0.55)';
  ctx.lineWidth = 1.5;
  const corner = (x0, y0, dx1, dy1, dx2, dy2) => {
    ctx.beginPath();
    ctx.moveTo(x0 + dx1 * L, y0 + dy1 * L);
    ctx.lineTo(x0, y0);
    ctx.lineTo(x0 + dx2 * L, y0 + dy2 * L);
    ctx.stroke();
  };
  corner(inset, inset, 0, 1, 1, 0);
  corner(W - inset, inset, -1, 0, 0, 1);
  corner(inset, H - inset, 1, 0, 0, -1);
  corner(W - inset, H - inset, 0, -1, -1, 0);
  ctx.restore();
}

/**
 * タイトル画面：4 レイヤー構成（仕様①）
 * L1 背景 / L2 中景ボス＋脈動コア / L3 粒子・霧・ホロリング等 / L4 UI（タイトルは右上ギアのみ drawUIButtons）
 * アニメは Canvas のみ（ゲームループの描画コール内）。CSS アニメはこの画面では未使用。
 */
function drawTitle() {
  const ctx = drawDeps.ctx;
  const t = Date.now() / 1000;
  const cx = W / 2;
  const coreRingY = getTitleCoreGuideY();
  const bgFull = game.titleBgQuality === 'full';
  const marsScale = bgFull ? 1 : 0.78;
  const env = bgFull ? 1 : 0.58;

  const imgBg = tryDrawTitleBackgroundImage();
  game.titleBgImageActive = !!imgBg;
  if (!imgBg) drawStarfield();

  // TAP 主導：座標は title-layout と pointer のホバー判定で共有
  const deck = !!imgBg;
  const promptY = getTitlePromptY();
  const TITLE_BLOCK_NUDGE = 16;
  const titleMainY = Math.round(H * (deck ? 0.125 : 0.138)) + TITLE_BLOCK_NUDGE;
  const titleFontPx = Math.round((deck ? 46 : 44) + H * 0.008);
  const subtitleY = titleMainY + Math.round(titleFontPx * 0.82);
  const fxMul = deck ? 0.52 : 1;

  // —— L1 背景（火星風景・遠景のみ。ボス本体は L2）——
  if (!imgBg) {
    drawTitleNebulaMist(t, env);
    drawTitleEmbers(t, env);
    drawTitleMarsTopLeft(t, marsScale);
    drawTitleAsteroids(t, marsScale);
    drawTitleHexBackdrop(t, cx, bgFull);
    if (bgFull) drawTitleDistantSilhouette(t);
  }

  // —— L2 中景（巨大シルエット＋赤コア脈動。写真時はコアのみオーバーレイ）——
  if (!imgBg) {
    drawTitleHorizonTerrain(t, env);
    drawTitleSpires(t, env);
    drawTitleMechMass(t, cx, env);
    drawTitleCoreSilhouette(t, cx, coreRingY);
  }

  // —— L3 エフェクト（写真時はデッキ帯の読みやすさ優先で弱める）——
  if (deck) drawTitleDeckReadabilityVignette();
  drawTitleVerticalCenterGlow(deck ? 0.62 : 1);
  drawTitleDriftFog(t, fxMul);
  drawTitleRisingRedParticles(t, fxMul);
  drawTitleFloatingDebris(t, fxMul * 0.55);
  drawTitleHeatShimmer(t, deck);
  drawTitleRetroScanlines(imgBg);
  drawTitleFilmGrain(t, deck ? 0.65 : 1);

  // —— L4 UI ——
  ctx.textAlign = 'center';
  ctx.font = `bold ${titleFontPx}px Orbitron,Courier New`;
  ctx.fillStyle = 'rgba(18, 5, 4, 0.72)';
  ctx.fillText('INVADER CORE', cx + 3, titleMainY + 2);
  ctx.fillText('INVADER CORE', cx - 2, titleMainY - 1);
  ctx.shadowColor = TITLE_GLOW;
  ctx.shadowBlur = 28;
  ctx.fillStyle = '#fff8f4';
  ctx.shadowColor = TITLE_MAIN;
  ctx.shadowBlur = 42;
  ctx.fillText('INVADER CORE', cx, titleMainY);
  ctx.shadowBlur = 0;

  const subLine = '— GALAXY WAR —';
  ctx.font = 'bold 12px Orbitron,Courier New';
  ctx.letterSpacing = '0.28em';
  ctx.fillStyle = TITLE_MAIN;
  ctx.shadowColor = TITLE_GLOW;
  ctx.shadowBlur = 16;
  const subW = ctx.measureText(subLine).width;
  const subMidY = subtitleY - 4;
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 107, 61, 0.85)';
  ctx.beginPath();
  ctx.moveTo(cx - subW / 2 - 48, subMidY);
  ctx.lineTo(cx - subW / 2 - 8, subMidY);
  ctx.moveTo(cx + subW / 2 + 8, subMidY);
  ctx.lineTo(cx + subW / 2 + 48, subMidY);
  ctx.stroke();
  ctx.fillText(subLine, cx, subtitleY);
  ctx.letterSpacing = '0px';
  ctx.shadowBlur = 0;

  const titleGearLeft = W - 40;
  const idGap = 6;
  const idBoxW = 148;
  const idBoxH = 26;
  const idBoxX = titleGearLeft - idGap - idBoxW;
  const idBoxY = 8;
  ctx.fillStyle = 'rgba(22, 6, 4, 0.78)';
  ctx.fillRect(idBoxX, idBoxY, idBoxW, idBoxH);
  ctx.strokeStyle = 'rgba(255, 120, 60, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(idBoxX, idBoxY, idBoxW, idBoxH);
  ctx.font = '9px Orbitron,Courier New';
  ctx.fillStyle = TITLE_SUB;
  ctx.textAlign = 'right';
  const opId = (game.displayName || 'PLAYER').slice(0, 12);
  ctx.fillText(`ID: ${opId}`, idBoxX + idBoxW - 6, idBoxY + idBoxH / 2 + 3);

  let tapHintSeen = true;
  try { tapHintSeen = !!localStorage.getItem('invader_title_tap_hint_seen'); } catch (e) {}
  const hot = game.titleTapHovered ? 1 : 0;
  const tapPulse = 1 + 0.018 * Math.sin(t * 2.35) + hot * 0.028;
  const tapScale = (tapHintSeen ? 1 : 1.06) * tapPulse;
  const tapOp = Math.min(1, 0.72 + 0.28 * Math.sin(t * 1.75) + hot * 0.12);
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(cx, promptY);
  ctx.scale(tapScale, tapScale);
  ctx.translate(-cx, -promptY);
  const tapMainFont = deck ? 'bold 18px Orbitron,Courier New' : 'bold 17px Orbitron,Courier New';
  const tapStr = 'TAP TO START';
  ctx.font = tapMainFont;
  ctx.letterSpacing = '0.1em';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = `rgba(8, 55, 72, ${0.38 + 0.1 * tapOp})`;
  ctx.shadowBlur = 0;
  ctx.strokeText(tapStr, cx, promptY);
  ctx.fillStyle = `rgba(240, 252, 255, ${0.86 + 0.1 * tapOp})`;
  ctx.shadowColor = TITLE_TAP_GLOW;
  ctx.shadowBlur = 16 + hot * 10;
  ctx.fillText(tapStr, cx, promptY);
  ctx.shadowBlur = 0;
  ctx.letterSpacing = '0px';
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.font = '12px Orbitron,Courier New';
  ctx.fillStyle = 'rgba(255, 179, 122, 0.55)';
  ctx.fillText('VERSION 0.1.0', 14, H - 22);
  if ((game.highestStage || 1) > 1) {
    ctx.fillStyle = 'rgba(255, 179, 122, 0.48)';
    ctx.fillText(`BEST STAGE  ${game.highestStage}`, 14, H - 8);
  }

  const sbx = W - 172;
  const sby = H - 50;
  const sbw = 168;
  const sbh = 42;
  ctx.fillStyle = 'rgba(12, 4, 6, 0.62)';
  ctx.fillRect(sbx, sby, sbw, sbh);
  ctx.strokeStyle = 'rgba(255, 120, 60, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(sbx, sby, sbw, sbh);
  const gx = sbx + 16;
  const gy = sby + sbh / 2;
  ctx.strokeStyle = 'rgba(255, 107, 61, 0.72)';
  ctx.beginPath();
  ctx.arc(gx, gy, 9, 0, Math.PI * 2);
  ctx.moveTo(gx - 11, gy);
  ctx.lineTo(gx + 11, gy);
  ctx.moveTo(gx, gy - 9);
  ctx.lineTo(gx, gy + 9);
  ctx.stroke();
  ctx.font = '7px Orbitron,Courier New';
  ctx.textAlign = 'left';
  ctx.fillStyle = TITLE_SUB;
  ctx.fillText('INVADER CORE SYSTEMS', sbx + 30, sby + 16);
  const stY = sby + 30;
  ctx.fillStyle = 'rgba(255, 200, 170, 0.55)';
  ctx.fillText('STATUS:', sbx + 30, stY);
  const stLab = 'ONLINE';
  const stW = ctx.measureText('STATUS: ').width;
  ctx.shadowColor = TITLE_STATUS_OK;
  ctx.shadowBlur = 6;
  ctx.fillStyle = TITLE_STATUS_OK;
  ctx.fillText(stLab, sbx + 30 + stW, stY);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
}

function updateDamageNumbers() {
  for (let i = game.damageNumbers.length - 1; i >= 0; i--) {
    const d = game.damageNumbers[i];
    d.y += d.vy; d.vy *= 0.94; d.timer--;
    if (d.timer <= 0) game.damageNumbers.splice(i, 1);
  }
}

function drawDamageNumbers() {
  ctx.textAlign = 'center';
  for (const d of game.damageNumbers) {
    const a = Math.min(1, d.timer / 20);
    const scale = d.isCrit ? (d.timer > 45 ? 1 + (55 - d.timer) * 0.08 : 1) : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(d.x, d.y);
    if (scale !== 1) ctx.scale(scale, scale);
    const col = d.isHeal ? '#00ff88' : d.isCrit ? '#ff4444' : '#ffffff';
    ctx.shadowColor = col; ctx.shadowBlur = d.isCrit ? 12 : 6;
    ctx.fillStyle = col;
    ctx.font = `bold ${d.isCrit ? 18 : 13}px Orbitron,Courier New`;
    ctx.fillText(d.isCrit ? `${d.val}!!` : String(d.val), 0, 0);
    ctx.shadowBlur = 0; ctx.restore();
  }
  ctx.textAlign = 'left';
}

function drawParticles() {
  game.particles.forEach(p => {
    ctx.globalAlpha = p.life; ctx.shadowColor = p.color; ctx.shadowBlur = 6; ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  });
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}

function drawGroundLine(color) {
  const glow = 4 + Math.sin(game.groundPulse) * 2;
  ctx.shadowColor = color; ctx.shadowBlur = glow * 3; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, H - 30); ctx.lineTo(W, H - 30); ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawHUD(accent) {
  // ── ボトムバー背景 (y = H-52 to H-4) ──
  const BAR_Y = H - 52, BAR_H = 48;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, BAR_Y, W, BAR_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, BAR_Y); ctx.lineTo(W, BAR_Y); ctx.stroke();

  // ── 左: HPバー ──
  const hpRatio = game.playerStats.maxHp > 0 ? game.playerStats.hp / game.playerStats.maxHp : 0;
  const hpCol = hpRatio > 0.5 ? '#00ff88' : hpRatio > 0.25 ? '#ffaa00' : '#ff3344';
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.roundRect(8, BAR_Y + 8, 180, 10, 3); ctx.fill();
  ctx.shadowColor = hpCol; ctx.shadowBlur = 6;
  ctx.fillStyle = hpCol; ctx.beginPath(); ctx.roundRect(8, BAR_Y + 8, Math.max(0, 180 * hpRatio), 10, 3); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#aaa'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.fillText(`HP  ${game.playerStats.hp} / ${game.playerStats.maxHp}`, 8, BAR_Y + 32);

  // ── 中央: ULTゲージ ──
  const uRatio = game.ultimateGauge / ULTIMATE_MAX;
  const uReady = game.ultimateGauge >= ULTIMATE_MAX;
  const uCol = uReady ? '#ffdd00' : '#ff8833';
  const UX = W / 2 - 90, UW = 180;
  ctx.fillStyle = 'rgba(255,120,0,0.1)'; ctx.beginPath(); ctx.roundRect(UX, BAR_Y + 8, UW, 10, 3); ctx.fill();
  ctx.shadowColor = uCol; ctx.shadowBlur = uReady ? 14 : 3;
  ctx.fillStyle = uCol; ctx.beginPath(); ctx.roundRect(UX, BAR_Y + 8, UW * uRatio, 10, 3); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = uCol; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
  if (uReady) {
    ctx.globalAlpha = 0.6 + Math.sin(game.frameCount * 0.25) * 0.4;
    ctx.shadowColor = uCol; ctx.shadowBlur = 10;
    ctx.fillText('★ E : ULTIMATE READY ★', W / 2, BAR_Y + 32);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = '#666';
    ctx.fillText(`ULT  ${Math.floor(uRatio * 100)}%`, W / 2, BAR_Y + 32);
  }

  // ── 右: 武器 + ダッシュ ──
  const w = currentWeapon(), wcol = WEAPON_COLOR[w];
  const ammo = w === 'normal' ? '∞' : game.weaponAmmo[w];
  ctx.shadowColor = wcol; ctx.shadowBlur = 6; ctx.fillStyle = wcol;
  ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'right';
  ctx.fillText(`[${WEAPON_LABEL[w]}]  ${ammo}`, W - 8, BAR_Y + 18);
  ctx.shadowBlur = 0;
  // ダッシュ
  if (game.dashCooldown > 0) {
    ctx.fillStyle = 'rgba(100,180,255,0.25)'; ctx.beginPath(); ctx.roundRect(W - 104, BAR_Y + 24, 96, 7, 2); ctx.fill();
    ctx.fillStyle = '#4af'; ctx.shadowColor = '#4af'; ctx.shadowBlur = 4;
    ctx.beginPath(); ctx.roundRect(W - 104, BAR_Y + 24, 96 * (1 - game.dashCooldown / DASH_COOLDOWN), 7, 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#4af'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText('DASH', W - 8, BAR_Y + 40);
  } else {
    ctx.fillStyle = '#4af'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.shadowColor = '#4af'; ctx.shadowBlur = 4;
    ctx.fillText('DASH  READY', W - 8, BAR_Y + 40);
    ctx.shadowBlur = 0;
  }

  // ── 最下部: EXPストリップ (4px) ──
  const expRatio = game.playerLevel >= 10 ? 1 : (game.exp / (EXP_TABLE[Math.min(game.playerLevel, EXP_TABLE.length - 1)] || 1));
  ctx.fillStyle = 'rgba(255,220,0,0.15)'; ctx.fillRect(0, H - 4, W, 4);
  ctx.shadowColor = '#ff0'; ctx.shadowBlur = 4;
  ctx.fillStyle = '#dd0'; ctx.fillRect(0, H - 4, W * expRatio, 4);
  ctx.shadowBlur = 0;

  // パワーアップ (バーの上)
  if (game.powerupActive) {
    const pcol = { double: '#ff0', invincible: '#0ff', wide: '#f0f' }[game.powerupActive];
    const plabel = { double: '2x SHOT', invincible: 'SHIELD', wide: 'WIDE' }[game.powerupActive];
    ctx.shadowColor = pcol; ctx.shadowBlur = 8; ctx.fillStyle = pcol;
    ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText(`[${plabel}]`, W - 8, BAR_Y - 22);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(W - 104, BAR_Y - 14, 96, 6, 2); ctx.fill();
    ctx.fillStyle = pcol; ctx.beginPath(); ctx.roundRect(W - 104, BAR_Y - 14, 96 * (game.powerupTimer / POWERUP_DURATION), 6, 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.textAlign = 'left';
  }

  // コンボ
  if (game.comboDisplay) {
    ctx.globalAlpha = Math.min(1, game.comboDisplay.timer / 20);
    ctx.shadowColor = '#ff0'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff0'; ctx.font = 'bold 16px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(game.comboDisplay.text, game.comboDisplay.x, game.comboDisplay.y);
    ctx.textAlign = 'left'; ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  // ボスまでカウンター
  if (game.bossPhase) {
    const pulse = Math.sin(game.frameCount * 0.1) * 0.3 + 0.7;
    ctx.globalAlpha = pulse; ctx.shadowColor = '#f44'; ctx.shadowBlur = 15;
    ctx.fillStyle = '#f44'; ctx.font = 'bold 14px Orbitron,Courier New'; ctx.textAlign = 'center';
    const bossLabel = game.stageType === 'boss_rush' ? `!! BOSS  ${game.bossRushCount + 1}/${game.bossRushMax} !!` : '!! BOSS !!';
    ctx.fillText(bossLabel, W / 2, 22); ctx.shadowBlur = 0; ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    if (game.healers.filter(h => h.alive).length > 0) {
      ctx.fillStyle = '#0f0'; ctx.font = '12px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('▲ HEALERS INCOMING ▲', W / 2, 40); ctx.textAlign = 'left';
    }
  } else {
    ctx.textAlign = 'right';
    if (game.stageType === 'normal' || game.stageType === 'endless') {
      const maxWave = getWaveCount();
      const alive = game.invaders.filter(i => i.alive).length;
      ctx.fillStyle = accent; ctx.font = '12px Orbitron,Courier New';
      ctx.fillText(`WAVE ${game.waveNum}/${maxWave}  ×${alive}`, W - 8, 22);
    } else if (game.stageType === 'survival') {
      const sec = Math.ceil(game.survivalTimer / 60);
      ctx.fillStyle = '#0ff'; ctx.font = '12px Orbitron,Courier New';
      ctx.fillText(`SURVIVE: ${sec}s`, W - 8, 22);
    }
    ctx.textAlign = 'left';
    if (game.isAsteroidStage) {
      ctx.fillStyle = '#888'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'right';
      ctx.fillText('☄ ASTEROID STAGE', W - 8, 38); ctx.textAlign = 'left';
    }
  }
  ctx.textAlign = 'left';

  // ── MENUボタン（右上）──
  const MBX = W - 50, MBY = 6, MBW = 44, MBH = 22;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.roundRect(MBX, MBY, MBW, MBH, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(MBX, MBY, MBW, MBH, 4); ctx.stroke();
  ctx.fillStyle = '#aac'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText('≡ MENU', MBX + MBW / 2, MBY + 15);
  ctx.textAlign = 'left';
  game._menuBtnHit = { x: MBX, y: MBY, w: MBW, h: MBH };
}

function drawLifeGainDisplay() {
  if (!game.lifeGainDisplay) return;
  const a = Math.min(1, game.lifeGainDisplay.timer / 20);
  ctx.globalAlpha = a; ctx.shadowColor = game.lifeGainDisplay.color; ctx.shadowBlur = 20;
  ctx.fillStyle = game.lifeGainDisplay.color; ctx.font = 'bold 22px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText(game.lifeGainDisplay.text, W / 2, H / 2 - 20);
  ctx.shadowBlur = 0; ctx.textAlign = 'left'; ctx.globalAlpha = 1;
}

function drawLevelUpDisplay() {
  if (!game.levelUpDisplay) return;
  const a = Math.min(1, game.levelUpDisplay.timer / 20);
  ctx.globalAlpha = a; ctx.shadowColor = '#ff0'; ctx.shadowBlur = 25;
  ctx.fillStyle = '#ff0'; ctx.font = 'bold 26px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.fillText(game.levelUpDisplay.text, W / 2, H / 2 - 50);
  ctx.shadowBlur = 0; ctx.textAlign = 'left'; ctx.globalAlpha = 1;
}

function drawEventBanner() {
  if (!game.currentEvent || game.eventTimer <= 0) return;
  const pulse = Math.sin(game.frameCount * 0.15) * 0.3 + 0.7;
  ctx.globalAlpha = pulse * 0.9; ctx.fillStyle = game.currentEvent.color;
  ctx.font = 'bold 18px Orbitron,Courier New'; ctx.textAlign = 'center';
  ctx.shadowColor = game.currentEvent.color; ctx.shadowBlur = 15;
  ctx.fillText(game.currentEvent.label, W / 2, H - 100);
  ctx.shadowBlur = 0; ctx.textAlign = 'left'; ctx.globalAlpha = 1;
}

function drawMatPopups() {
  if (!game.matPopups.length) return;
  ctx.textAlign = 'center';
  for (const p of game.matPopups) {
    const a = p.timer / 55;
    ctx.globalAlpha = Math.min(1, a * 2);
    ctx.font = 'bold 14px Orbitron,Courier New';
    ctx.shadowColor = '#fff'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#fff';
    ctx.fillText(p.text, p.x, p.y);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
}

function drawStageClearAnim() {
  const t = game.stageClearAnimTimer;
  const prog = 1 - (t / 80);
  const flashAlpha = t > 60 ? (t - 60) / 20 * 0.8 : t < 15 ? t / 15 * 0.5 : 0.5;
  ctx.fillStyle = `rgba(0,255,120,${flashAlpha * 0.18})`; ctx.fillRect(0, 0, W, H);
  const textAlpha = t > 60 ? 0 : (t < 50 && t > 10) ? (50 - t) / 40 : 0;
  if (textAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = textAlpha;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, H / 2 - 60, W, 120);
    ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 40;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 52px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('STAGE  CLEAR!', W / 2, H / 2 + 18);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  // border flash
  if (t > 55) {
    ctx.strokeStyle = `rgba(0,255,120,${(t - 55) / 25})`; ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6); ctx.lineWidth = 1;
  }
  ctx.textAlign = 'left';
}

function drawBossWarning(theme) {
  if (game.bossWarningTimer <= 0) return;
  const t = game.bossWarningTimer, pulse = Math.sin(t * 0.25) * 0.5 + 0.5;
  ctx.strokeStyle = `rgba(255,30,30,${pulse * 0.9})`; ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, W - 8, H - 8); ctx.lineWidth = 1;
  if (t > 40) {
    ctx.globalAlpha = pulse * 0.9;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, H / 2 - 70, W, 140);
    ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 30;
    ctx.fillStyle = '#ff2222'; ctx.font = 'bold 56px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('!! WARNING !!', W / 2, H / 2 - 5);
    ctx.shadowBlur = 10; ctx.fillStyle = '#ffaa00'; ctx.font = 'bold 20px Orbitron,Courier New';
    ctx.fillText('BOSS  APPROACHING', W / 2, H / 2 + 36);
    ctx.shadowBlur = 0; ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
}

function drawStageBanner(accent) {
  if (game.stageBannerTimer <= 0) return;
  const progress = game.stageBannerTimer / 120;
  const alpha = progress < 0.2 ? progress / 0.2 : progress > 0.7 ? (progress - 0.7) / 0.3 : 1;
  ctx.globalAlpha = alpha * 0.95;
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, H / 2 - 44, W, 88);
  ctx.shadowColor = accent; ctx.shadowBlur = 20; ctx.fillStyle = accent;
  ctx.font = 'bold 42px Orbitron,Courier New'; ctx.textAlign = 'center';
  const stageLabel = game.stageType === 'normal' ? (game.isAsteroidStage ? ' ☄' : '') : ` [${STAGE_TYPE_LABELS[game.stageType]}]`;
  ctx.fillText(`STAGE  ${game.stage}${stageLabel}`, W / 2, H / 2 + 15);
  ctx.shadowBlur = 0; ctx.textAlign = 'left'; ctx.globalAlpha = 1;
}

function drawHitFlash() {
  if (game.hitFlashTimer <= 0) return;
  const alpha = (game.hitFlashTimer / 40) * 0.3;
  ctx.save();
  const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.88);
  grad.addColorStop(0, 'rgba(255,0,0,0)');
  grad.addColorStop(0.5, `rgba(255,0,0,${alpha * 0.35})`);
  grad.addColorStop(1, `rgba(255,40,20,${alpha})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawScanlines() {
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);
}

function drawSurvivalTimer() {
  if (game.stageType !== 'survival' || game.bossPhase) return;
  const sec = Math.ceil(game.survivalTimer / 60);
  const danger = sec <= 10;
  const pulse = danger ? 0.6 + Math.sin(game.frameCount * 0.3) * 0.4 : 1;
  ctx.globalAlpha = pulse;
  ctx.shadowColor = danger ? '#f44' : '#0cf'; ctx.shadowBlur = 15;
  ctx.fillStyle = danger ? '#f44' : '#0cf';
  ctx.font = `bold 20px Orbitron,Courier New`; ctx.textAlign = 'center';
  ctx.fillText(`SURVIVE  ${sec}`, W / 2, 22);
  ctx.shadowBlur = 0; ctx.textAlign = 'left'; ctx.globalAlpha = 1;
}

function drawWaveBanner() {
  if (game.waveBannerTimer <= 0 || game.stageType === 'survival' || game.stageType === 'boss_rush') return;
  const alpha = Math.min(1, game.waveBannerTimer / 20) * Math.min(1, (game.waveBannerTimer) / 20);
  ctx.save(); ctx.globalAlpha = alpha;
  const p = getPlanet(game.stage);
  ctx.shadowColor = p.accent; ctx.shadowBlur = 20;
  ctx.fillStyle = p.accent; ctx.font = 'bold 32px Orbitron,Courier New'; ctx.textAlign = 'center';
  const maxWave = getWaveCount();
  ctx.fillText(game.waveNum < maxWave ? `WAVE  ${game.waveNum}  /  ${maxWave}` : `FINAL  WAVE  —  BOSS  INCOMING`, W / 2, H / 2 - 60);
  ctx.shadowBlur = 0; ctx.restore();
}

// Export all UI drawing functions
export {
  drawBattleBackground,
  drawUIButtons,
  drawPauseOverlay,
  drawGameOverOverlay,
  drawCriticalVignette,
  drawJoystick,
  drawScreenFlash,
  drawVignette,
  drawStarfield,
  drawTitleDistantSilhouette,
  drawTitleWarp,
  drawTitle,
  drawTitleTermBezel,
  updateDamageNumbers,
  drawDamageNumbers,
  drawParticles,
  drawGroundLine,
  drawHUD,
  drawLifeGainDisplay,
  drawLevelUpDisplay,
  drawEventBanner,
  drawMatPopups,
  drawStageClearAnim,
  drawBossWarning,
  drawStageBanner,
  drawHitFlash,
  drawScanlines,
  drawSurvivalTimer,
  drawWaveBanner
};
