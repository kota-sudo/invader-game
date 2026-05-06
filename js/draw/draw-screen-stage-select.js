/**
 * Stage select screen drawing (extracted from draw-screens.js)
 */
import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';
import { drawShipShape } from './draw-ship-shape.js';

let drawDeps;
let syncFuel;
let getWorldInfo;
let formatStageId;
let stageSelectFuelLaunchOk;
let getPlanet;

export function setStageSelectDrawDeps(deps) {
  drawDeps = deps;
  ({
    syncFuel,
    getWorldInfo,
    formatStageId,
    stageSelectFuelLaunchOk,
    getPlanet,
  } = deps);
}

export function drawStageSelectScreen() {
  const ctx = drawDeps.ctx;
  const selStage = game.stageSelectIdx + 1;
  const world = getWorldInfo(selStage);
  const PANEL_X = 478;
  const localInWorld = ((selStage - 1) % 10) + 1;
  const isMidBossStage = (localInWorld === 5);
  const isBossStage = (localInWorld === 10);
  const isAppliedStage = (localInWorld >= 6 && localInWorld <= 9);
  const isNormalStage = (localInWorld >= 1 && localInWorld <= 4);
  let customRightPanel = false;

  syncFuel();
  game._stageSelectLaunchFuelBlocked = (selStage <= game.highestStage) && !stageSelectFuelLaunchOk();

  ctx.fillStyle = world.bg; ctx.fillRect(0, 0, W, H);
  drawDeps.drawStarfield();
  drawDeps.drawWorldBgObjects(world.num);
  // 深み（火星感）：赤い霧グラデ＋薄い惑星（ぼかし風）
  {
    const fog = ctx.createRadialGradient(240, 240, 80, 240, 240, 520);
    fog.addColorStop(0, 'rgba(255,60,30,0.08)');
    fog.addColorStop(0.55, 'rgba(180,30,10,0.04)');
    fog.addColorStop(1, 'transparent');
    ctx.fillStyle = fog; ctx.fillRect(0, 0, W, H);
    // 薄い惑星（左上）
    ctx.save();
    ctx.globalAlpha = 0.10;
    const px2 = 120, py2 = 120, pr2 = 86;
    const pg = ctx.createRadialGradient(px2 - 20, py2 - 20, 10, px2, py2, pr2);
    pg.addColorStop(0, 'rgba(255,120,80,0.25)');
    pg.addColorStop(1, 'rgba(40,10,8,0.0)');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(px2, py2, pr2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // MID BOSS: 画面全体をわずかに暗くする（イベント戦の重み）
  if (isMidBossStage) {
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(0, 0, W, H);
  }

  // 右パネル連動：フェードのみ（横スライドは境界に変な線が出やすいため廃止）
  const prevPanelIdx = Number.isFinite(game._lastStageSelectIdx) ? game._lastStageSelectIdx : game.stageSelectIdx;
  if (prevPanelIdx !== game.stageSelectIdx) {
    game._lastStageSelectIdx = game.stageSelectIdx;
    game.stageSelectPanelFxAt = game.frameCount;
  }
  const panelFxAt = Number.isFinite(game.stageSelectPanelFxAt) ? game.stageSelectPanelFxAt : -999;
  const panelDelay = 5;
  const panelT = Math.max(0, Math.min(1, (game.frameCount - (panelFxAt + panelDelay)) / 12));
  const panelAlpha = 0.78 + 0.22 * panelT;

  // ===== 右側情報パネル =====
  ctx.save();
  ctx.globalAlpha = panelAlpha;
  ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.strokeStyle = world.accent + '44'; ctx.lineWidth = 1;
  const panelY = 8;
  const panelH = Math.max(340, H - 16);
  ctx.beginPath(); ctx.roundRect(PANEL_X + 2, panelY, 316, panelH, 8); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = world.accent + '30'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PANEL_X, 0); ctx.lineTo(PANEL_X, H); ctx.stroke();

  const px = PANEL_X + 158;

  // ===== 右パネル：情報構造（統一）=====
  // 1) ステージ番号を最優先（最大） 2) 惑星名はサブ 3) MID/BOSS はタグ化
  const stageId = formatStageId(selStage);
  const RX = PANEL_X + 16, RW = 288;
  const headerTop = 44;

  // 惑星名（小さく）
  ctx.fillStyle = 'rgba(200,220,255,0.55)';
  ctx.font = 'bold 10px Orbitron,Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(world.name, px, headerTop + 18);

  // ステージ番号（最大）
  // 視線誘導：+15%（強く）。にじみ防止でグローは少し抑える
  ctx.shadowColor = world.accent; ctx.shadowBlur = 16;
  ctx.fillStyle = world.accent;
  ctx.font = 'bold 72px Orbitron,Courier New';
  ctx.fillText(stageId, px, headerTop + 76);
  ctx.shadowBlur = 0;

  // ステージ番号直下：状態は1行のみ（通常／中ボス／最終ボスで文言を出し分け）
  ctx.textAlign = 'center';
  const statusLineY = headerTop + 108;
  ctx.font = 'bold 11px Orbitron,Courier New';
  if (isMidBossStage) {
    ctx.fillStyle = 'rgba(255, 200, 140, 0.95)';
    ctx.shadowColor = 'rgba(255, 140, 70, 0.35)';
    ctx.shadowBlur = 8;
    ctx.fillText('MID BOSS', px, statusLineY);
    ctx.shadowBlur = 0;
  } else if (isBossStage) {
    const blink = 0.78 + 0.22 * Math.sin((Date.now() / 1000) * (Math.PI * 2 / 0.9));
    ctx.fillStyle = `rgba(255, 110, 75, ${0.96 * blink})`;
    ctx.shadowColor = `rgba(255, 70, 50, ${0.45 * blink})`;
    ctx.shadowBlur = 10 * blink;
    ctx.fillText('WARNING / BOSS', px, statusLineY);
    ctx.shadowBlur = 0;
  } else if (selStage < game.highestStage) {
    ctx.fillStyle = 'rgba(130, 255, 190, 0.88)';
    ctx.fillText('✓ クリア済み', px, statusLineY);
  } else if (selStage === game.highestStage) {
    ctx.fillStyle = 'rgba(140, 220, 255, 0.9)';
    ctx.fillText('▶ 挑戦中', px, statusLineY);
  } else if (selStage > game.highestStage) {
    ctx.fillStyle = 'rgba(180, 195, 220, 0.72)';
    ctx.fillText('🔒 未解放', px, statusLineY);
  }
  ctx.textAlign = 'left';

  // セパレーター
  ctx.fillStyle = world.accent + '22'; ctx.fillRect(PANEL_X + 18, headerTop + 118, 300, 1);

  // 中間ボス/ボス情報（1-5 / 1-10 のときだけ表示）
  if (isMidBossStage) {
    customRightPanel = true;
    // ===== MID BOSS 右パネル（指定レイアウト）=====
    const RX = PANEL_X + 16, RW = 288;
    const topY = 162;
    const t = Date.now() / 1000;
    const pulse = 0.65 + 0.35 * Math.sin(game.frameCount * 0.08);
    const zoom = 1.03 + 0.02 * Math.sin(t * 0.65);
    const teleportBlink = 0.55 + 0.45 * Math.sin((t) * (Math.PI * 2 / 0.8));
    // 画像
    const bossImg = drawDeps.getImage('./assets/midboss_mars_sentinel.png');
    const imgX = RX, imgY = topY, imgW = RW, imgH = 178;
    // カード化＋背景にぼかしオーバーレイ
    ctx.fillStyle = 'rgba(6,8,18,0.70)';
    ctx.strokeStyle = 'rgba(255,70,50,0.45)';
    ctx.lineWidth = 1.6;
    ctx.shadowColor = 'rgba(255,70,50,0.55)'; ctx.shadowBlur = 10 + 10 * pulse;
    ctx.beginPath(); ctx.roundRect(imgX, imgY, imgW, imgH, 12); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    if (bossImg.complete && bossImg.naturalWidth > 0) {
      const sw = bossImg.naturalWidth, sh = bossImg.naturalHeight;
      // cover（ズームアニメ）
      const sc = Math.max(imgW / sw, imgH / sh) * zoom;
      const cw = Math.floor(imgW / sc), ch = Math.floor(imgH / sc);
      const sx = Math.floor((sw - cw) / 2), sy = Math.floor((sh - ch) / 2);
      // ぼかし背景
      ctx.save();
      ctx.beginPath(); ctx.roundRect(imgX, imgY, imgW, imgH, 12); ctx.clip();
      ctx.filter = 'blur(6px)';
      ctx.globalAlpha = 0.55;
      ctx.drawImage(bossImg, sx, sy, cw, ch, imgX, imgY, imgW, imgH);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      // 前景（シャープ）
      ctx.drawImage(bossImg, sx, sy, cw, ch, imgX, imgY, imgW, imgH);
      // 画像周辺に赤いグロー＋パルス
      const glow = ctx.createRadialGradient(imgX + imgW * 0.55, imgY + imgH * 0.45, 20, imgX + imgW * 0.55, imgY + imgH * 0.45, Math.max(imgW, imgH) * 0.65);
      glow.addColorStop(0, `rgba(255,70,50,${0.18 + 0.10 * pulse})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(imgX, imgY, imgW, imgH);
      // 下に暗グラデ
      const gg = ctx.createLinearGradient(0, imgY, 0, imgY + imgH);
      gg.addColorStop(0, 'transparent');
      gg.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = gg; ctx.fillRect(imgX, imgY, imgW, imgH);
      ctx.restore();
    }
    game._stageSelectBossCardHit = { x: imgX, y: imgY, w: imgW, h: imgH, src: './assets/midboss_mars_sentinel.png', title: 'MID BOSS' };

    // 能力（中央軸） + 特徴タグ（ピル）
    let y = imgY + imgH + 28;
    ctx.fillStyle = `rgba(255,160,140,${0.78 + 0.22 * teleportBlink})`;
    ctx.font = 'bold 18px Orbitron,Courier New';
    ctx.fillText('TELEPORT', RX + 10, y);
    y += 22;
    // タグ化（アイコン＋短文）
    const pills = [
      { txt: '🌀 ワープ攻撃', col: 'rgba(255,190,120,0.92)' },
      { txt: '👥 分身', col: 'rgba(255,190,120,0.92)' },
    ];
    let px0 = RX + 10;
    pills.forEach(p => {
      const w = Math.min(170, Math.ceil(ctx.measureText(p.txt).width + 26));
      ctx.fillStyle = 'rgba(255,160,80,0.14)';
      ctx.strokeStyle = 'rgba(255,160,80,0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(px0, y - 14, w, 22, 11); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,230,190,0.92)';
      ctx.font = 'bold 11px Orbitron,Courier New';
      ctx.fillText(p.txt, px0 + 12, y + 2);
      px0 += w + 10;
    });

    // 推奨戦力 / 報酬
    y += 34;
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(RX, y, RW, 1);
    y += 24;
    const recPower = Math.max(80, selStage * 120);
    const coinMin = 80 + selStage * 8;
    const coinMax = coinMin + 39;
    const gemBase = 3 + Math.floor(selStage / 5);
    // 推奨（強調）
    ctx.fillStyle = 'rgba(255,220,120,0.95)'; ctx.font = 'bold 13px Orbitron,Courier New';
    ctx.shadowColor = 'rgba(255,200,80,0.65)'; ctx.shadowBlur = 8;
    ctx.fillText(`推奨 ⚡ ${recPower}`, RX + 10, y);
    ctx.shadowBlur = 0;
    y += 22;
    // 報酬：コイン/ジェム優先、素材は小さく
    ctx.fillStyle = 'rgba(255,120,60,0.14)';
    ctx.strokeStyle = 'rgba(255,120,60,0.24)';
    ctx.beginPath(); ctx.roundRect(RX, y - 14, RW, 42, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,210,190,0.92)'; ctx.font = 'bold 11px Orbitron,Courier New';
    ctx.fillText('報酬', RX + 10, y);
    ctx.fillStyle = 'rgba(255,235,190,0.95)'; ctx.font = 'bold 12px Orbitron,Courier New';
    ctx.fillText(`💰 +${coinMin}〜${coinMax}   💎${gemBase}`, RX + 58, y);
    ctx.fillStyle = 'rgba(255,235,190,0.62)'; ctx.font = 'bold 10px Orbitron,Courier New';
    ctx.fillText('🔧×2', RX + 214, y);

    // 出現する敵
    y += 26;
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(RX, y, RW, 1);
    y += 22;
    ctx.fillStyle = 'rgba(255,150,130,0.90)'; ctx.font = 'bold 12px Orbitron,Courier New';
    ctx.fillText('敵', RX + 10, y);
    y += 26;
    const types = drawDeps.getStageEnemyTypes(selStage);
    const iconSize = 20, gap = 32;
    const startX = RX + 18;
    types.slice(0, 6).forEach((t, i) => {
      const ex = startX + i * gap, ey = y;
      const tc = drawDeps.ENEMY_PREVIEW_COLORS[t] || '#aaa';
      ctx.save(); ctx.translate(ex, ey);
      ctx.shadowColor = tc; ctx.shadowBlur = 8; ctx.fillStyle = tc;
      drawDeps.drawEnemyPreviewIcon(ctx, t, iconSize);
      ctx.restore();
    });

    // 下部：FUEL + 出撃ボタン（少し小さめ + hoverで強発光）
    const bx = RX, bw = RW, bh = 74;
    const by = Math.min(520, (H - Math.max(12, Math.round(H * 0.03))) - bh);
    const fuelY = by - 10;
    syncFuel();
    const fuelHave = Math.max(0, Math.floor(game.fuel || 0));
    ctx.fillStyle = 'rgba(10,16,34,0.80)';
    ctx.strokeStyle = 'rgba(255,80,60,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, fuelY - 12, bw, 18, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,210,200,0.92)';
    ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.fillText(`FUEL  ${fuelHave}/${drawDeps.FUEL_CAP}`, bx + 10, fuelY);

    const fuelBl = !!game._stageSelectLaunchFuelBlocked;
    const hov = game.hoveredBtn && game.hoveredBtn.id === 'ss_launch' && !fuelBl;
    const s = hov ? 1.03 : 1;
    ctx.save();
    ctx.translate(bx + bw / 2, by + bh / 2); ctx.scale(s, s); ctx.translate(-(bx + bw / 2), -(by + bh / 2));
    const g = ctx.createLinearGradient(0, by, 0, by + bh);
    const blink = 0.84 + 0.16 * Math.sin((Date.now() / 1000) * (Math.PI * 2 / 0.8));
    g.addColorStop(0, `rgba(255,70,40,${0.95 * blink})`);
    g.addColorStop(1, `rgba(255,150,60,${0.95 * blink})`);
    ctx.globalAlpha = fuelBl ? 0.48 : 1;
    ctx.fillStyle = g;
    ctx.strokeStyle = fuelBl ? 'rgba(110,95,90,0.55)' : 'rgba(255,200,120,0.85)';
    ctx.lineWidth = 2.4;
    if (fuelBl) ctx.setLineDash([4, 3]); else ctx.setLineDash([]);
    ctx.shadowColor = fuelBl ? 'transparent' : 'rgba(255,120,60,0.85)';
    ctx.shadowBlur = fuelBl ? 0 : ((hov ? 30 : 22) * blink);
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 16); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = fuelBl ? 'rgba(255,210,200,0.90)' : 'rgba(255,255,255,0.92)';
    ctx.font = fuelBl ? 'bold 14px Orbitron,Courier New' : 'bold 22px Orbitron,Courier New'; ctx.textAlign = 'center';
    if (fuelBl) ctx.fillText('燃料が足りません', bx + bw / 2, by + bh / 2 + 8);
    else ctx.fillText('▶ 出撃', bx + bw / 2, by + bh / 2 + 8);
    ctx.restore();

    game._stageSelectLaunchHit = { x: bx, y: by, w: bw, h: bh };
    ctx.textAlign = 'left';
  }
  else if (isBossStage) {
    customRightPanel = true;
    // ===== FINAL BOSS 右パネル（指定レイアウト）=====
    const RX = PANEL_X + 16, RW = 288;
    const topY = 162;

    // ボス画像（中央軸）
    const bossImg = drawDeps.getImage('./assets/boss_burst.png');
    const imgX = RX, imgY = topY, imgW = RW, imgH = 178;
    ctx.fillStyle = 'rgba(6,8,18,0.70)';
    ctx.strokeStyle = 'rgba(255,70,50,0.45)';
    ctx.lineWidth = 1.6;
    ctx.shadowColor = 'rgba(255,70,50,0.55)'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.roundRect(imgX, imgY, imgW, imgH, 12); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    if (bossImg.complete && bossImg.naturalWidth > 0) {
      const sw = bossImg.naturalWidth, sh = bossImg.naturalHeight;
      const sc = Math.max(imgW / sw, imgH / sh);
      const cw = Math.floor(imgW / sc), ch = Math.floor(imgH / sc);
      const sx = Math.floor((sw - cw) / 2), sy = Math.floor((sh - ch) / 2);
      ctx.save();
      ctx.beginPath(); ctx.roundRect(imgX, imgY, imgW, imgH, 12); ctx.clip();
      ctx.drawImage(bossImg, sx, sy, cw, ch, imgX, imgY, imgW, imgH);
      const gg = ctx.createLinearGradient(0, imgY, 0, imgY + imgH);
      gg.addColorStop(0, 'transparent');
      gg.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = gg; ctx.fillRect(imgX, imgY, imgW, imgH);
      ctx.restore();
    }
    game._stageSelectBossCardHit = { x: imgX, y: imgY, w: imgW, h: imgH, src: './assets/boss_burst.png', title: 'WARNING' };

    // コア名
    let y = imgY + imgH + 28;
    ctx.fillStyle = 'rgba(255,160,140,0.92)';
    ctx.font = 'bold 18px Orbitron,Courier New';
    ctx.fillText('BURST CORE', RX + 10, y);

    // 攻撃（タグ形式）
    y += 22;
    const atkPills = ['全方位弾幕', 'レーザー', '追尾'];
    let ax = RX + 10;
    atkPills.forEach(txt => {
      const w = Math.min(170, Math.ceil(ctx.measureText(txt).width + 24));
      ctx.fillStyle = 'rgba(255,80,60,0.14)';
      ctx.strokeStyle = 'rgba(255,80,60,0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(ax, y - 14, w, 22, 11); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,230,220,0.92)';
      ctx.font = 'bold 11px Orbitron,Courier New';
      ctx.fillText(txt, ax + 12, y + 2);
      ax += w + 10;
    });

    // 推奨戦力
    y += 34;
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(RX, y, RW, 1);
    y += 24;
    const recPower = Math.max(80, selStage * 120);
    ctx.fillStyle = 'rgba(255,180,160,0.92)';
    ctx.font = 'bold 13px Orbitron,Courier New';
    ctx.fillText(`推奨 ⚡ ${recPower}`, RX + 10, y);

    // 報酬（強調）
    y += 22;
    ctx.fillStyle = 'rgba(255,80,60,0.16)';
    ctx.strokeStyle = 'rgba(255,80,60,0.25)';
    ctx.beginPath(); ctx.roundRect(RX, y - 14, RW, 42, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,210,190,0.92)'; ctx.font = 'bold 11px Orbitron,Courier New';
    ctx.fillText('報酬', RX + 10, y);
    ctx.fillStyle = 'rgba(255,235,190,0.95)'; ctx.font = 'bold 13px Orbitron,Courier New';
    ctx.fillText('💰 +500   💎10', RX + 58, y);
    ctx.fillStyle = 'rgba(255,235,190,0.62)'; ctx.font = 'bold 10px Orbitron,Courier New';
    ctx.fillText('SSR確定', RX + 210, y);

    // 下部：FUEL + 出撃ボタン（最大サイズ＋点滅）
    const bx = RX, bw = RW, bh = 78;
    const by = Math.min(520, (H - Math.max(12, Math.round(H * 0.03))) - bh);
    const fuelY = by - 10;
    syncFuel();
    const fuelHave = Math.max(0, Math.floor(game.fuel || 0));
    ctx.fillStyle = 'rgba(10,16,34,0.80)';
    ctx.strokeStyle = 'rgba(255,80,60,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, fuelY - 12, bw, 18, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,210,200,0.92)';
    ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.fillText(`FUEL  ${fuelHave}/${drawDeps.FUEL_CAP}`, bx + 10, fuelY);

    const fuelBl = !!game._stageSelectLaunchFuelBlocked;
    const hov = game.hoveredBtn && game.hoveredBtn.id === 'ss_launch' && !fuelBl;
    const blink = 0.70 + 0.30 * Math.sin((Date.now() / 1000) * (Math.PI * 2 / 0.8));
    const s = (hov ? 1.03 : 1) * (0.98 + 0.02 * blink);
    ctx.save();
    ctx.translate(bx + bw / 2, by + bh / 2); ctx.scale(s, s); ctx.translate(-(bx + bw / 2), -(by + bh / 2));
    const g = ctx.createLinearGradient(0, by, 0, by + bh);
    g.addColorStop(0, `rgba(255,50,40,${0.95 * blink})`);
    g.addColorStop(1, `rgba(255,140,60,${0.95 * blink})`);
    ctx.globalAlpha = fuelBl ? 0.48 : 1;
    ctx.fillStyle = g;
    ctx.strokeStyle = fuelBl ? 'rgba(110,95,90,0.55)' : 'rgba(255,210,190,0.90)';
    ctx.lineWidth = 2.4;
    if (fuelBl) ctx.setLineDash([4, 3]); else ctx.setLineDash([]);
    ctx.shadowColor = fuelBl ? 'transparent' : 'rgba(255,70,50,0.85)';
    ctx.shadowBlur = fuelBl ? 0 : ((hov ? 30 : 24) * blink);
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 16); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = fuelBl ? 'rgba(255,210,200,0.90)' : 'rgba(255,255,255,0.95)';
    ctx.font = fuelBl ? 'bold 14px Orbitron,Courier New' : 'bold 22px Orbitron,Courier New'; ctx.textAlign = 'center';
    if (fuelBl) ctx.fillText('燃料が足りません', bx + bw / 2, by + bh / 2 + 8);
    else ctx.fillText('▶ 出撃', bx + bw / 2, by + bh / 2 + 8);
    ctx.restore();

    game._stageSelectLaunchHit = { x: bx, y: by, w: bw, h: bh };
    ctx.textAlign = 'left';
  }
  else {
    // ボスカードが無いステージはヒット領域をクリア
    game._stageSelectBossCardHit = null;
  }

  // MID BOSS は右パネルを専用描画したので、以降の汎用ブロックはスキップ
  if (customRightPanel) {
    // 左マップ描画へ進む（右パネルの汎用要素は描画しない）
  } else {

    // ===== 通常/応用ステージ（1-1〜1-4, 1-6〜1-9）：高速選択UI =====
    if (isNormalStage || isAppliedStage) {
      const isLocked = selStage > game.highestStage;
      const recPower = Math.max(80, selStage * 120);
      const coinMin = 80 + selStage * 8;
      const coinMax = coinMin + 39;
      const gemBase = 3 + Math.floor(selStage / 5);
      const pName = getPlanet(selStage).name;
      const matStr = pName === 'SATURN' ? '💠×2  🔩×3'
        : pName === 'JUPITER' ? '💠×1  🔩×3'
          : '⚡×2  🔩×3';

      // 状態はヘッダー1行に統一済み。未解放のみバッジで補足
      ctx.textAlign = 'center';
      if (isLocked) {
        ctx.font = 'bold 11px Orbitron,Courier New';
        const lt = '🔒 未解放';
        const tw = ctx.measureText(lt).width;
        const badgeW = 36, gapB = 6;
        const totalW = badgeW + gapB + tw;
        const startX = px - totalW / 2;
        ctx.fillStyle = 'rgba(36,40,54,0.92)';
        ctx.strokeStyle = 'rgba(210,220,240,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(startX, 162, badgeW, 22, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(235,240,250,0.92)';
        ctx.font = 'bold 9px Orbitron,Courier New';
        ctx.fillText('LOCK', startX + badgeW / 2, 177);
        ctx.font = 'bold 13px Orbitron,Courier New';
        ctx.fillStyle = 'rgba(210,230,255,0.46)';
        ctx.fillText(lt, startX + badgeW + gapB + tw / 2, 178);
      }

      // 報酬 / 推奨 / ★条件（優先度順・縦ピッチ圧縮）
      const boxX = PANEL_X + 14, boxY = 174, boxW = 300, boxH = 102;
      ctx.fillStyle = 'rgba(8,10,18,0.72)';
      ctx.strokeStyle = 'rgba(120,190,255,0.18)';
      ctx.lineWidth = 1;
      ctx.shadowColor = 'rgba(120,190,255,0.16)';
      ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 10); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;

      const boxPad = 12;
      const innerL = boxX + boxPad;
      const innerR = boxX + boxW - boxPad;
      const row = (i) => boxY + 14 + i * 19;

      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,200,130,0.88)';
      ctx.font = 'bold 10px Orbitron,Courier New';
      ctx.fillText('報酬', innerL, row(0));
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255, 224, 140, 0.98)';
      ctx.font = 'bold 16px Orbitron,Courier New';
      ctx.shadowColor = 'rgba(255, 190, 70, 0.4)';
      ctx.shadowBlur = 5;
      const coinStr = `${coinMin}〜${coinMax}`;
      ctx.fillText(coinStr, innerR - 48, row(0) + 1);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(170, 248, 255, 0.98)';
      ctx.font = 'bold 15px Orbitron,Courier New';
      ctx.fillText(`💎${gemBase}`, innerR, row(0) + 1);
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255, 210, 170, 0.58)';
      ctx.font = 'bold 10px Orbitron,Courier New';
      ctx.fillText(matStr, innerL, row(1));

      ctx.fillStyle = 'rgba(170,205,250,0.72)';
      ctx.font = 'bold 11px Orbitron,Courier New';
      ctx.fillText('推奨 ⚡', innerL, row(2));
      ctx.fillStyle = 'rgba(235,248,255,0.94)';
      ctx.font = 'bold 13px Orbitron,Courier New';
      ctx.textAlign = 'right';
      ctx.fillText(String(recPower), innerR, row(2) + 1);

      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(200, 220, 245, 0.55)';
      ctx.font = 'bold 9px Orbitron,Courier New';
      ctx.fillText('★ 条件', innerL, row(3) - 2);
      {
        const chipY = row(3) + 8;
        const chips = [
          { t: '★1 クリア' },
          { t: '★2 Cmb5' },
          { t: '★3 無傷' },
        ];
        const gapC = 5;
        const cw = (boxW - 2 * boxPad - gapC * (chips.length - 1)) / chips.length;
        let cxChip = innerL;
        chips.forEach((c) => {
          ctx.fillStyle = 'rgba(100, 150, 210, 0.14)';
          ctx.strokeStyle = 'rgba(140, 190, 255, 0.22)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.roundRect(cxChip, chipY - 11, cw, 19, 7); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(220, 235, 255, 0.82)';
          ctx.font = 'bold 9px Orbitron,Courier New';
          ctx.textAlign = 'center';
          ctx.fillText(c.t, cxChip + cw / 2, chipY + 3);
          cxChip += cw + gapC;
        });
      }
      ctx.textAlign = 'center';
      game._stageSelectInfoBottomY = boxY + boxH;
    }
    else {
      // フォールバック（通常／応用／中ボス／本ボス以外はほぼ無い）。状態はヘッダーに統一済み
      ctx.fillStyle = world.accent + '28'; ctx.fillRect(PANEL_X + 12, 258, 304, 1);

      const isLocked = selStage > game.highestStage;
      if (isLocked) {
        ctx.font = 'bold 12px Orbitron,Courier New';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(180, 195, 220, 0.75)';
        ctx.fillText(`ステージ${selStage - 1}をクリアして解放`, px, 278);
      }

      // 推奨戦力 / 報酬（目安）ミニ行
      {
        const recPower = Math.max(80, selStage * 120);
        // ボス撃破時の報酬ロジック（killBoss）に合わせた目安表示
        const coinMin = 80 + selStage * 8;
        const coinMax = coinMin + 39;
        const gemBase = 3 + Math.floor(selStage / 5);
        const pName = getPlanet(selStage).name;
        const matStr = pName === 'SATURN' ? '💠×2  🔩×3'
          : pName === 'JUPITER' ? '💠×1  🔩×3'
            : '⚡×2  🔩×3';
        const note = (selStage > 1 && !isLocked) ? `★ ステージ${selStage}から開始` : '';

        // 右情報パネル内で「報酬」が詰まりやすいので2段にして読みやすくする
        const boxX = PANEL_X + 12, boxY = 316, boxW = 304, boxH = note ? 72 : 52;
        ctx.fillStyle = 'rgba(10,14,26,0.78)';
        ctx.strokeStyle = world.accent + '55';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 6); ctx.fill(); ctx.stroke();

        ctx.fillStyle = 'rgba(170,205,250,0.70)';
        ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'left';
        ctx.fillText('推奨 ⚡', boxX + 10, boxY + 15);
        ctx.fillStyle = 'rgba(235,248,255,0.92)';
        ctx.font = 'bold 12px Orbitron,Courier New';
        ctx.fillText(String(recPower), boxX + 56, boxY + 15);

        ctx.fillStyle = 'rgba(170,205,250,0.62)';
        ctx.font = 'bold 10px Orbitron,Courier New';
        ctx.fillText('報酬', boxX + 120, boxY + 15);

        // 1段目: コイン/ジェム
        ctx.fillStyle = 'rgba(255,235,190,0.92)';
        ctx.font = 'bold 11px Orbitron,Courier New';
        ctx.fillText(`●${coinMin}〜${coinMax}  💎${gemBase}`, boxX + 160, boxY + 15);
        // 2段目: 素材（少し控えめ）
        ctx.fillStyle = 'rgba(255,235,190,0.75)';
        ctx.font = 'bold 10px Orbitron,Courier New';
        ctx.fillText(matStr, boxX + 160, boxY + 32);

        if (note) {
          ctx.fillStyle = '#ff8800';
          ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'center';
          ctx.fillText(note, px, boxY + 50);
          ctx.textAlign = 'left';
        }

        // この下から敵プレビューを開始する
        game._stageSelectInfoBottomY = boxY + boxH;
      }
    }

    // ===== 右パネル下部（燃料 + 出撃準備ボタン）レイアウトを先に確定 =====
    const bx = PANEL_X + 16, bw = 288, bh = 60;
    const footerPad = Math.max(6, Math.round(H * 0.016));
    const bottomY = H - footerPad;
    const by = bottomY - bh;
    const fuelLineY = by - 10;

    // ===== 敵プレビュー =====
    const _infoBottom = Number.isFinite(game._stageSelectInfoBottomY) ? game._stageSelectInfoBottomY : 402;
    const typesPre = drawDeps.getStageEnemyTypes(selStage);
    const enemyBlockNeed = ((isNormalStage || isAppliedStage) ? 64 : 88) + Math.max(0, typesPre.length - 4) * 8;
    const zoneTop = _infoBottom + 3;
    const zoneBot = fuelLineY - 16;
    const slack = Math.max(0, zoneBot - zoneTop - enemyBlockNeed);
    const enemyTop = Math.max(258, Math.min(zoneBot - enemyBlockNeed - 2, zoneTop + Math.floor(slack * 0.22)));
    ctx.fillStyle = world.accent + '24'; ctx.fillRect(PANEL_X + 18, enemyTop, 300, 1);
    ctx.fillStyle = 'rgba(215, 230, 250, 0.88)';
    ctx.font = 'bold 10px Orbitron,Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('出現する敵', px, enemyTop + 13);
    {
      const types = typesPre;
      const danger = { bomber: 1, sniper: 1, heavy: 1 };
      const maxIconBottom = fuelLineY - 16;
      const tight = (maxIconBottom - (enemyTop + 18)) < 76;
      const bigIcons = (isNormalStage || isAppliedStage);
      let iconSize = bigIcons ? (tight ? 22 : 26) : (tight ? 20 : 24);
      if (types.length >= 5) iconSize = Math.max(19, iconSize - 2);
      if (types.length >= 6) iconSize = Math.max(18, iconSize - 2);
      const trackL = PANEL_X + 14, trackW = 300;
      types.forEach((t, i) => {
        const areaTop = enemyTop + 20 + iconSize * 0.35;
        const lblH = (isNormalStage || isAppliedStage) ? 11 : 14;
        const gapAboveFuel = 8;
        const iconBottom = maxIconBottom - gapAboveFuel;
        const ey = Math.max(areaTop, iconBottom - lblH - iconSize * 0.72);
        const ex = trackL + (trackW / (types.length + 1)) * (i + 1);
        const tc = drawDeps.ENEMY_PREVIEW_COLORS[t] || '#aaa';
        const isDanger = !!danger[t];
        ctx.save();
        ctx.translate(ex, ey);
        if (isDanger) {
          ctx.strokeStyle = 'rgba(255, 120, 90, 0.55)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, iconSize * 0.52, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.shadowColor = tc;
        ctx.shadowBlur = isDanger ? 12 : 7;
        ctx.fillStyle = tc;
        drawDeps.drawEnemyPreviewIcon(ctx, t, iconSize);
        ctx.shadowBlur = 0;
        ctx.restore();
        const lbl = drawDeps.ENEMY_PREVIEW_LABELS[t] || t;
        const short = String(lbl).slice(0, 4);
        ctx.fillStyle = isDanger ? 'rgba(255, 200, 170, 0.72)' : 'rgba(170, 200, 235, 0.42)';
        ctx.font = 'bold 8px Orbitron,Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(short, ex, ey + iconSize + 10);
      });
    }
    ctx.textAlign = 'left';

    // 出撃準備ボタン（パネル下部・大）
    {
      const isLocked = (game.stageSelectIdx + 1) > game.highestStage;
      // 燃料（スタミナ）表示：右パネルにも出す
      syncFuel();
      const fuelHave = Math.max(0, Math.floor(game.fuel || 0));
      // FUELを"判断材料"に（少し太く、満タンで光る / 不足で赤点滅）
      const fuelH = 26;
      const fuelNeed = (typeof drawDeps.FUEL_COST_PER_RUN === 'number' ? drawDeps.FUEL_COST_PER_RUN : 1);
      const fuelOk = (fuelHave >= fuelNeed);
      const full = (fuelHave >= drawDeps.FUEL_CAP);
      const blink = (!fuelOk) ? (0.55 + 0.45 * Math.sin((Date.now() / 1000) * (Math.PI * 2 / 0.8))) : 1;
      ctx.fillStyle = 'rgba(10,16,34,0.86)';
      ctx.strokeStyle = (!fuelOk) ? `rgba(255,80,60,${0.55 * blink})` : (full ? 'rgba(120,255,190,0.42)' : 'rgba(90,170,255,0.38)');
      ctx.lineWidth = 1;
      ctx.shadowColor = full ? 'rgba(120,255,190,0.35)' : (!fuelOk ? `rgba(255,80,60,${0.45 * blink})` : 'transparent');
      ctx.shadowBlur = full ? 10 : (!fuelOk ? 12 * blink : 0);
      ctx.beginPath(); ctx.roundRect(bx, fuelLineY - 16, bw, fuelH, 7); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(210,240,255,0.95)';
      ctx.font = 'bold 14px Orbitron,Courier New';
      ctx.textAlign = 'left';
      // タイマーはHUD側に寄せ、右パネルは数値だけにする
      ctx.fillText(`⛽ FUEL  ${fuelHave}/${drawDeps.FUEL_CAP}`, bx + 10, fuelLineY + 1);
      ctx.textAlign = 'left';

      // 出撃ボタン：通常は落ち着く / hoverで強発光 + 1.05 / clickで縮む
      const fuelBl = !!game._stageSelectLaunchFuelBlocked;
      const launchDisabled = isLocked || fuelBl;
      const pulse = isLocked ? 1 : 0.8 + Math.sin(game.frameCount * 0.09) * 0.2;
      // クリック時：一瞬縮む（0.95）→戻る
      const e2 = game.frameCount - ((game.uiLastTap && game.uiLastTap.id === 'ss_launch') ? game.uiLastTap.frame : -999);
      const clickScale = (e2 >= 0 && e2 < 10) ? (0.95 + 0.05 * (e2 / 10)) : 1;
      const hov = (game.hoveredBtn && game.hoveredBtn.id === 'ss_launch') && !launchDisabled;
      const weakGlow = (isNormalStage || isAppliedStage) ? 0.40 : 0.80;
      const hovGlow = hov ? 1.35 : 1;
      ctx.save();
      const hovScale = hov ? 1.05 : 1;
      ctx.translate(bx + bw / 2, by + bh / 2);
      ctx.scale(clickScale * hovScale, clickScale * hovScale);
      ctx.translate(-(bx + bw / 2), -(by + bh / 2));
      ctx.fillStyle = isLocked ? 'rgba(20,20,20,0.7)' : (fuelBl ? 'rgba(28,24,22,0.78)' : 'rgba(0,40,80,0.88)');
      ctx.strokeStyle = isLocked ? '#333' : (fuelBl ? 'rgba(130,100,90,0.55)' : world.accent);
      ctx.lineWidth = isLocked ? 1 : 2;
      ctx.shadowColor = isLocked || fuelBl ? 'transparent' : world.accent;
      ctx.shadowBlur = isLocked || fuelBl ? 0 : 12 * pulse * weakGlow * hovGlow;
      if (isLocked) ctx.setLineDash([6, 5]);
      else if (fuelBl) ctx.setLineDash([3, 3]);
      else ctx.setLineDash([]);
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 12); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0;
      ctx.fillStyle = isLocked ? '#444' : (fuelBl ? 'rgba(255,210,200,0.90)' : world.accent);
      ctx.textAlign = 'center';
      if (isLocked) {
        ctx.font = 'bold 14px Orbitron,Courier New';
        ctx.fillText('🔒 未解放', bx + bw / 2, by + bh / 2 + 2);
        ctx.font = 'bold 9px Orbitron,Courier New';
        ctx.fillStyle = 'rgba(200,210,230,0.88)';
        ctx.fillText('LOCK', bx + bw / 2, by + bh / 2 + 16);
      } else if (fuelBl) {
        ctx.font = 'bold 14px Orbitron,Courier New';
        ctx.fillText('燃料が足りません', bx + bw / 2, by + bh / 2 + 7);
      } else {
        ctx.font = 'bold 18px Orbitron,Courier New';
        ctx.fillText('▶  出撃', bx + bw / 2, by + bh / 2 + 7);
      }
      ctx.restore();
      game._stageSelectLaunchHit = isLocked ? null : { x: bx, y: by, w: bw, h: bh };
    }

  } // end: !customRightPanel

  // 右パネルのフェード（globalAlpha）をここで閉じる
  ctx.restore(); // right panel fade group

  // ===== 左：ステージマップ（ゲームっぽい没入感）=====
  // 仕様: 縦ジグザグ 1→2→3→4→5（5はボスを中央に）
  {
    const leftW = PANEL_X;
    const cx = leftW / 2;
    const scrollY = Math.max(0, Number.isFinite(game.stageMapScrollOffset) ? game.stageMapScrollOffset : 0);
    // 上部の空白を進行エリアにする（余白広め）
    const topY = Math.max(96, Math.min(140, Math.round(H * 0.16)));
    const bottomPad = 108;
    // 空間の間延び対策：縦間隔を少し詰める（-10〜15%） + 左右振れ幅を少し広げる
    const vGap = Math.max(86, Math.min(124, Math.floor((H - topY - bottomPad) / 4) * 0.88));
    const zigX = Math.max(80, Math.min(132, Math.floor(leftW * 0.27)));
    const leftX = cx - zigX;
    const rightX = cx + zigX;
    const rNode = 27;
    const rSel = 32;
    const pulse = 0.55 + 0.45 * Math.sin(game.frameCount * 0.08);
    const enterAt = Number.isFinite(game.stageSelectEnterAt) ? game.stageSelectEnterAt : game.frameCount;
    const enterT = Math.max(0, Math.min(1, (game.frameCount - enterAt) / 45)); // 0.75秒くらいで描ききる
    const nodeStaggerT = (i) => Math.max(0, Math.min(1, ((game.frameCount - enterAt) - (i * 6)) / 18)); // 0.2秒ずつ

    const worldStart = (Math.floor((selStage - 1) / 10)) * 10 + 1;
    const local = ((selStage - 1) % 10) + 1;
    const groupStart = worldStart + Math.floor((local - 1) / 5) * 5; // 1..5, 6..10
    const stages = [0, 1, 2, 3, 4].map(i => groupStart + i);
    // 1-5 は中間ボス、1-10 がボス（ページの最後ノードがどちらかは local で判定）
    const bossStage = groupStart + 4;
    const bossLocal = ((bossStage - 1) % 10) + 1;
    const isBossNode = (bossLocal === 10);
    const isMidBossNode = (bossLocal === 5);
    const nextStage = Math.min(groupStart + 4, Math.max(selStage + 1, selStage));

    // ヒット判定を記録（クリック用）
    game._stageSelectNodeHits = [];

    // 火星 1-1〜1-10：左パネル専用背景（縦構図を cover で敷く）＋ごく弱い動き
    if (world.num === 1) {
      const bgImg = drawDeps.getImage('./assets/stage-select-world1-left.png');
      if (bgImg.complete && bgImg.naturalWidth > 0) {
        const nw = bgImg.naturalWidth, nh = bgImg.naturalHeight;
        const scale = Math.max(leftW / nw, H / nh);
        const dw = nw * scale, dh = nh * scale;
        const dx = (leftW - dw) / 2;
        const dy = (H - dh) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, leftW, H);
        ctx.clip();
        ctx.drawImage(bgImg, 0, 0, nw, nh, dx, dy, dw, dh);
        ctx.restore();
        // 上乗せアニメ（ノードより下層・操作の邪魔にならない程度）
        {
          const t = game.frameCount * 0.017;
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, leftW, H);
          ctx.clip();
          ctx.globalCompositeOperation = 'screen';
          const sweep = (t * 26) % (leftW + 140) - 70;
          const sh = ctx.createLinearGradient(sweep, 0, sweep + 100, 0);
          sh.addColorStop(0, 'rgba(255,255,255,0)');
          sh.addColorStop(0.5, 'rgba(255, 150, 110, 0.055)');
          sh.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = sh;
          ctx.fillRect(0, 0, leftW, H);
          const bob = Math.sin(t * 0.55) * 0.06;
          const rg = ctx.createRadialGradient(
            leftW * (0.52 + 0.08 * Math.sin(t * 0.31)),
            H * (0.58 + bob),
            0,
            leftW * 0.5,
            H * 0.55,
            leftW * 0.72
          );
          rg.addColorStop(0, `rgba(100, 210, 255, ${0.045 + 0.025 * Math.sin(t * 0.85)})`);
          rg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = rg;
          ctx.fillRect(0, 0, leftW, H);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.4;
          for (let i = 0; i < 12; i++) {
            const seed = i * 19.091;
            const px = (Math.sin(t * 0.38 + seed) * 0.5 + 0.5) * (leftW - 10) + 5;
            const py = (Math.sin(t * 0.27 + seed * 1.4) * 0.5 + 0.5) * (H - 10) + 5;
            const r = 0.6 + 0.55 * Math.sin(t * 2.1 + i * 0.7);
            ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 200, 170, 0.95)' : 'rgba(170, 230, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
        const edge = ctx.createLinearGradient(leftW - 40, 0, leftW, 0);
        edge.addColorStop(0, 'rgba(0,0,0,0)');
        edge.addColorStop(1, 'rgba(0,0,0,0.42)');
        ctx.fillStyle = edge;
        ctx.fillRect(leftW - 40, 0, 40, H);
        // ノード可読性：周辺をわずかに落とすビネット（中央は開ける）
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, leftW, H);
        ctx.clip();
        const vx = leftW * 0.48, vy = H * 0.42;
        const vg = ctx.createRadialGradient(vx, vy, leftW * 0.12, vx, vy, leftW * 0.92);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(0.65, 'rgba(0,0,0,0.12)');
        vg.addColorStop(1, 'rgba(0,0,0,0.38)');
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, leftW, H);
        ctx.restore();
      }
    }

    // 背景HUD（左上：ワールド名 + 最高到達）
    ctx.shadowColor = world.accent; ctx.shadowBlur = 18;
    ctx.fillStyle = world.accent; ctx.font = 'bold 18px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.fillText(world.name, 18, 30); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(200,220,255,0.58)'; ctx.font = '11px Orbitron,Courier New';
    ctx.fillText(`最高到達: ${formatStageId(game.highestStage)}`, 18, 50);

    // 戻るボタン（左下固定）
    {
      const bx = 10, by = H - 44, bw = 100, bh = 30;
      const hov = game.hoveredBtn?.id === 'ss_back';
      ctx.save();
      ctx.fillStyle = hov ? 'rgba(30,40,60,0.95)' : 'rgba(10,14,24,0.80)';
      ctx.strokeStyle = hov ? 'rgba(120,180,255,0.70)' : 'rgba(80,110,160,0.40)';
      ctx.lineWidth = 1;
      ctx.shadowColor = hov ? 'rgba(100,160,255,0.50)' : 'transparent';
      ctx.shadowBlur = hov ? 10 : 0;
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = hov ? 'rgba(180,220,255,0.95)' : 'rgba(140,175,220,0.70)';
      ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('◀ 銀河マップ', bx + bw / 2, by + bh / 2 + 4);
      ctx.restore();
      game._stageSelectBackHit = { x: bx, y: by, w: bw, h: bh };
    }

    // ノード座標（線が六角形の中に入らないよう半径も持たせる）
    const totalH = vGap * 4;
    const nodePos = stages.map((s, i) => {
      const isSel = s === selStage;
      const localS = ((s - 1) % 10) + 1;
      const isMidBoss = (localS === 5);
      const isFinalBoss = (localS === 10);
      const mul = isFinalBoss ? 1.5 : (isMidBoss ? 1.2 : 1); // MID=1.2 / BOSS=1.5
      const shape = (isMidBoss || isFinalBoss) ? 'star' : 'hex';
      const t = i / 4;
      // 上は詰め、下は広げる（扇状の導線）。y は全体距離を維持しつつ少しイージング
      const y = topY + (t * t * 0.12 + t * 0.88) * totalH;
      // 左右交互 + 軽いカーブ（世界観）
      const fan = (0.90 + 0.34 * t);
      const sway = Math.sin((t * 1.15 + 0.15) * Math.PI) * 10;
      // 左右を完全対称にしない（±20px程度のゆらぎ：ステージで決定）
      const jitter = ((Math.sin(s * 12.9898) * 0.5 + 0.5) * 2 - 1) * 20;
      const x = (i === 4) ? (cx + jitter * 0.25) : (((i % 2 === 0) ? (leftX * fan) : (rightX * fan)) + sway * (i % 2 === 0 ? -1 : 1) + jitter);
      return { stage: s, local: localS, x, y, r: (isSel ? rSel : rNode) * mul, shape };
    });
    const bossPos = nodePos[nodePos.length - 1];

    // スクロール範囲（左マップのみ）
    const mapTop = topY - 72;
    const mapBottom = nodePos[nodePos.length - 1].y + 110;
    const maxScroll = Math.max(0, Math.floor(mapBottom - (H - 72)));
    game._stageSelectMapMaxScroll = maxScroll;
    const clampedScroll = Math.max(0, Math.min(maxScroll, scrollY));
    if (clampedScroll !== scrollY) game.stageMapScrollOffset = clampedScroll;

    // スナップ（ホイール/ドラッグ後にノード単位で止まる）
    if (game._stageSelectMapSnapAt && Date.now() >= game._stageSelectMapSnapAt) {
      game._stageSelectMapSnapAt = 0;
      const targetStage = game.stageSelectIdx + 1;
      const n = nodePos.find(p => p.stage === targetStage) || nodePos[0];
      const want = n.y - (H * 0.42);
      game.stageMapScrollOffset = Math.max(0, Math.min(maxScroll, Math.round(want)));
    }

    // 進行レーンは残し、START/GOAL テキストは非表示にする

    // マップ描画はスクロールさせる
    ctx.save();
    ctx.translate(0, -clampedScroll);

    // ボス直前の緊張感：背景をほんの少し暗く（約5%）
    {
      const bossIsNext = (game.highestStage === bossStage - 1);
      const bossSelected = (selStage === bossStage);
      if (bossIsNext || bossSelected) {
        const blink = (bossSelected ? (0.70 + 0.30 * Math.sin((Date.now() / 1000) * (Math.PI * 2 / 0.8))) : 1);
        ctx.save();
        ctx.globalAlpha = 0.05 * (bossSelected ? blink : 1);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, mapTop, leftW, (mapBottom - mapTop));
        ctx.restore();
      }
    }
    // 中央の薄いグラデ帯（進行レーン）。火星の写真背景時は省略して被りを避ける
    if (world.num !== 1) {
      const laneW = 116;
      const y0 = mapTop, y1 = mapBottom;
      const g = ctx.createLinearGradient(cx, y0, cx, y1);
      // 強度を少し上げる（+10〜15%）
      g.addColorStop(0, 'rgba(70,160,255,0.075)');
      g.addColorStop(0.45, 'rgba(255,200,90,0.062)');
      g.addColorStop(1, 'rgba(255,90,70,0.075)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(cx - laneW / 2, y0, laneW, (y1 - y0), 40);
      ctx.fill();
      // うっすら星パーティクル + パララックス（スクロールで少し動く）
      const par = (clampedScroll * 0.08);
      const seed = ((groupStart * 9197) ^ 0x9e3779b9) >>> 0;
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = 'rgba(220,240,255,0.22)';
      for (let k = 0; k < 28; k++) {
        const rx = (Math.sin(seed + k * 12.17) * 0.5 + 0.5) * laneW + (cx - laneW / 2);
        const ry = (Math.sin(seed + k * 5.31 + 1.7) * 0.5 + 0.5) * (y1 - y0) + y0;
        const yy = ry + ((k % 3) - 1) * par;
        ctx.fillRect(rx, yy, 1.2, 1.2);
      }
      ctx.restore();
    }

    // ライン描画（ベジェ + グラデ + 進行方向の流れ）。火星写真時は細めで背景と競合しない
    const flowLineMul = world.num === 1 ? 0.74 : 1;
    function drawFlowLine(x1, y1, x2, y2, colA, colB, active = false, dashed = false, curve = 0, progressed = false, isBossPath = false) {
      ctx.save();
      if (dashed) ctx.setLineDash([10, 8]);
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      g.addColorStop(0, colA);
      g.addColorStop(1, colB);
      ctx.strokeStyle = active ? g : (dashed ? 'rgba(200,220,255,0.06)' : 'rgba(255,255,255,0.04)');
      const lwA = active ? (isBossPath ? 6.2 : 5) : (isBossPath ? 4.2 : 3);
      ctx.lineWidth = lwA * flowLineMul;
      if (active) {
        ctx.shadowColor = colB;
        ctx.shadowBlur = (isBossPath ? 22 : 18) * (world.num === 1 ? 0.85 : 1);
      }
      const dx = x2 - x1, dy = y2 - y1;
      const ex = x1 + dx * enterT, ey = y1 + dy * enterT;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const cx2 = mx, cy2 = my + curve;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx2, cy2, ex, ey);
      ctx.stroke();
      if (progressed) {
        const fast = active ? (isBossPath ? 1.55 : 1.35) : (isBossPath ? 1.2 : 1.0);
        const sp = 0.0105 * fast;
        const streams = isBossPath ? 4 : 2;
        for (let si = 0; si < streams; si++) {
          const t0 = ((game.frameCount * sp + si * (0.22 / streams)) % 1);
          const t = 0.5 - 0.5 * Math.cos(Math.PI * t0);
          const px = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx2 + t * t * x2;
          const py = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy2 + t * t * y2;
          const pr = (isBossPath ? 3.2 : 2.6) - si * 0.25;
          ctx.globalAlpha = active ? (0.55 + 0.25 * (1 - t)) : 0.32;
          ctx.fillStyle = colB;
          ctx.shadowColor = colB;
          ctx.shadowBlur = isBossPath ? 14 : 10;
          ctx.beginPath();
          ctx.arc(px, py, pr, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        if (world.num !== 1) {
          const t0 = (game.frameCount * sp) % 1;
          const t = 0.5 - 0.5 * Math.cos(Math.PI * t0);
          const px = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx2 + t * t * x2;
          const py = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy2 + t * t * y2;
          ctx.globalAlpha = 0.16;
          ctx.strokeStyle = colA;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px, py - 6);
          ctx.lineTo(px, py + 6);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
    }

    for (let i = 0; i < nodePos.length - 1; i++) {
      const a = nodePos[i], b = nodePos[i + 1];
      const isActive = (a.stage <= game.highestStage && b.stage <= game.highestStage);
      const progressed = (b.stage <= game.highestStage); // 現在地まで（含む）
      const isLast = (b.stage === bossStage);
      const toBoss = isLast && isBossNode;
      const toMidBoss = isLast && isMidBossNode;
      let colA; let colB;
      if (toBoss) {
        colA = 'rgba(255, 155, 110, 0.99)';
        colB = 'rgba(255, 72, 42, 0.99)';
      } else if (toMidBoss) {
        colA = 'rgba(255,190,120,0.95)';
        colB = 'rgba(255,120,60,0.95)';
      } else {
        colA = 'rgba(255,200,90,0.95)';
        colB = 'rgba(255,120,40,0.95)';
      }
      // 線はノードの縁まで（六角形の中に入れない）
      {
        const p1 = (a.shape === 'hex')
          ? drawDeps.hexBoundaryPoint(a.x, a.y, a.r || rNode, b.x, b.y)
          : drawDeps.circleBoundaryPoint(a.x, a.y, a.r || rNode, b.x, b.y);
        const p2 = (b.shape === 'hex')
          ? drawDeps.hexBoundaryPoint(b.x, b.y, b.r || rNode, a.x, a.y)
          : drawDeps.circleBoundaryPoint(b.x, b.y, b.r || rNode, a.x, a.y);
        const x1 = p1.x, y1 = p1.y;
        const x2 = p2.x, y2 = p2.y;
        // ボス導線：点線ではなく発光実線 + 収束感
        const dashed = false;
        // ジグザグに合わせて曲率を左右方向に付ける（ボスは中央へ吸い込む）
        const dir = (b.x - a.x);
        const baseCurve = toBoss ? 0 : (toMidBoss ? -10 : -18);
        const curve = (toBoss || toMidBoss) ? baseCurve : ((dir >= 0) ? -26 : 26);
        drawFlowLine(x1, y1, x2, y2, colA, colB, isActive, dashed, curve, progressed, (toBoss || toMidBoss));
        // 収束エフェクト（最後だけ、光が集まる）
        if ((toBoss || toMidBoss) && (isActive || progressed)) {
          const tt = (game.frameCount * 0.06) % (Math.PI * 2);
          ctx.save();
          ctx.shadowColor = colB;
          ctx.shadowBlur = toBoss ? 24 : 20;
          ctx.globalAlpha = toBoss ? 0.72 : 0.62;
          for (let p = 0; p < 7; p++) {
            const a = tt + p * 0.95;
            const rr = 10 + p * 2.8;
            ctx.fillStyle = colB;
            ctx.beginPath();
            ctx.arc(x2 + Math.cos(a) * rr, y2 + Math.sin(a) * rr, toBoss ? 2.0 : 1.7, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
    }

    // ノード描画
    nodePos.forEach((n, i) => {
      const s = n.stage;
      const cleared = s < game.highestStage;
      const current = s === game.highestStage;
      const next = s === game.highestStage + 1;
      const locked = s > game.highestStage + 1;
      const selected = (s === selStage);
      const local = n.local || ((s - 1) % 10) + 1;
      const isNormal = (local >= 1 && local <= 4);
      const isApplied = (local >= 6 && local <= 9);

      let fill = 'rgba(10,10,24,0.95)';
      let stroke = 'rgba(255,120,80,0.45)';
      let glow = 'transparent';
      let glowBlur = 0;
      let label = '';
      let labelCol = 'rgba(255,255,255,0.75)';

      if (cleared) {
        fill = 'rgba(0, 26, 12, 0.82)';
        stroke = 'rgba(40, 255, 130, 0.72)';
      }
      if (current) {
        glow = 'rgba(255,70,50,0.95)';
        glowBlur = 28 * pulse;
        stroke = 'rgba(255, 85, 55, 0.98)';
        label = '現在地';
        labelCol = 'rgba(255,110,75,0.98)';
      } else if (next) {
        if (local === 10) {
          label = 'NEXT BOSS';
          labelCol = 'rgba(255, 88, 48, 1)';
          glow = 'rgba(255, 100, 55, 0.95)';
          glowBlur = 26 * (0.62 + 0.38 * pulse);
          stroke = 'rgba(255, 120, 65, 0.98)';
        } else {
          label = 'NEXT';
          labelCol = 'rgba(255, 230, 140, 0.98)';
          glow = 'rgba(255, 190, 70, 0.92)';
          glowBlur = 20 * (0.7 + 0.3 * pulse);
          stroke = 'rgba(255, 200, 90, 0.95)';
        }
      } else if (selected && !locked) {
        label = '選択中';
        labelCol = 'rgba(200, 245, 255, 0.92)';
      }
      if (locked) {
        // 未解放はさらに暗く（-30%輝度イメージ）
        fill = 'rgba(4,4,10,0.88)';
        stroke = 'rgba(70,80,110,0.28)';
      }
      // 応用ステージは少しだけ硬質に（通常はシンプル）
      if (isApplied && !locked && !cleared && !current && !next) {
        stroke = 'rgba(255,170,110,0.55)';
        fill = 'rgba(14,10,8,0.90)';
      }
      // 通常ノードは少し暗め・発光弱め（ランク差の底上げ）
      if (isNormal && !locked && !cleared && !current && !next) {
        fill = 'rgba(6,6,16,0.95)';
        stroke = 'rgba(160,190,255,0.18)';
      }
      // 5番目ノードは「中間ボス」か「ボス」になる
      const isLastNode = (s === bossStage);
      const isMidBoss = isLastNode && isMidBossNode;
      const isFinalBoss = isLastNode && isBossNode;
      if (isMidBoss) {
        stroke = 'rgba(255,140,60,0.90)';
        glow = 'rgba(255,140,60,0.70)';
        glowBlur = 18 * (0.7 + 0.3 * pulse);
      }
      if (isFinalBoss) {
        stroke = 'rgba(255,70,50,0.95)';
        glow = 'rgba(255,70,50,0.85)';
        glowBlur = 22 * (0.7 + 0.3 * pulse);
      }

      // 現在地：脈動（scale 1.0 ↔ 1.05）
      const pulseScale = (current || isMidBoss || isFinalBoss)
        ? (1.0 + 0.05 * (0.5 + 0.5 * Math.sin(game.frameCount * 0.10)))
        : 1;
      const rr = (n.r || ((s === selStage) ? rSel : rNode)) * pulseScale;
      const fade = nodeStaggerT(i);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(n.x, n.y);
      // ボス演出：薄いレーダーリング（控えめ）
      if (isMidBoss || isFinalBoss) {
        const ringR = rr + 20;
        const ang = game.frameCount * (isFinalBoss ? 0.013 : 0.015);
        ctx.save();
        ctx.globalAlpha = (isFinalBoss ? 0.14 : 0.17) + 0.06 * pulse;
        ctx.strokeStyle = isFinalBoss ? 'rgba(255,90,70,0.42)' : 'rgba(255,160,90,0.42)';
        ctx.lineWidth = 1.6;
        ctx.shadowColor = isFinalBoss ? 'rgba(255,70,50,0.35)' : 'rgba(255,140,60,0.35)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, ringR, ang, ang + Math.PI * 1.65);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.08;
        ctx.setLineDash([6, 10]);
        ctx.beginPath();
        ctx.arc(0, 0, ringR + 10, -ang, -ang + Math.PI * 1.8);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha *= 0.7;
        ctx.strokeStyle = isFinalBoss ? 'rgba(255,90,70,0.16)' : 'rgba(255,160,90,0.16)';
        const wave = (game.frameCount * 0.5) % 30;
        ctx.beginPath(); ctx.arc(0, 0, ringR + 18 + wave, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      // 立体風（内側グラデ + 外側グロー）
      const coreG = ctx.createRadialGradient(-rr * 0.25, -rr * 0.35, 2, 0, 0, rr * 1.35);
      if (cleared) {
        coreG.addColorStop(0, 'rgba(80,255,140,0.30)');
        coreG.addColorStop(1, 'rgba(0,40,20,0.85)');
      } else if (locked) {
        coreG.addColorStop(0, 'rgba(120,140,180,0.10)');
        coreG.addColorStop(1, 'rgba(6,6,14,0.85)');
      } else if (current) {
        coreG.addColorStop(0, 'rgba(255,120,90,0.35)');
        coreG.addColorStop(1, 'rgba(30,10,10,0.90)');
      } else if (next) {
        coreG.addColorStop(0, 'rgba(255,230,120,0.25)');
        coreG.addColorStop(1, 'rgba(20,16,6,0.92)');
      } else {
        coreG.addColorStop(0, 'rgba(120,140,200,0.12)');
        coreG.addColorStop(1, fill);
      }
      ctx.shadowColor = glow; ctx.shadowBlur = glowBlur;
      ctx.fillStyle = coreG;
      // 2重枠（内側細線＋外側グロー）
      const lwOuter = (s === selStage) ? 3 : 2;
      ctx.strokeStyle = stroke; ctx.lineWidth = lwOuter;
      // 形状
      if (n.shape === 'star') {
        const inner = rr * 0.48;
        ctx.beginPath(); drawDeps.drawStar(ctx, 0, 0, 5, rr, inner);
        ctx.fill();
      } else {
        ctx.beginPath(); drawDeps.drawHexagon(ctx, 0, 0, rr);
        ctx.fill();
      }
      // 外側グロー
      ctx.save();
      ctx.shadowColor = stroke; ctx.shadowBlur = 10;
      if (n.shape === 'star') {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lwOuter;
        ctx.beginPath(); drawDeps.drawStar(ctx, 0, 0, 5, rr, rr * 0.48); ctx.stroke();
      } else {
        ctx.stroke();
      }
      ctx.restore();
      // 内側細線
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 1;
      if (n.shape === 'star') {
        ctx.beginPath(); drawDeps.drawStar(ctx, 0, 0, 5, rr - 3, (rr - 3) * 0.48); ctx.stroke();
      } else {
        ctx.beginPath(); drawDeps.drawHexagon(ctx, 0, 0, rr - 3); ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // ノイズ質感（軽量）：六角形内に微ドット
      ctx.save();
      if (n.shape === 'star') { ctx.beginPath(); drawDeps.drawStar(ctx, 0, 0, 5, rr - 4, (rr - 4) * 0.48); }
      else { ctx.beginPath(); drawDeps.drawHexagon(ctx, 0, 0, rr - 4); }
      ctx.clip();
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = locked ? 'rgba(180,200,240,0.22)' : current ? 'rgba(255,120,90,0.22)' : next ? 'rgba(255,230,120,0.20)' : 'rgba(200,220,255,0.16)';
      const seed = (s * 9973 + (game.frameCount >> 2) * 17) >>> 0;
      for (let k = 0; k < 28; k++) {
        const rx = ((Math.sin(seed + k * 12.3) * 0.5 + 0.5) * 2 - 1) * (rr - 6);
        const ry = ((Math.sin(seed + k * 5.7 + 2.1) * 0.5 + 0.5) * 2 - 1) * (rr - 6);
        ctx.fillRect(rx, ry, 1, 1);
      }
      ctx.restore();
      ctx.shadowBlur = 0;

      // 選択中：明るい外枠 + 軽い脈動（ロック除外）
      if (selected && !locked) {
        const pul = 0.88 + 0.12 * Math.sin(game.frameCount * 0.13);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = `rgba(210, 250, 255, ${0.42 + 0.2 * pul})`;
        ctx.lineWidth = 2.4;
        ctx.shadowColor = 'rgba(160, 230, 255, 0.45)';
        ctx.shadowBlur = 10 * pul;
        if (n.shape === 'star') {
          ctx.beginPath();
          drawDeps.drawStar(ctx, 0, 0, 5, rr + 5, (rr + 5) * 0.48);
          ctx.stroke();
        } else {
          ctx.beginPath();
          drawDeps.drawHexagon(ctx, 0, 0, rr + 4);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 数字（未解放は交差線→🔒の順で、色以外の手掛かりを付ける）
      const localNum = ((s - 1) % 10) + 1;
      if (locked) {
        ctx.strokeStyle = 'rgba(255,255,255,0.48)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-rr * 0.52, -rr * 0.4); ctx.lineTo(rr * 0.52, rr * 0.4);
        ctx.moveTo(rr * 0.52, -rr * 0.4); ctx.lineTo(-rr * 0.52, rr * 0.4);
        ctx.stroke();
      }
      ctx.fillStyle = locked ? 'rgba(160,180,210,0.25)' : (current ? '#000' : 'rgba(255,255,255,0.85)');
      ctx.font = `bold ${s === selStage ? 15 : 13}px Orbitron,Courier New`; ctx.textAlign = 'center';
      ctx.fillText(locked ? '🔒' : String(localNum), 0, 5);

      // クリアチェック
      if (cleared) {
        ctx.fillStyle = 'rgba(0,255,120,0.95)';
        ctx.font = 'bold 14px Orbitron,Courier New';
        ctx.fillText('✓', -rr + 10, -rr + 14);
      }
      // 中間ボス/ボス：アイコン
      if (isFinalBoss) {
        ctx.fillStyle = 'rgba(255,80,80,0.95)';
        ctx.font = 'bold 16px Orbitron,Courier New';
        ctx.fillText('☠', 0, -2);
      } else if (isMidBoss) {
        ctx.fillStyle = 'rgba(255,160,80,0.95)';
        ctx.font = 'bold 14px Orbitron,Courier New';
        ctx.fillText('⚠', 0, -1);
      }
      ctx.restore();

      // ボスはマークだけ（テキストラベルは出さない）

      // 現在地：外周リングを2重にして、ゆっくり回転＋パルス強化
      if (current) {
        const ringPulse = (0.7 + 0.3 * pulse);
        const ringR = rr + 8 + Math.sin(game.frameCount * 0.05) * 3;
        const ringR2 = ringR + 7;
        ctx.save();
        ctx.globalAlpha = 0.58 + 0.34 * ringPulse;
        ctx.strokeStyle = 'rgba(255,70,50,0.95)';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = 'rgba(255,70,50,0.95)';
        ctx.shadowBlur = 20 * ringPulse;
        // 回転リング（少し回す）
        const ang = game.frameCount * 0.018;
        ctx.beginPath();
        ctx.arc(n.x, n.y, ringR, ang, ang + Math.PI * 1.6);
        ctx.stroke();
        // 2本目（逆回転）
        ctx.globalAlpha *= 0.85;
        ctx.strokeStyle = 'rgba(255,120,90,0.75)';
        ctx.shadowColor = 'rgba(255,120,90,0.75)';
        ctx.shadowBlur = 14 * ringPulse;
        const ang2 = -game.frameCount * 0.014;
        ctx.beginPath();
        ctx.arc(n.x, n.y, ringR2, ang2, ang2 + Math.PI * 1.3);
        ctx.stroke();
        ctx.restore();
      }

      // ラベル（現在地/NEXT / NEXT BOSS）
      if (label) {
        const blink = next ? (0.58 + 0.42 * Math.sin((Date.now() / 1000) * (Math.PI * 2 / 0.75))) : 1;
        const isNextBossLbl = label === 'NEXT BOSS';
        ctx.fillStyle = labelCol;
        ctx.font = isNextBossLbl ? 'bold 13px Orbitron,Courier New' : 'bold 12px Orbitron,Courier New';
        ctx.textAlign = 'center';
        ctx.shadowColor = labelCol;
        ctx.shadowBlur = isNextBossLbl ? 16 : 12;
        ctx.globalAlpha *= blink;
        ctx.fillText(label, n.x, n.y - 46);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      // NEXT：下矢印（▼）
      if (next) {
        const blink = 0.55 + 0.45 * Math.sin((Date.now() / 1000) * (Math.PI * 2 / 0.8));
        ctx.save();
        ctx.globalAlpha = 0.55 * blink;
        ctx.fillStyle = 'rgba(255,230,140,0.92)';
        ctx.font = 'bold 14px Orbitron,Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('▼', n.x, n.y + 64);
        ctx.restore();
      }

      const stars = drawDeps.getStageStarsForMap(s);
      if (stars > 0) {
        ctx.fillStyle = 'rgba(255,220,80,0.92)';
        ctx.shadowColor = 'rgba(255,200,60,0.9)'; ctx.shadowBlur = 10;
        ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText('★'.repeat(stars), n.x, n.y + 44);
        ctx.shadowBlur = 0;
      }

      // 選択中ノード：「もう一度タップで出撃」ヒント
      if (selected && !locked && s <= game.highestStage) {
        const blink = 0.60 + 0.40 * Math.sin((Date.now() / 1000) * (Math.PI * 2 / 1.2));
        ctx.save();
        ctx.globalAlpha = 0.75 * blink;
        ctx.fillStyle = 'rgba(180,240,255,0.92)';
        ctx.font = 'bold 9px Orbitron,Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('▶ タップで出撃', n.x, n.y + (stars > 0 ? 60 : 48));
        ctx.restore();
      }

      // 中ボス／本ボス：マップ上の小型ラベル
      if (isMidBoss || isFinalBoss) {
        const chipW = isFinalBoss ? 102 : 78;
        const chipY = n.y + rr + 48;
        ctx.fillStyle = isFinalBoss ? 'rgba(28, 6, 6, 0.9)' : 'rgba(28, 14, 6, 0.9)';
        ctx.strokeStyle = isFinalBoss ? 'rgba(255, 90, 70, 0.55)' : 'rgba(255, 160, 90, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(n.x - chipW / 2, chipY - 10, chipW, 19, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = isFinalBoss ? 'rgba(255, 210, 200, 0.96)' : 'rgba(255, 220, 180, 0.95)';
        ctx.font = isFinalBoss ? 'bold 8px Orbitron,Courier New' : 'bold 9px Orbitron,Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(isFinalBoss ? 'WARNING / BOSS' : 'MID BOSS', n.x, chipY + 5);
      }

      // NEXT：軽いパーティクル
      if (next) {
        ctx.save();
        const blink = 0.55 + 0.45 * Math.sin((Date.now() / 1000) * (Math.PI * 2 / 0.8));
        ctx.globalAlpha = 0.35 * blink;
        ctx.fillStyle = 'rgba(255,220,120,0.85)';
        for (let p = 0; p < 6; p++) {
          const a = (game.frameCount * 0.08 + p * 1.2);
          const pr = rr + 10 + (p % 3) * 3;
          ctx.beginPath();
          ctx.arc(n.x + Math.cos(a) * pr, n.y + Math.sin(a) * pr, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // ヒット（ロックでも選択だけはできる）— スクロール分を引いて画面座標に合わせる
      game._stageSelectNodeHits.push({ stage: s, x: n.x, y: n.y - clampedScroll, r: rr });
    });

    // 自機：選択ステージのノード付近にスムーズ追従（座標は update-tick）
    {
      const bob = Math.sin(game.frameCount * 0.14) * 2.5;
      const sw = 42, sh = 27;
      const cx = game.stageCharX, cy = game.stageCharY + bob;
      ctx.save();
      ctx.translate(cx, cy);
      const col = drawDeps.SHIP_COLORS[game.shipColorIdx].hex;
      ctx.shadowColor = col;
      ctx.shadowBlur = 16;
      drawShipShape(ctx, -sw / 2, -sh / 2, sw, sh, undefined, col, null);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.88;
      const fh = 3 + Math.sin(game.frameCount * 0.22) * 2;
      ctx.fillStyle = '#f63';
      ctx.fillRect(-5, sh / 2 - 4, 10, fh + 1);
      ctx.fillStyle = '#ffcc66';
      ctx.fillRect(-3, sh / 2 - 2, 6, fh * 0.45);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    ctx.textAlign = 'left';
    ctx.restore(); // scroll group
  }
}
