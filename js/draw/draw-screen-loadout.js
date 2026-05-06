/**
 * Loadout screen drawing (extracted from draw-screens.js)
 */
import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';
import {
  CHAR_POOL,
  EQUIP_POOL,
  PET_POOL,
  RARITY_COLORS,
  WEAPON_GACHA_POOL,
} from '../game-data.js';
import { drawPetShape } from './draw-pet-shape.js';
import { drawEquipShape } from './draw-equip-shape.js';
import { drawShipShape } from './draw-ship-shape.js';
import { drawDragonLordPortrait, isDragonLordChar } from './dragon-lord-portrait.js';
import { hexToRgb } from '../game/color-utils.js';
import { computeTotalStatsForLoadout } from '../game/loadout-stats.js';

let drawDeps;
let applyLevelToAtkMult;
let applyLevelToStatAdd;
let buildEquipPool;
let canPetUpgrade;
let getEquipMainEffectText;
let getLevelUpCost;
let getPetParams;
let getPetUpgradeCost;
let pickCharShipShape;
let upgradeBonusNowNext;

export function setLoadoutScreenDrawDeps(deps) {
  drawDeps = deps;
  ({
    applyLevelToAtkMult,
    applyLevelToStatAdd,
    buildEquipPool,
    canPetUpgrade,
    getEquipMainEffectText,
    getLevelUpCost,
    getPetParams,
    getPetUpgradeCost,
    pickCharShipShape,
    upgradeBonusNowNext,
  } = deps);
}

function drawLoadoutPreview(ctx, px, py, pw, ph, item) {
  const cx = px + pw / 2;
  const rc = RARITY_COLORS[item.rarity] || item.color || '#aaa';

  // Top rarity strip
  ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = rc;
  ctx.beginPath(); ctx.roundRect(px + 1, py + 1, pw - 2, 52, 8); ctx.fill(); ctx.restore();
  ctx.fillStyle = rc; ctx.fillRect(px + 1, py + 1, pw - 2, 3);

  ctx.fillStyle = rc; ctx.shadowColor = rc; ctx.shadowBlur = 6;
  ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.fillText(`[${item.rarity}]`, px + 12, py + 26); ctx.shadowBlur = 0;
  ctx.fillStyle = '#445'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'right';
  ctx.fillText(item.type.toUpperCase(), px + pw - 12, py + 26);

  let equipped = false;
  if (game.loadoutTab === 0) equipped = game.playerLoadout.charId === item.id || (item.id === 'char_basic' && !game.playerLoadout.charId);
  else if (game.loadoutTab === 1) equipped = game.playerLoadout.equip.includes(item.id);
  else if (game.loadoutTab === 2) equipped = game.playerLoadout.pets.includes(item.id);
  else equipped = game.playerLoadout.weaponId === item.id || (item.id === null && !game.playerLoadout.weaponId);
  // 装備中表示は右グリッド側に統一（左プレビューの重複を避ける）

  // ────────────────────────────────────────────────
  // キャラ詳細: レイアウトを4ブロックで再構成（スマホ視認性優先）
  // ①ヘッダー(アイコン/名前/効果) ②メインステ(HP/ATK/DEF) ③サブ情報(Lv/EXP/SPD) ④アクション(別UIボタン)
  // ────────────────────────────────────────────────
  if (game.loadoutTab === 0) {
    const PAD = 8;
    const SECTION_GAP = 24;
    const ROW_GAP = 14;
    const left = px + PAD, right = px + pw - PAD, w = right - left;

    // ① ヘッダー
    const headerTop = py + 60;
    const iconCY = headerTop + 54;
    ctx.save(); ctx.translate(cx, iconCY);
    const photo = isDragonLordChar(item)
      && drawDragonLordPortrait(ctx, 0, 0, 72, 52, {
        glowColor: rc,
        frameCount: game.frameCount,
        tier: 'detail',
      });
    if (!photo) {
      ctx.shadowColor = rc; ctx.shadowBlur = 22;
      ctx.fillStyle = rc;
      drawShipShape(ctx, -34, -20, 68, 40, pickCharShipShape(item), item.color || rc, item.rarity);
      const fl = 5 + Math.sin(game.frameCount * 0.2) * 3;
      ctx.globalAlpha = 0.75; ctx.fillStyle = '#f60'; ctx.fillRect(-12, 22, 10, fl);
      ctx.fillStyle = '#ff0'; ctx.fillRect(-11, 22, 8, fl * 0.5);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // 名前の横にLv表示（装備と同様のルール）
    const inv = game.gachaInventory?.[item.id];
    const lv = inv ? (inv.level || 1) : 1;
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.shadowColor = rc; ctx.shadowBlur = 10;
    ctx.fillText(`${item.label}  Lv${lv}`, cx, headerTop + 118); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(200,220,255,0.68)'; ctx.font = '12px Orbitron,Courier New';
    ctx.fillText(item.desc || '', cx, headerTop + 140);

    // セクション区切り
    let y = headerTop + 140 + SECTION_GAP;
    ctx.strokeStyle = 'rgba(30,40,80,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    y += SECTION_GAP;

    // ② ステータス（現在）
    ctx.fillStyle = 'rgba(255,255,255,0.90)';
    ctx.font = 'bold 13px Orbitron,Courier New';
    ctx.textAlign = 'left';
    ctx.fillText('ステータス', left, y + 2);
    y += 18;

    // メインステータス（HP/ATK/DEF）
    const hpVal = Math.round(item.hp || 0);
    const atkPct = Math.round(((item.atk || 1) - 1) * 100);
    const defVal = Math.round(item.def || 0);
    const mainStats = [
      // 表示形式を統一：ラベル左 / バー中央 / 数値右
      { l: 'HP', v: hpVal, max: 200, c: '#00ff88', r: `${hpVal}` },
      { l: 'ATK', v: atkPct, max: 60, c: '#ff8844', r: `${atkPct >= 0 ? '+' : ''}${atkPct}%` },
      { l: 'DEF', v: defVal, max: 50, c: '#44aaff', r: `${defVal}%` },
    ];
    const barH = 8;
    const rowH = 34;
    mainStats.forEach((s, i) => {
      const ry = y + i * (rowH + ROW_GAP);
      // label/value aligned
      ctx.fillStyle = 'rgba(225,240,255,0.70)'; ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText(s.l, left, ry + 12);
      ctx.fillStyle = s.c; ctx.textAlign = 'right';
      ctx.fillText(s.r, right, ry + 12);
      // 強化直後は増えた分だけを+で強調表示
      try {
        const f = game.lastUpgradeFlash;
        const dt = game.frameCount - (f?.frame || 0);
        if (f && f.id === item.id && dt >= 0 && dt < 90) {
          const ent = f.lines.find(x => x.l === s.l);
          if (ent) {
            const pulse = 0.6 + 0.4 * Math.sin(dt * 0.25);
            ctx.fillStyle = 'rgba(0,255,140,0.85)';
            ctx.shadowColor = 'rgba(0,255,140,0.9)'; ctx.shadowBlur = 10 * pulse;
            ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'right';
            ctx.fillText(ent.d, right, ry + 26);
            ctx.shadowBlur = 0;
          }
        }
      } catch (e) { }
      // bar
      const by = ry + 18;
      ctx.fillStyle = 'rgba(6,8,18,0.95)';
      ctx.beginPath(); ctx.roundRect(left, by, w, barH, 4); ctx.fill();
      const ratio = Math.min(1, Math.max(0, (s.v || 0) / Math.max(1, s.max)));
      const fillW = Math.max(6, w * ratio);
      const g = ctx.createLinearGradient(left, 0, left + w, 0);
      g.addColorStop(0, s.c + '55'); g.addColorStop(1, s.c);
      ctx.fillStyle = g; ctx.shadowColor = s.c; ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.roundRect(left, by, fillW, barH, 4); ctx.fill(); ctx.shadowBlur = 0;
    });
    // ATKの視認性補助（倍率を小さく添える）
    ctx.fillStyle = 'rgba(200,220,255,0.40)'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText(`×${(item.atk || 1).toFixed(1)}`, right, y + 1 * (rowH + ROW_GAP) + 12 + 16);
    y += mainStats.length * (rowH + ROW_GAP) + 16; // DEF→Lvの間隔を最低16px確保

    // 区切り
    ctx.strokeStyle = 'rgba(60,90,150,0.55)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    y += 16;

    // ① 編成合計ステータス & ⑬ 傾向バー（キャラ＋装備）
    try {
      const eqIds = Array.isArray(game.playerLoadout?.equip) ? game.playerLoadout.equip : [null,null,null];
      const hasEquip = eqIds.some(id => !!id);
      const total = computeTotalStatsForLoadout(item.id, eqIds);

      ctx.fillStyle = hasEquip ? 'rgba(120,200,255,0.82)' : 'rgba(200,220,255,0.45)';
      ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText(hasEquip ? '編成合計' : '単体合計', left, y + 11);
      if (hasEquip) {
        ctx.fillStyle = 'rgba(180,210,240,0.40)'; ctx.font = '9px Orbitron,Courier New';
        ctx.fillText('(キャラ+装備)', left + 56, y + 11);
      }
      y += 18;

      const tRows = [
        { l: 'HP',   v: `${total.hp}`,              c: '#00ff88', pct: Math.min(1, total.hp / 300) },
        { l: 'ATK',  v: `×${total.atk.toFixed(2)}`, c: '#ff8844', pct: Math.min(1, (total.atk - 1) / 1.5) },
        { l: 'DEF',  v: `${total.def}%`,             c: '#44aaff', pct: Math.min(1, total.def / 50) },
      ];
      const colW3 = Math.floor((right - left) / 3);
      tRows.forEach((r, i) => {
        const rx = left + i * colW3;
        ctx.fillStyle = 'rgba(200,220,255,0.45)'; ctx.font = '8px Orbitron,Courier New'; ctx.textAlign = 'left';
        ctx.fillText(r.l, rx + 2, y + 9);
        ctx.fillStyle = r.c; ctx.font = 'bold 10px Orbitron,Courier New';
        ctx.fillText(r.v, rx + 2, y + 21);
        const bw = colW3 - 8;
        ctx.fillStyle = 'rgba(6,8,18,0.8)';
        ctx.beginPath(); ctx.roundRect(rx + 2, y + 24, bw, 4, 2); ctx.fill();
        if (r.pct > 0) {
          ctx.fillStyle = r.c; ctx.shadowColor = r.c; ctx.shadowBlur = 3;
          ctx.beginPath(); ctx.roundRect(rx + 2, y + 24, Math.max(3, bw * r.pct), 4, 2); ctx.fill(); ctx.shadowBlur = 0;
        }
      });
    } catch (_) {}

    return;
  }

  // ⑦ 未使用スロットバッジ（装備タブのみ）
  if (game.loadoutTab === 1) {
    const equips = Array.isArray(game.playerLoadout?.equip) ? game.playerLoadout.equip : [null,null,null];
    const slotLabels = ['ATK', 'DEF', 'SP'];
    const empty = slotLabels.filter((_, i) => !equips[i]);
    if (empty.length > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,180,0,0.12)';
      ctx.strokeStyle = 'rgba(255,200,60,0.42)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(px + 10, py + 6, pw - 20, 18, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,210,90,0.88)'; ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText(`⚠ 未装備スロット: ${empty.join('  ')}`, cx, py + 18);
      ctx.restore();
    }
  }

  // Icon area
  // 装備タブは全体を少し上に寄せて、画像〜追加効果〜比較までの間延びを解消
  const equipLift = (game.loadoutTab === 1 ? -12 : 0);
  const iconCY = py + 130 + equipLift;
  ctx.save(); ctx.translate(cx, iconCY);
  ctx.shadowColor = rc; ctx.shadowBlur = 22;
  if (game.loadoutTab === 0) {
    ctx.fillStyle = rc;
    drawShipShape(ctx, -28, -18, 56, 34, pickCharShipShape(item), item.color || rc, item.rarity);
    const fl = 4 + Math.sin(game.frameCount * 0.2) * 3;
    ctx.globalAlpha = 0.7; ctx.fillStyle = '#f60'; ctx.fillRect(-10, 16, 8, fl);
    ctx.fillStyle = '#ff0'; ctx.fillRect(-9, 16, 6, fl * 0.5);
    ctx.globalAlpha = 0.18 + Math.sin(game.frameCount * 0.04) * 0.08;
    ctx.strokeStyle = rc; ctx.lineWidth = 1; ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.ellipse(0, 0, 48, 27, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  } else if (game.loadoutTab === 1) {
    const s = 28 + Math.sin(game.frameCount * 0.08) * 3;
    ctx.save();
    ctx.scale(s / 15, s / 15);
    drawEquipShape(ctx, item, rc, item.rarity);
    ctx.restore();
  } else if (game.loadoutTab === 2) {
    ctx.save();
    ctx.scale(1.12, 1.12);
    drawPetShape(ctx, item.effect, rc, item.rarity);
    ctx.restore();
  } else {
    ctx.fillStyle = rc;
    const wt = item.weapon || 'normal';
    if (wt === 'laser') {
      ctx.fillRect(-4, -28, 8, 38);
      ctx.globalAlpha = 0.35; ctx.fillRect(-12, -22, 24, 5);
    } else if (wt === 'homing') {
      ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(10, 10); ctx.lineTo(0, 4); ctx.lineTo(-10, 10); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#f80';
      ctx.beginPath(); ctx.moveTo(-12, 14); ctx.lineTo(12, 14); ctx.lineTo(0, 30); ctx.closePath(); ctx.fill();
    } else if (wt === 'explosive') {
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.45; ctx.strokeStyle = '#f44'; ctx.lineWidth = 3;
      for (let e = 0; e < 6; e++) {
        const a = e * Math.PI / 3 + game.frameCount * 0.025;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 22); ctx.lineTo(Math.cos(a) * 34, Math.sin(a) * 34); ctx.stroke();
      }
    } else {
      for (let b = -1; b <= 1; b++) {
        ctx.beginPath(); ctx.roundRect(b * 14 - 3, -20, 6, 28, 3); ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.restore();

  ctx.shadowColor = rc; ctx.shadowBlur = 10;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 17px Orbitron,Courier New'; ctx.textAlign = 'center';
  // 装備以外（ペット/武器）は 名前の横にLv表示
  if (game.loadoutTab !== 1) {
    const inv = game.gachaInventory?.[item.id];
    const lv = inv ? (inv.level || 1) : 1;
    ctx.shadowColor = rc; ctx.shadowBlur = 10;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 17px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(`${item.label}  Lv${lv}`, cx, py + 186 + equipLift);
  }
  // 装備は名前表示のルールが別（装備中表示の移設など）
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#999'; ctx.font = '11px Orbitron,Courier New';
  ctx.fillText(item.desc, cx, py + 205 + equipLift);

  // ユーザー要望: 「下に残ってる 装備名+Lv」を、上（タイトル位置）へ移動
  if (game.loadoutTab === 1) {
    try {
      const slotMap = { atk: 0, def: 1, sp: 2 };
      const slotIdx = slotMap[item.slot] ?? 0;
      const curId = Array.isArray(game.playerLoadout?.equip) ? game.playerLoadout.equip[slotIdx] : null;
      const curEq = curId ? EQUIP_POOL.find(e => e.id === curId) : null;
      const curInv = curId ? game.gachaInventory?.[curId] : null;
      if (curEq && curInv) {
        const name = (curEq.label || '').length > 14 ? (curEq.label || '').slice(0, 13) + '…' : (curEq.label || '');
        const crc = RARITY_COLORS[curEq.rarity] || curEq.color || '#aaa';
        ctx.fillStyle = crc; ctx.font = 'bold 14px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.shadowColor = crc; ctx.shadowBlur = 8;
        ctx.fillText(`${name}  Lv${curInv.level || 1}`, cx, py + 186 + equipLift);
        ctx.shadowBlur = 0;
      }
    } catch (e) { }
  }

  // Divider
  const divY = py + 218 + equipLift;
  ctx.strokeStyle = '#1a2040'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(px + 16, divY); ctx.lineTo(px + pw - 16, divY); ctx.stroke();

  // Stats
  const sY = divY + 14, bx = px + 6, bw = pw - 14;
  if (game.loadoutTab === 0 && item.hp) {
    const stats = [
      { l: 'HP', v: item.hp, max: 150, c: '#00ff88', d: `${item.hp}` },
      { l: 'ATK', v: (item.atk - 1) * 100, max: 50, c: '#ff8844', d: `×${item.atk.toFixed(1)}` },
      { l: 'DEF', v: item.def, max: 50, c: '#44aaff', d: `${item.def}%` },
      { l: 'CRIT', v: item.crit, max: 40, c: '#ffdd00', d: `${item.crit}%` },
      { l: 'SPD', v: item.spd, max: 5, c: '#88ffcc', d: `+${item.spd}` },
    ];
    stats.forEach((s, i) => {
      const by = sY + i * 38;
      ctx.fillStyle = '#aaa'; ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'left'; ctx.fillText(s.l, bx, by + 12);
      ctx.fillStyle = s.c; ctx.textAlign = 'right'; ctx.fillText(s.d, bx + bw, by + 12);
      ctx.fillStyle = '#141622'; ctx.beginPath(); ctx.roundRect(bx, by + 16, bw, 7, 3); ctx.fill();
      if (s.v > 0) { ctx.fillStyle = s.c; ctx.shadowColor = s.c; ctx.shadowBlur = 4; ctx.beginPath(); ctx.roundRect(bx, by + 16, bw * Math.min(1, s.v / s.max), 7, 3); ctx.fill(); ctx.shadowBlur = 0; }
    });
  } else if (game.loadoutTab === 1) {
    // ユーザー要望: 追加効果は非表示（装備時の比較だけに絞る）
    // 左パネルの役割統一: 基本は「現在の効果」。選択が装備中と異なる時だけ比較を表示。
    try {
      const slotMap = { atk: 0, def: 1, sp: 2 };
      const slotIdx = slotMap[item.slot] ?? 0;
      const curEquip = Array.isArray(game.playerLoadout?.equip) ? game.playerLoadout.equip.slice() : [null, null, null];
      const curId = curEquip[slotIdx] || null;
      const actionTop = py + ph - 82;
      const maxY = actionTop - 14;

      // ── セクションテンプレ（キャラと完全一致） ──
      const PAD = 16;
      const SECTION_GAP = 24;
      const left = px + PAD, right = px + pw - PAD;

      // セクション区切り線（位置/色/太さをキャラと一致させる）
      let ySec = divY + SECTION_GAP;
      ctx.strokeStyle = 'rgba(30,40,80,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(left, ySec); ctx.lineTo(right, ySec); ctx.stroke();
      ySec += SECTION_GAP;

      // 1=B,2=A 解釈: 装備タブは「比較」を基本表示にする（同一なら「変化なし」）
      const showCompare = true;

      // --- section title (統一) ---
      ctx.fillStyle = 'rgba(255,255,255,0.90)';
      ctx.font = 'bold 13px Orbitron,Courier New';
      ctx.textAlign = 'left';
      ctx.fillText('効果', left, ySec + 2);
      ctx.fillStyle = 'rgba(200,220,255,0.40)'; ctx.font = '11px Orbitron,Courier New';
      ctx.fillText('比較', left + 54, ySec + 2);
      ySec += 18;

      const charId = game.playerLoadout?.charId || null;
      const nextEquip = curEquip.slice();
      nextEquip[slotIdx] = item.id;
      const curS = computeTotalStatsForLoadout(charId, curEquip);
      const nextS = computeTotalStatsForLoadout(charId, nextEquip);

      const rows = [
        { l: 'HP', b: curS.hp, a: nextS.hp, fmt: (v) => `${v}` },
        { l: 'ATK', b: curS.atk, a: nextS.atk, fmt: (v) => `${v.toFixed(1)}` },
        { l: 'DEF', b: curS.def, a: nextS.def, fmt: (v) => `${v}%` },
        { l: 'CRIT', b: curS.crit, a: nextS.crit, fmt: (v) => `${v}%` },
        { l: 'SPD', b: curS.spd, a: nextS.spd, fmt: (v) => `${v}` },
      ];

      const y0 = ySec + 8;
      const colW = right - left;
      // 縦リスト（横並びをやめる）
      // 5行が必ず収まるように、行間は空き高さから自動調整
      const availH = Math.max(0, maxY - y0);
      const listLineH = Math.max(18, Math.min(26, Math.floor(availH / Math.max(1, rows.length))));

      const drawCompareRow = (r, x, y) => {
        const d = r.a - r.b;
        const nz = (r.l === 'ATK') ? Math.abs(d) > 1e-6 : (d !== 0);

        const labelX = x;
        const beforeX = x + 46;

        // label（変化なしは薄く表示）
        ctx.fillStyle = nz ? 'rgba(255,255,255,0.92)' : 'rgba(200,220,255,0.32)';
        ctx.font = 'bold 11px Orbitron,Courier New';
        ctx.textAlign = 'left';
        ctx.fillText(r.l, labelX, y);

        if (nz) {
          // before → after
          ctx.fillStyle = 'rgba(200,220,255,0.78)';
          ctx.font = '11px Orbitron,Courier New';
          const baseTxt = `${r.fmt(r.b)} → ${r.fmt(r.a)}`;
          ctx.fillText(baseTxt, beforeX, y);
          // delta
          let deltaTxt = '';
          if (r.l === 'DEF' || r.l === 'CRIT') {
            deltaTxt = `${d > 0 ? '+' : ''}${d}%`;
          } else if (r.l === 'ATK') {
            deltaTxt = `${d > 0 ? '+' : ''}${d.toFixed(1)}`;
          } else {
            deltaTxt = `${d > 0 ? '+' : ''}${d}`;
          }
          const up = d > 0;
          const col = up ? 'rgba(120,255,190,0.98)' : 'rgba(255,120,120,0.92)';
          const baseW = ctx.measureText(baseTxt).width;
          ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 6;
          ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'left';
          ctx.fillText(`  ${deltaTxt}`, beforeX + baseW + 4, y);
          ctx.shadowBlur = 0;
        } else {
          // 変化なし: 現在値をグレーアウト表示
          ctx.fillStyle = 'rgba(200,220,255,0.30)';
          ctx.font = '11px Orbitron,Courier New';
          ctx.fillText(`${r.fmt(r.a)}  ─`, beforeX, y);
        }
        return true;
      };

      let yList = y0;
      let shown = 0;
      for (const r of rows) {
        if (yList > maxY + 1) break;
        const drew = drawCompareRow(r, left, yList);
        if (drew) {
          yList += listLineH;
          shown++;
        }
      }
      if (shown === 0) {
        ctx.fillStyle = 'rgba(200,220,255,0.40)'; ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'left';
        ctx.fillText('変化なし', left, y0);
      }
      ctx.textAlign = 'left';
    } catch (e) { }
  } else if (game.loadoutTab === 2) {
    // ---- ペット詳細（可読性改善）----
    // 色ルール: スキル=明るい / 説明=グレー / ラベル=中間色
    const skillMap = {
      dragon: { skill: '3秒毎 炎弾発射', desc: '5秒毎に火球を発射' },
      hawk: { skill: '3秒毎 追尾弾', desc: '3秒毎にホーミング発射' },
      heal: { skill: '被弾時 HP+15', desc: '被弾時に回復' },
      fairy: { skill: 'コイン+20%', desc: 'コイン獲得量UP' },
      exp: { skill: 'EXP+15%', desc: '経験値獲得量UP' },
      phoenix: { skill: 'HP30%以下 無敵', desc: 'ピンチで一時無敵' },
      coin: { skill: 'コイン引き寄せ', desc: 'コインを自動吸引' },
      turtle: { skill: '被ダメ-15%', desc: '被ダメージ軽減' },
      bomber: { skill: '8秒毎 爆弾投下', desc: '周期的に爆弾' },
      ghost: { skill: '10秒毎 無敵1秒', desc: '短時間無敵' },
    };
    const sd = skillMap[item.effect] || { skill: item.desc || 'スキル', desc: '' };

    const SEC_GAP = 18;
    let yy = sY + 14;

    // 1) 主役（スキル）
    ctx.fillStyle = rc; ctx.shadowColor = rc; ctx.shadowBlur = 12;
    ctx.font = 'bold 18px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(sd.skill, cx, yy + 18); ctx.shadowBlur = 0;

    // 2) 説明（弱化）
    if (sd.desc) {
      ctx.fillStyle = 'rgba(200,220,255,0.40)'; ctx.font = '11px Orbitron,Courier New';
      ctx.fillText(sd.desc, cx, yy + 40);
    }
    yy += 48 + SEC_GAP;

    // Divider
    ctx.strokeStyle = 'rgba(60,90,150,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 18, yy); ctx.lineTo(px + pw - 18, yy); ctx.stroke();
    yy += SEC_GAP;

    // 3) ペットスロット（タイトル強化＋上余白）
    ctx.fillStyle = 'rgba(225,240,255,0.60)'; ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('ペットスロット', cx, yy - 6);
    yy += 10;
    const maxSlots = game.stage >= 10 ? 3 : game.stage >= 5 ? 2 : 1;
    for (let s = 0; s < 3; s++) {
      const pid = game.playerLoadout.pets[s];
      const locked = s >= maxSlots;
      const scx = cx + (s - 1) * 62, scy = yy + 28;
      const isSel = pid === item.id;
      ctx.fillStyle = locked ? 'rgba(8,8,16,0.8)' : 'rgba(10,12,26,0.95)';
      ctx.strokeStyle = locked ? 'rgba(90,110,160,0.25)' : isSel ? '#00ff88' : pid ? 'rgba(200,120,255,0.7)' : 'rgba(90,110,160,0.35)';
      ctx.lineWidth = isSel ? 2.0 : 1.4;
      ctx.shadowColor = isSel ? '#00ff88' : pid ? 'rgba(200,120,255,0.8)' : 'transparent'; ctx.shadowBlur = (!locked && (isSel || pid)) ? 10 : 0;
      ctx.beginPath(); ctx.arc(scx, scy, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      if (locked) {
        ctx.fillStyle = 'rgba(200,220,255,0.22)'; ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'center'; ctx.fillText('LOCK', scx, scy + 4);
      } else if (pid) {
        const pet = PET_POOL.find(p => p.id === pid);
        if (pet) { ctx.save(); ctx.translate(scx, scy); ctx.scale(0.72, 0.72); drawPetShape(ctx, pet.effect, pet.color, pet.rarity); ctx.restore(); }
      } else {
        ctx.fillStyle = 'rgba(200,220,255,0.22)'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center'; ctx.fillText('+', scx, scy + 7);
      }
      ctx.fillStyle = locked ? 'rgba(200,220,255,0.18)' : 'rgba(200,220,255,0.28)'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText(locked ? 'LOCK' : `SLOT ${s + 1}`, scx, scy + 36);
    }

    // 強化情報は「強化モード」時だけ表示（ノイズ削減）
  } else {
    const wDescs = { normal: '通常弾 弾数無制限', laser: '貫通レーザー', homing: '自動追尾ミサイル', explosive: '爆発弾 範囲ダメージ' };
    ctx.fillStyle = '#aaa'; ctx.font = '12px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(wDescs[item.weapon || 'normal'] || item.desc, cx, sY + 18);
    if (item.ammo) {
      ctx.shadowColor = rc; ctx.shadowBlur = 10;
      ctx.fillStyle = rc; ctx.font = 'bold 36px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText(`×${item.ammo}`, cx, sY + 62); ctx.shadowBlur = 0;
      ctx.fillStyle = '#556'; ctx.font = '12px Orbitron,Courier New'; ctx.fillText('弾数', cx, sY + 82);
    } else {
      ctx.shadowColor = '#0f0'; ctx.shadowBlur = 8;
      ctx.fillStyle = '#0f0'; ctx.font = 'bold 18px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('無制限  ∞', cx, sY + 60); ctx.shadowBlur = 0;
    }
  }

  // Level-up section (skip for CLASSIC weapon)
  if (item.id !== null) {
    const inv = game.gachaInventory[item.id];
    const lv = inv ? inv.level || 1 : 1;
    const cost = item.id ? getLevelUpCost(item) : null;
    // ペット強化は素材ベースでEXP概念がないため、EXPバーは削除してLvだけ小さく表示
    const lvY = py + ph - 156; // 強化内容表示の基準（バーは描かない）
    if (game.loadoutTab === 2) {
      // ペットLv表示は名前横に統合（下部Lv表示は出さない）
    } else {
      // ユーザー要望: 装備はLvを名前横だけにする（下部のLv表示は出さない）
      if (game.loadoutTab !== 1) {
        ctx.fillStyle = 'rgba(200,220,255,0.38)';
        ctx.font = 'bold 11px Orbitron,Courier New';
        ctx.textAlign = 'left';
        ctx.fillText(`Lv.${lv}`, px + 18, py + ph - 168);
        ctx.textAlign = 'center';
      }
    }

    // ユーザー要望: 「強化で上がる（今→次）」は常時表示しない（強化パネルで確認）
  }

  // プレビュー内の「装備中/セット」ボタンは廃止（スマホは左下の大ボタンで完結）
  // ヒント文はボタンと被りやすいので表示しない
}

export function drawLoadoutScreen() {
  const ctx = drawDeps.ctx;
  ctx.fillStyle = 'rgba(0,0,0,0.97)'; ctx.fillRect(0, 0, W, H);

  const TAB_COLORS = ['#00ccff', '#ff8844', '#cc88ff', '#44aaff'];
  const tc = TAB_COLORS[game.loadoutTab];
  const bgG = ctx.createRadialGradient(148, 330, 0, 148, 330, 270);
  bgG.addColorStop(0, tc + '11'); bgG.addColorStop(1, 'transparent');
  ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, H);

  // ── TABS ──
  const TAB_LABELS = ['◈  キャラ', '⚙  装備', '♦  ペット', '▶  武器'];
  const TW = W / 4;
  TAB_LABELS.forEach((label, i) => {
    const tx = i * TW, active = game.loadoutTab === i, col = TAB_COLORS[i];
    ctx.fillStyle = 'rgba(7,8,18,0.92)'; ctx.fillRect(tx, 0, TW, 47);
    if (active) { ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = col; ctx.fillRect(tx, 0, TW, 47); ctx.restore(); }
    if (i > 0) { ctx.strokeStyle = '#18182a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx, 4); ctx.lineTo(tx, 42); ctx.stroke(); }
    ctx.fillStyle = active ? col : '#3a3a55'; ctx.font = `${active ? 'bold ' : ''} 13px Orbitron,Courier New`; ctx.textAlign = 'center';
    ctx.shadowColor = active ? col : 'transparent'; ctx.shadowBlur = active ? 10 : 0;
    ctx.fillText(label, tx + TW / 2, 28); ctx.shadowBlur = 0;
    // Bottom bar
    if (active) { ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.fillRect(tx + 2, 44, TW - 4, 3); ctx.shadowBlur = 0; }
    else { ctx.fillStyle = '#18182a'; ctx.fillRect(tx, 44, TW, 3); }
  });

  // Build pool
  let pool = [];
  if (game.loadoutTab === 0) {
    const rf = game.charRarityFilter || 'all';
    pool = CHAR_POOL.filter(c => (game.gachaInventory[c.id] || c.id === 'char_basic') && (rf === 'all' || c.rarity === rf));
    if (pool.length === 0) pool = CHAR_POOL.filter(c => game.gachaInventory[c.id] || c.id === 'char_basic');
  } else if (game.loadoutTab === 1) pool = buildEquipPool();
  else if (game.loadoutTab === 2) pool = PET_POOL.filter(p => game.gachaInventory[p.id]);
  else pool = [{ id: null, rarity: 'N', type: 'weapon', label: 'CLASSIC', desc: '通常弾・無限', color: '#aaa', weapon: 'normal', ammo: 0 }, ...WEAPON_GACHA_POOL.filter(w => game.gachaInventory[w.id])];
  const cur = Math.min(game.loadoutCursor, Math.max(0, pool.length - 1));
  const curItem = pool[cur];
  if (game.loadoutSelAnimFrame === undefined) game.loadoutSelAnimFrame = game.frameCount;
  if (game.loadoutSelAnimDir === undefined) game.loadoutSelAnimDir = 0;

  // Panel dimensions (PH shorter to leave room for BACK button at y=558)
  const PX = 4, PY = 50, PW = 290, PH = H - PY - 48;
  const LX = PX + PW + 6, LY = PY, LW = W - LX - 4, LH = PH;

  // Left panel bg
  ctx.fillStyle = 'rgba(6,8,20,0.96)'; ctx.strokeStyle = '#161c36'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(PX, PY, PW, PH, 8); ctx.fill(); ctx.stroke();
  // Right panel bg
  ctx.fillStyle = 'rgba(5,6,16,0.96)'; ctx.strokeStyle = '#161c36'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(LX, LY, LW, LH, 8); ctx.fill(); ctx.stroke();

  // ⑤ 編成サマリーストリップ（左パネル最下部）
  {
    const SUMH = 36, sumY = PY + PH - SUMH - 4;
    const eIds = game.playerLoadout?.equip || [null,null,null];
    const cId = game.playerLoadout?.charId || null;
    const wId = game.playerLoadout?.weaponId || null;
    const sumSlots = [
      { type: 'char', id: cId || 'char_basic', pool: CHAR_POOL },
      { type: 'equip', id: eIds[0], pool: EQUIP_POOL },
      { type: 'equip', id: eIds[1], pool: EQUIP_POOL },
      { type: 'equip', id: eIds[2], pool: EQUIP_POOL },
      { type: 'weapon', id: wId, pool: WEAPON_GACHA_POOL },
    ];
    const iconW = Math.floor((PW - 20) / 5);
    ctx.save();
    ctx.fillStyle = 'rgba(5,6,22,0.90)'; ctx.strokeStyle = 'rgba(100,120,200,0.18)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(PX + 8, sumY, PW - 16, SUMH, 6); ctx.fill(); ctx.stroke();
    sumSlots.forEach((sl, i) => {
      const ix = PX + 10 + i * iconW + iconW / 2;
      const iy = sumY + SUMH / 2;
      const found = sl.id ? sl.pool.find(p => p.id === sl.id) : null;
      const rc2 = found ? (RARITY_COLORS[found.rarity] || found.color || '#888') : 'rgba(80,90,120,0.4)';
      ctx.fillStyle = found ? rc2 + '22' : 'rgba(40,50,80,0.3)';
      ctx.strokeStyle = found ? rc2 + '88' : 'rgba(80,90,120,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(ix, iy, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (found) {
        ctx.save(); ctx.translate(ix, iy);
        ctx.fillStyle = rc2; ctx.shadowColor = rc2; ctx.shadowBlur = 4;
        if (sl.type === 'char') {
          try {
            const photo = isDragonLordChar(found)
              && drawDragonLordPortrait(ctx, 0, 0, 20, 20, {
                glowColor: rc2,
                frameCount: game.frameCount,
                tier: 'micro',
              });
            if (!photo) {
              drawShipShape(ctx, -7, -4, 14, 9, pickCharShipShape(found), found.color || rc2, found.rarity);
            }
          } catch (_) {}
        } else if (sl.type === 'equip') {
          ctx.scale(0.55, 0.55); try { drawEquipShape(ctx, found, rc2, found.rarity); } catch(_) {}
        } else {
          ctx.beginPath(); ctx.moveTo(0,-7); ctx.lineTo(5,4); ctx.lineTo(-5,4); ctx.closePath(); ctx.fill();
        }
        ctx.shadowBlur = 0; ctx.restore();
      } else {
        ctx.fillStyle = 'rgba(150,170,200,0.25)'; ctx.font = '14px monospace'; ctx.textAlign = 'center';
        ctx.fillText('+', ix, iy + 5);
      }
    });
    ctx.restore();
  }

  // ── LEFT: PREVIEW ──
  if (curItem) {
    // 左右連動演出（選択変更時に軽いスライド＋フェード）
    const start = game.loadoutSelAnimFrame || 0;
    const dt = Math.max(0, game.frameCount - start);
    const dur = 10;
    const t = Math.min(1, dt / dur);
    const ease = 1 - Math.pow(1 - t, 3);
    const dir = game.loadoutSelAnimDir || 0;
    const dx = (1 - ease) * dir * 10;
    ctx.save();
    ctx.globalAlpha = 0.65 + 0.35 * ease;
    ctx.translate(dx, 0);
    drawLoadoutPreview(ctx, PX, PY, PW, PH, curItem);
    ctx.restore();
  }
  else {
    ctx.fillStyle = '#2a2a40'; ctx.font = '13px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('アイテムなし', PX + PW / 2, PY + PH / 2 - 10);
    ctx.fillStyle = '#445'; ctx.font = '11px Orbitron,Courier New';
    ctx.fillText('ガチャで入手しよう！', PX + PW / 2, PY + PH / 2 + 12);
  }

  // ── EQUIP / CHAR TAB: top space ──
  let equipHudH = 0;
  if (game.loadoutTab === 1) equipHudH = 34;
  if (game.loadoutTab === 0) equipHudH = 30;

  // 装備タブ: おすすめフィルタタブ（全て/攻撃/耐久/会心）
  // 非選択はグレー・枠なし、選択中のみ色＋下線＋軽い発光
  if (game.loadoutTab === 1) {
    const qf = game.equipQuickFilter || 'all';
    const tabs = [
      { id: 'all', t: '全て', c: 'rgba(200,220,255,0.28)' },
      { id: 'atk', t: '攻撃', c: '#ff8844' },
      { id: 'def', t: '耐久', c: '#44aaff' },
      { id: 'crit', t: '会心', c: '#cc88ff' },
    ];
    // 右リストの最上部に配置（グリッドに被せない）
    const tabY = LY + 10;
    const tabX = LX + 12;
    const tw = 52, th = 20, gap = 12;
    game._equipQuickFilterHits = [];
    tabs.forEach((tb, i) => {
      const x = tabX + i * (tw + gap), y = tabY;
      const active = qf === tb.id;
      // hit
      game._equipQuickFilterHits.push({ id: tb.id, x, y, w: tw, h: th });
      // label
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px Orbitron,Courier New';
      ctx.fillStyle = active ? tb.c : 'rgba(200,220,255,0.35)';
      ctx.shadowColor = active ? tb.c : 'transparent'; ctx.shadowBlur = active ? 8 : 0;
      const labelY = y + 15;
      ctx.fillText(tb.t, x, labelY);
      ctx.shadowBlur = 0;
      // underline only when active
      if (active) {
        const uw = Math.min(tw - 8, ctx.measureText(tb.t).width);
        ctx.fillStyle = tb.c;
        ctx.fillRect(x, Math.round(labelY + 4), Math.max(10, uw), 2);
      }
    });
    ctx.textAlign = 'left';

    // ソートプリセット（強い/レア/Lv）: 右上に1ボタンでサイクル
    const sp = game.equipSortPreset || 0;
    const spLbl = sp === 1 ? 'レア順' : sp === 2 ? 'Lv順' : '強い順';
    const bx = LX + LW - 90, by = LY + 8, bw = 78, bh = 22;
    game._equipSortHit = { x: bx, y: by, w: bw, h: bh };
    ctx.fillStyle = 'rgba(10,12,26,0.70)';
    ctx.strokeStyle = 'rgba(120,150,220,0.28)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(200,220,255,0.55)'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(spLbl, bx + bw / 2, by + 15);
    ctx.textAlign = 'left';
  }

  // ④ キャラタブ: レアリティフィルタ
  if (game.loadoutTab === 0) {
    const rf = game.charRarityFilter || 'all';
    const charFilterTabs = [
      { id: 'all', t: '全て', c: '#aaccff' },
      { id: 'LR',  t: 'LR',  c: '#ffdd44' },
      { id: 'SSR', t: 'SSR', c: '#ff88cc' },
      { id: 'SR',  t: 'SR',  c: '#aa88ff' },
      { id: 'R',   t: 'R',   c: '#44aaff' },
    ];
    const cfTabY = LY + 8;
    const cfTabX = LX + 8;
    const cftw = 36, cfth = 20, cftgap = 6;
    game._charRarityFilterHits = [];
    charFilterTabs.forEach((tb, i) => {
      const x = cfTabX + i * (cftw + cftgap), y = cfTabY;
      const active = rf === tb.id;
      game._charRarityFilterHits.push({ id: tb.id, x, y, w: cftw, h: cfth });
      ctx.fillStyle = active ? tb.c : 'rgba(200,220,255,0.30)';
      ctx.font = `${active ? 'bold ' : ''}10px Orbitron,Courier New`; ctx.textAlign = 'left';
      ctx.shadowColor = active ? tb.c : 'transparent'; ctx.shadowBlur = active ? 6 : 0;
      ctx.fillText(tb.t, x, y + 14); ctx.shadowBlur = 0;
      if (active) {
        const uw = ctx.measureText(tb.t).width;
        ctx.fillStyle = tb.c; ctx.fillRect(x, y + 17, Math.max(8, uw), 2);
      }
    });
    ctx.textAlign = 'left';
  }

  // ── RIGHT: ITEM GRID (4 per row) ──
  if (pool.length === 0) {
    ctx.fillStyle = '#2a2a40'; ctx.font = '13px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('まだアイテムがありません', LX + LW / 2, LY + LH / 2 - 10);
    ctx.fillStyle = '#445'; ctx.font = '11px Orbitron,Courier New';
    ctx.fillText('ガチャで入手しよう！', LX + LW / 2, LY + LH / 2 + 14);
  } else {
    // キャラは右側の空白が出やすいので3列（狭い場合は2列）
    const COLS = (game.loadoutTab === 0 ? (LW < 320 ? 2 : 3) : 4);
    const sidePad = 8, basePadY = 8, gap = (game.loadoutTab === 1 ? 8 : 6);
    const padY = basePadY + (equipHudH || 0);
    const cellW = Math.floor((LW - sidePad * 2 - gap * (COLS - 1)) / COLS);
    const cellH = Math.min(cellW, (game.loadoutTab === 1 ? 80 : 72));
    const visRows = Math.max(1, Math.floor((LH - padY - basePadY - 24) / (cellH + gap)));
    const curRow = Math.floor(cur / COLS);
    const startRow = Math.max(0, Math.min(curRow - Math.floor(visRows / 2), Math.ceil(pool.length / COLS) - visRows));

    for (let vi = 0; vi < visRows; vi++) {
      for (let col = 0; col < COLS; col++) {
        const pi = (startRow + vi) * COLS + col;
        if (pi >= pool.length) continue;
        const item = pool[pi];
        const isActive = pi === cur;
        const rc = RARITY_COLORS[item.rarity] || item.color || '#aaa';
        const cx2 = LX + sidePad + col * (cellW + gap);
        const cy2 = LY + padY + vi * (cellH + gap);

        // Card bg
        ctx.save();
        if (isActive) {
          // 選択中カードを少し拡大（1.05倍）＋発光強化
          const s = 1.05;
          ctx.translate(cx2 + cellW / 2, cy2 + cellH / 2);
          ctx.scale(s, s);
          ctx.translate(-(cx2 + cellW / 2), -(cy2 + cellH / 2));
        }
        ctx.fillStyle = isActive ? `rgba(${hexToRgb(rc) || '60,60,80'},0.24)` : 'rgba(10,12,28,0.88)';
        ctx.strokeStyle = isActive ? rc : '#1a1e38';
        ctx.lineWidth = isActive ? 2.4 : 1;
        ctx.shadowColor = isActive ? rc : 'transparent'; ctx.shadowBlur = isActive ? 22 : 0;
        ctx.beginPath(); ctx.roundRect(cx2, cy2, cellW, cellH, 7); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

        // Top rarity bar
        ctx.fillStyle = rc; ctx.globalAlpha = isActive ? 0.9 : 0.5;
        ctx.beginPath(); ctx.roundRect(cx2, cy2, cellW, 3, 2); ctx.fill(); ctx.globalAlpha = 1;

        // 装備カード上の ATK/DEF/SP バッジは非表示（右上フィルタに統一）

        // Icon
        ctx.save(); ctx.translate(cx2 + cellW / 2, cy2 + cellH / 2 - 8);
        ctx.fillStyle = rc; ctx.shadowColor = rc; ctx.shadowBlur = isActive ? 12 : 4;
        if (item.type === 'char' || item.type === 'skin') {
          const photo = isDragonLordChar(item)
            && drawDragonLordPortrait(ctx, 0, 0, 28, 40, {
              glowColor: rc,
              frameCount: game.frameCount,
              tier: 'compact',
              active: isActive,
            });
          if (!photo) {
            drawShipShape(ctx, -10, -6, 20, 12, pickCharShipShape(item), item.color || rc, item.rarity);
          }
        } else if (item.type === 'pet' && item.effect) {
          ctx.scale(0.64, 0.64); drawPetShape(ctx, item.effect, rc, item.rarity);
        } else if (item.type === 'equip') {
          ctx.scale(0.68, 0.68); drawEquipShape(ctx, item, rc, item.rarity);
        } else {
          ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(7, 0); ctx.lineTo(0, 9); ctx.lineTo(-7, 0); ctx.closePath(); ctx.fill();
        }
        ctx.shadowBlur = 0; ctx.restore();

        // Equip: main effect line (decision helper)
        if (game.loadoutTab === 1 && item && item.type === 'equip') {
          const eff = getEquipMainEffectText(item);
          ctx.fillStyle = isActive ? 'rgba(230,245,255,0.82)' : 'rgba(200,220,255,0.45)';
          ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'center';
          ctx.fillText(eff, cx2 + cellW / 2, cy2 + cellH - 22);
        }

        // Char: one-line stat summary (HP / ATK% / DEF%)
        if (game.loadoutTab === 0 && item && (item.type === 'char' || item.type === 'skin')) {
          const hp = Math.round(item.hp || 0);
          const atkPct = Math.round(((item.atk || 1) - 1) * 100);
          const defPct = Math.round(item.def || 0);
          let sum = `HP ${hp} / ATK ${atkPct >= 0 ? '+' : ''}${atkPct}% / DEF ${defPct >= 0 ? '+' : ''}${defPct}%`;
          if (sum.length > 26) sum = sum.slice(0, 25) + '…';
          ctx.fillStyle = isActive ? 'rgba(230,245,255,0.78)' : 'rgba(200,220,255,0.40)';
          ctx.font = 'bold 8px Orbitron,Courier New'; ctx.textAlign = 'center';
          ctx.fillText(sum, cx2 + cellW / 2, cy2 + cellH - 22);
        }

        // Label (truncate)
        const lbl = item.label.length > 9 ? item.label.slice(0, 8) + '…' : item.label;
        ctx.fillStyle = isActive ? '#ffffff' : 'rgba(205,225,255,0.55)';
        ctx.font = `${isActive ? 'bold ' : ''} 10px Orbitron,Courier New`; ctx.textAlign = 'center';
        ctx.fillText(lbl, cx2 + cellW / 2, cy2 + cellH - 6);

        // Level badge (equip + char) & MAX badge
        if (item && item.id && game.gachaInventory?.[item.id] && game.loadoutTab !== 3) {
          const lv = (game.gachaInventory[item.id].level || 1);
          const isMax = lv >= 5;
          ctx.fillStyle = isMax ? 'rgba(0,200,80,0.30)' : 'rgba(0,0,0,0.35)';
          ctx.strokeStyle = isMax ? 'rgba(0,255,100,0.70)' : 'rgba(200,220,255,0.18)'; ctx.lineWidth = 1;
          const badgeW = isMax ? 32 : 28;
          ctx.beginPath(); ctx.roundRect(cx2 + 5, cy2 + 5, badgeW, 14, 5); ctx.fill(); ctx.stroke();
          ctx.fillStyle = isMax ? '#44ffaa' : 'rgba(230,245,255,0.60)';
          if (isMax) { ctx.shadowColor = '#44ffaa'; ctx.shadowBlur = 6; }
          ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'center';
          ctx.fillText(isMax ? 'MAX' : `Lv${lv}`, cx2 + 5 + badgeW / 2, cy2 + 15);
          ctx.shadowBlur = 0; ctx.textAlign = 'left';
        }

        // Equipped dot
        let equipped = false;
        if (game.loadoutTab === 0) equipped = game.playerLoadout.charId === item.id || (item.id === 'char_basic' && !game.playerLoadout.charId);
        else if (game.loadoutTab === 1) equipped = game.playerLoadout.equip.includes(item.id);
        else if (game.loadoutTab === 2) equipped = game.playerLoadout.pets.includes(item.id);
        else equipped = game.playerLoadout.weaponId === item.id || (item.id === null && !game.playerLoadout.weaponId);
        if (equipped) {
          ctx.fillStyle = '#00ee44'; ctx.shadowColor = '#0f0'; ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.arc(cx2 + cellW - 10, cy2 + 10, 4, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          // 装備タブは「どのスロットで装備中か」をアイコンで明示
          if (game.loadoutTab === 1) {
            const ids = Array.isArray(game.playerLoadout?.equip) ? game.playerLoadout.equip : [];
            const idx = ids.indexOf(item.id);
            const iconMap = [
              { t: '⚔', c: '#ff8844' },
              { t: '🛡', c: '#44aaff' },
              { t: '✦', c: '#cc88ff' },
            ];
            const m = iconMap[idx] || { t: '●', c: '#00ee44' };
            ctx.fillStyle = m.c; ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'right';
            ctx.shadowColor = m.c; ctx.shadowBlur = 6;
            ctx.fillText(m.t, cx2 + cellW - 16, cy2 + 14);
            ctx.shadowBlur = 0; ctx.textAlign = 'left';
          }
        }

        // Card transform end
        ctx.restore();
      }
    }

    ctx.textAlign = 'center';
    if (Math.ceil(pool.length / COLS) > visRows) {
      ctx.fillStyle = 'rgba(205,225,255,0.32)'; ctx.font = '11px Orbitron,Courier New';
      ctx.fillText(`${cur + 1}  /  ${pool.length}  ▲▼`, LX + LW / 2, LY + LH - 8);
    }
  }

  // Bottom hint (left panel) は非表示（常時点滅はノイズになりやすい）

  // ペットレベルアップオーバーレイ
  if (game.petLevelUpOverlay && game.loadoutTab === 2) {
    const pet = PET_POOL.find(p => p.id === game.petLevelUpOverlay.petId);
    const inv = pet && game.gachaInventory[pet.id];
    if (pet && inv) {
      const lv = inv.level || 1;
      const petCosts = [{ mat: 1, scrap: 5 }, { mat: 1, scrap: 10, core: 2 }, { mat: 2, scrap: 20, core: 5 }, { mat: 2, scrap: 30, core: 10, crystal: 2 }];
      const cost = lv <= 4 ? petCosts[lv - 1] : null;
      // 背景をしっかり暗くして可読性UP
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, W, H);

      const ow = 360, oh = 260;
      const ox = W / 2 - ow / 2, oy = H / 2 - oh / 2;
      const col = pet.color || '#cc88ff';
      ctx.fillStyle = 'rgba(2,4,14,0.97)'; ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.shadowColor = col; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.roundRect(ox, oy, ow, oh, 16); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

      // Title
      ctx.fillStyle = col; ctx.font = 'bold 16px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText(`♦  ${pet.label}  Lv${lv} → Lv${lv + 1}`, W / 2, oy + 30);
      ctx.fillStyle = 'rgba(180,210,255,0.78)'; ctx.font = '12px Orbitron,Courier New';
      ctx.fillText(pet.desc || 'ペット強化', W / 2, oy + 54);

      ctx.strokeStyle = 'rgba(60,90,150,0.45)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ox + 18, oy + 70); ctx.lineTo(ox + ow - 18, oy + 70); ctx.stroke();
      ctx.fillStyle = 'rgba(230,245,255,0.60)'; ctx.font = '600 11px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText('必要素材（次Lv）', ox + 22, oy + 92);
      if (cost) {
        const matOk = (inv.mat || 0) >= cost.mat;
        const scrapOk = !cost.scrap || (game.materials.scrap || 0) >= cost.scrap;
        const coreOk = !cost.core || (game.materials.core || 0) >= cost.core;
        const crystalOk = !cost.crystal || (game.materials.crystal || 0) >= cost.crystal;
        const allOk = matOk && scrapOk && coreOk && crystalOk;

        const parts = [
          { t: `複製`, need: cost.mat, have: (inv.mat || 0), ok: matOk },
          cost.scrap ? { t: `🔩`, need: cost.scrap, have: (game.materials.scrap || 0), ok: scrapOk } : null,
          cost.core ? { t: `⚡`, need: cost.core, have: (game.materials.core || 0), ok: coreOk } : null,
          cost.crystal ? { t: `💠`, need: cost.crystal, have: (game.materials.crystal || 0), ok: crystalOk } : null,
        ].filter(Boolean);

        const startX = ox + 22, startY = oy + 110;
        const rowH = 18;
        parts.forEach((p, i) => {
          const y = startY + i * rowH;
          ctx.fillStyle = 'rgba(200,220,255,0.42)'; ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'left';
          ctx.fillText(`${p.t}`, startX, y);
          ctx.fillStyle = p.ok ? 'rgba(255,230,160,0.85)' : 'rgba(255,120,120,0.92)';
          ctx.font = 'bold 11px Orbitron,Courier New';
          ctx.fillText(`×${p.need}`, startX + 48, y);
          ctx.fillStyle = 'rgba(200,220,255,0.35)'; ctx.font = '11px Orbitron,Courier New';
          ctx.fillText(`（所持:${p.have}）`, startX + 112, y);
        });

        const btnY = oy + oh - 76;
        ctx.fillStyle = allOk ? 'rgba(0,200,100,0.95)' : 'rgba(110,110,140,0.35)';
        ctx.strokeStyle = allOk ? '#00cc66' : 'rgba(120,140,190,0.25)'; ctx.lineWidth = 1.5;
        ctx.shadowColor = allOk ? '#00ff88' : 'transparent'; ctx.shadowBlur = allOk ? 14 : 0;
        ctx.beginPath(); ctx.roundRect(ox + 40, btnY, ow - 80, 46, 12); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = allOk ? '#fff' : 'rgba(220,230,255,0.35)'; ctx.font = 'bold 14px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText(allOk ? '強化する' : '素材不足', W / 2, btnY + 30);
      } else {
        ctx.fillStyle = '#44ff88'; ctx.font = 'bold 13px Orbitron,Courier New';
        ctx.fillText('✓  MAX LEVEL', W / 2, oy + 120);
      }
      ctx.fillStyle = 'rgba(200,220,255,0.35)'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('ESC / 画面タップで閉じる', W / 2, oy + oh - 18);
    }
  }

  // 強化パネル（キャラ/装備/武器）: 下部に展開（ペットと同じ方式）
  if (game.state === 'loadout' && game.loadoutUpgradeOverlay && game.loadoutUpgradeOverlay.itemId && game.loadoutUpgradeOverlay.tab !== 2) {
    const itemId = game.loadoutUpgradeOverlay.itemId;
    const tab = game.loadoutUpgradeOverlay.tab;
    const pool = (tab === 0 ? CHAR_POOL : tab === 1 ? EQUIP_POOL : tab === 2 ? PET_POOL : WEAPON_GACHA_POOL);
    const item = pool.find(x => x.id === itemId);
    if (item) {
      const changedAt = game.loadoutUpgradeOverlay.changedAt || 0;
      const dt = Math.max(0, game.frameCount - changedAt);
      const dur = 10;
      const t = Math.min(1, dt / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      const open = !!game.loadoutUpgradeOverlay.open;
      const p = open ? ease : (1 - ease);

      // ペット強化パネルと同じ密度/余白に揃える
      const panelH = 252;
      const yTop = H - 48 - panelH * p;
      if (p > 0.01) {
        ctx.save();
        if (open) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0, 0, W, H); }
        const col = item.color || RARITY_COLORS[item.rarity] || '#0cf';
        ctx.fillStyle = 'rgba(2,4,14,0.92)';
        ctx.strokeStyle = col + '88'; ctx.lineWidth = 2;
        ctx.shadowColor = col; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.roundRect(12, yTop, W - 24, panelH, 16); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

        const inv = game.gachaInventory?.[itemId];
        const lv = inv ? (inv.level || 1) : 1;
        const nextLv = Math.min(30, lv + 1);
        const cost = getLevelUpCost(item);
        const can = !!(cost && (game.gachaStardust || 0) >= cost.dust && (game.coins || 0) >= cost.coins);
        const btnW = 260, btnH = 46;
        const bx = W / 2 - btnW / 2, by = yTop + panelH - (btnH + 10); // 下端(H-48)から10px上

        // タイトル（目的を明確化）
        ctx.fillStyle = 'rgba(255,220,180,0.90)'; ctx.font = 'bold 16px Orbitron,Courier New'; ctx.textAlign = 'left';
        ctx.fillText(`強化  ${item.label || ''}  Lv${lv} → Lv${nextLv}`, 28, yTop + 30);
        // サブ（効果/説明）
        if (item.desc) {
          ctx.fillStyle = 'rgba(220,235,255,0.62)'; ctx.font = '12px Orbitron,Courier New';
          ctx.fillText(item.desc, 28, yTop + 50);
        }

        // Before/After（列揃え）
        const xLabel = 28, xBefore = 168, xAfter = 276, xDelta = 392;
        const yHead = yTop + 76;
        const rowH = 20;
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px Orbitron,Courier New'; ctx.fillStyle = 'rgba(230,245,255,0.55)';
        ctx.fillText('強化後', xLabel, yHead);
        ctx.font = '11px Orbitron,Courier New'; ctx.fillStyle = 'rgba(200,220,255,0.38)';
        ctx.fillText('Before', xBefore, yHead);
        ctx.fillText('After', xAfter, yHead);
        ctx.fillText('差分', xDelta, yHead);

        let rows = [];
        const { b, next } = upgradeBonusNowNext(itemId);
        if (item.type === 'weapon') {
          const base = item.ammo || 0;
          const now = Math.max(0, Math.round(base * (1 + b)));
          const nxt = Math.max(0, Math.round(base * (1 + next)));
          if (base > 0) rows.push({ l: '弾数', now, nxt, fmt: v => `${v}`, c: '#88ccff' });
        } else if (item.type === 'char') {
          const hp0 = item.hp || 0, def0 = item.def || 0, crit0 = item.crit || 0, spd0 = item.spd || 0;
          const atk0 = item.atk || 1;
          rows.push({ l: 'HP', now: Math.round(applyLevelToStatAdd(hp0, b)), nxt: Math.round(applyLevelToStatAdd(hp0, next)), fmt: v => `${v}`, c: '#00ff88' });
          rows.push({
            l: 'ATK', now: applyLevelToAtkMult(atk0, b), nxt: applyLevelToAtkMult(atk0, next),
            fmt: v => `${((v - 1) * 100 >= 0 ? '+' : '')}${((v - 1) * 100).toFixed(1)}%`, c: '#ff8844', isPct: true
          });
          rows.push({ l: 'DEF', now: Math.round(applyLevelToStatAdd(def0, b)), nxt: Math.round(applyLevelToStatAdd(def0, next)), fmt: v => `${v}%`, c: '#44aaff' });
          if (crit0) rows.push({ l: 'CRIT', now: Math.round(applyLevelToStatAdd(crit0, b)), nxt: Math.round(applyLevelToStatAdd(crit0, next)), fmt: v => `${v}%`, c: '#ffdd00' });
          if (spd0) rows.push({ l: 'SPD', now: Math.round(applyLevelToStatAdd(spd0, b)), nxt: Math.round(applyLevelToStatAdd(spd0, next)), fmt: v => `+${v}`, c: '#88ffcc' });
        } else if (item.type === 'equip') {
          const hp0 = item.hp || 0, def0 = item.def || 0, crit0 = item.crit || 0, spd0 = item.spd || 0;
          const atk0 = item.atk || 1;
          if (hp0) rows.push({ l: 'HP', now: Math.round(applyLevelToStatAdd(hp0, b)), nxt: Math.round(applyLevelToStatAdd(hp0, next)), fmt: v => `+${v}`, c: '#00ff88' });
          if (atk0 > 1) rows.push({
            l: 'ATK', now: applyLevelToAtkMult(atk0, b), nxt: applyLevelToAtkMult(atk0, next),
            fmt: v => `${((v - 1) * 100 >= 0 ? '+' : '')}${((v - 1) * 100).toFixed(1)}%`, c: '#ff8844', isPct: true
          });
          if (def0) rows.push({ l: 'DEF', now: Math.round(applyLevelToStatAdd(def0, b)), nxt: Math.round(applyLevelToStatAdd(def0, next)), fmt: v => `+${v}%`, c: '#44aaff' });
          if (crit0) rows.push({ l: 'CRIT', now: Math.round(applyLevelToStatAdd(crit0, b)), nxt: Math.round(applyLevelToStatAdd(crit0, next)), fmt: v => `+${v}%`, c: '#ffdd00' });
          if (spd0) rows.push({ l: 'SPD', now: Math.round(applyLevelToStatAdd(spd0, b)), nxt: Math.round(applyLevelToStatAdd(spd0, next)), fmt: v => `+${v}`, c: '#88ffcc' });
        }

        ctx.font = 'bold 12px Orbitron,Courier New';
        // 変化なしは非表示（差分0は情報ノイズ）
        const eps = 1e-6;
        rows = rows.filter(r => Math.abs((r.nxt || 0) - (r.now || 0)) > eps);
        rows.slice(0, 3).forEach((r, ri) => {
          const y = yHead + rowH * (ri + 1);
          ctx.fillStyle = 'rgba(220,235,255,0.72)'; ctx.fillText(r.l, xLabel, y);
          ctx.fillStyle = 'rgba(200,220,255,0.60)'; ctx.fillText(r.fmt(r.now), xBefore, y);
          ctx.fillStyle = 'rgba(70,255,150,0.95)'; ctx.fillText(r.fmt(r.nxt), xAfter, y);
          // 差分を最も目立たせる（明るい緑・太字・軽い発光）
          const d = (typeof r.now === 'number' && typeof r.nxt === 'number') ? (r.nxt - r.now) : 0;
          const dTxt = r.isPct ? `${(d * 100 >= 0 ? '+' : '')}${(d * 100).toFixed(1)}%` : `${d >= 0 ? '+' : ''}${Math.round(d)}`;
          const pulse = 0.9 + 0.1 * Math.sin(game.frameCount * 0.12 + ri);
          ctx.fillStyle = 'rgba(120,255,190,0.98)';
          ctx.shadowColor = 'rgba(70,255,150,0.95)'; ctx.shadowBlur = 10 * pulse;
          ctx.font = 'bold 13px Orbitron,Courier New';
          ctx.fillText(dTxt, xDelta, y);
          ctx.shadowBlur = 0;
          ctx.font = 'bold 12px Orbitron,Courier New';
        });

        // 必要素材（ペットと同じチップUI）
        if (cost) {
          const dustOk = (game.gachaStardust || 0) >= cost.dust;
          const coinOk = (game.coins || 0) >= cost.coins;
          ctx.textAlign = 'left';
          ctx.font = 'bold 12px Orbitron,Courier New';
          ctx.fillStyle = 'rgba(230,245,255,0.55)';
          // ボタンと重ならないよう、数値行の直下に詰めて配置
          const yMatTitle = Math.min(yHead + rowH * 3 + 2, by - 58);
          ctx.fillText('必要素材', 28, yMatTitle);

          const chips = [
            { name: 'スターダスト', icon: '⊕', need: cost.dust, have: (game.gachaStardust || 0), ok: dustOk },
            { name: 'コイン', icon: 'C', need: cost.coins, have: (game.coins || 0), ok: coinOk },
          ];
          let x = 28;
          let yChip = yMatTitle + 14;
          const maxY = by - 44; // ボタンと重ならない上限
          let lastChipBottom = yChip;
          ctx.font = 'bold 11px Orbitron,Courier New';
          for (const ch of chips) {
            const lack = Math.max(0, (ch.need || 0) - (ch.have || 0));
            let txt = ch.ok
              ? `${ch.icon}${ch.name} ${ch.have}/${ch.need}`
              : `${ch.icon}${ch.name} ${ch.have}/${ch.need}（不足${lack}）`;
            let w2 = Math.min(W - 56, ctx.measureText(txt).width + 30);
            if (x + w2 > W - 28) { x = 28; yChip += 28; }
            if (yChip > maxY) break;

            ctx.fillStyle = ch.ok ? 'rgba(255,180,90,0.18)' : 'rgba(255,80,80,0.16)';
            ctx.strokeStyle = ch.ok ? 'rgba(255,180,90,0.55)' : 'rgba(255,80,80,0.55)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.roundRect(x, yChip, w2, 22, 10); ctx.fill(); ctx.stroke();

            ctx.fillStyle = ch.ok ? 'rgba(255,220,160,0.85)' : 'rgba(255,120,120,0.92)';
            ctx.textAlign = 'left';
            const maxTextW = w2 - 24;
            if (ctx.measureText(txt).width > maxTextW) {
              const ell = '…';
              while (txt.length > 1 && ctx.measureText(txt + ell).width > maxTextW) { txt = txt.slice(0, -1); }
              txt = txt + ell;
            }
            ctx.fillText(txt, x + 12, yChip + 15);

            lastChipBottom = Math.max(lastChipBottom, yChip + 22);
            x += w2 + 10;
          }
        }

        // Lvアップボタン
        ctx.fillStyle = can ? 'rgba(255,140,40,0.92)' : 'rgba(120,120,140,0.30)';
        ctx.strokeStyle = can ? 'rgba(255,180,90,0.95)' : 'rgba(120,140,190,0.25)'; ctx.lineWidth = 2;
        ctx.shadowColor = can ? 'rgba(255,140,40,0.9)' : 'transparent'; ctx.shadowBlur = can ? 18 : 0;
        ctx.beginPath(); ctx.roundRect(bx, by, btnW, btnH, 14); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = can ? '#1a0a00' : 'rgba(220,230,255,0.35)'; ctx.font = 'bold 16px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText(can ? 'Lvアップ' : '素材不足', W / 2, by + 30);

        ctx.restore();
      }
    }
  }

  // ペット強化: 下部に展開する「強化モード」UI（モーダル廃止）
  if (game.state === 'loadout' && game.loadoutTab === 2 && game.petUpgradePanel && game.petUpgradePanel.petId) {
    const petId = game.petUpgradePanel.petId;
    const pet = PET_POOL.find(p => p.id === petId);
    const inv = petId ? game.gachaInventory?.[petId] : null;
    if (pet && inv) {
      const changedAt = game.petUpgradePanel.changedAt || 0;
      const dt = Math.max(0, game.frameCount - changedAt);
      const dur = 10;
      const t = Math.min(1, dt / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      const open = !!game.petUpgradePanel.open;
      const p = open ? ease : (1 - ease);

      // 置き換え用：内容が切れない高さを確保（可読性のため少し高く）
      const panelH = 252;
      const yTop = H - 48 - panelH * p; // footer(546〜)の上
      if (p > 0.01) {
        ctx.save();
        // 背景
        // 強化モードの強調：背景を少し暗く
        if (open) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0, 0, W, H); }
        ctx.fillStyle = 'rgba(2,4,14,0.92)';
        ctx.strokeStyle = 'rgba(255,160,60,0.55)'; ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(255,140,40,0.6)'; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.roundRect(12, yTop, W - 24, panelH, 16); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

        const lv = inv.level || 1;
        const nextLv = Math.min(5, lv + 1);
        const cost = getPetUpgradeCost(petId);
        const can = canPetUpgrade(petId);
        const btnW = 260, btnH = 46;
        const bx = W / 2 - btnW / 2, by = yTop + panelH - (btnH + 10); // 下端(H-48)から10px上

        ctx.fillStyle = 'rgba(255,220,180,0.90)'; ctx.font = 'bold 16px Orbitron,Courier New'; ctx.textAlign = 'left';
        ctx.fillText(`強化  ${pet.label}  Lv${lv} → Lv${nextLv}`, 28, yTop + 30);

        ctx.fillStyle = 'rgba(220,235,255,0.62)'; ctx.font = '12px Orbitron,Courier New';
        ctx.fillText(pet.desc || 'スキル', 28, yTop + 50);
        const b0 = getPetParams(pet.effect, lv);
        const b1 = getPetParams(pet.effect, nextLv);
        const sec0 = (b0.intervalFrames / 60);
        const sec1 = (b1.intervalFrames / 60);
        const perMin0 = 60 / sec0;
        const perMin1 = 60 / sec1;
        const fmtS = v => `${v.toFixed(2)}秒`;
        const fmtN = v => `${v.toFixed(1)}`;

        // 強化後プレビュー（スキル直下）: 列を揃える（余白広め）
        const xLabel = 28;
        const xBefore = 168;
        const xAfter = 276;
        const xDelta = 392;
        const yHead = yTop + 76;
        const rowH = 20;
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px Orbitron,Courier New';
        ctx.fillStyle = 'rgba(230,245,255,0.55)';
        ctx.fillText('強化後', xLabel, yHead);
        ctx.font = '11px Orbitron,Courier New';
        ctx.fillStyle = 'rgba(200,220,255,0.38)';
        ctx.fillText('Before', xBefore, yHead);
        ctx.fillStyle = 'rgba(200,220,255,0.38)';
        ctx.fillText('After', xAfter, yHead);
        ctx.fillStyle = 'rgba(200,220,255,0.38)';
        ctx.fillText('差分', xDelta, yHead);

        const row1 = yHead + rowH;
        const row2 = yHead + rowH * 2;
        const fmtDeltaS = (a, b) => `${(b - a) >= 0 ? '+' : ''}${(b - a).toFixed(2)}秒`;
        const fmtDeltaN = (a, b) => `${(b - a) >= 0 ? '+' : ''}${(b - a).toFixed(1)}`;

        // 1行目: 発動間隔（％は誤解されやすいので秒差分を優先）
        ctx.font = 'bold 12px Orbitron,Courier New';
        ctx.fillStyle = 'rgba(220,235,255,0.72)';
        ctx.fillText('発動間隔', xLabel, row1);
        ctx.fillStyle = 'rgba(200,220,255,0.60)';
        ctx.fillText(fmtS(sec0), xBefore, row1);
        ctx.fillStyle = 'rgba(70,255,150,0.95)';
        ctx.fillText(fmtS(sec1), xAfter, row1);
        {
          const dTxt = fmtDeltaS(sec0, sec1);
          const pulse = 0.9 + 0.1 * Math.sin(game.frameCount * 0.12);
          ctx.fillStyle = 'rgba(120,255,190,0.98)';
          ctx.shadowColor = 'rgba(70,255,150,0.95)'; ctx.shadowBlur = 10 * pulse;
          ctx.font = 'bold 13px Orbitron,Courier New';
          ctx.fillText(dTxt, xDelta, row1);
          ctx.shadowBlur = 0;
          ctx.font = 'bold 12px Orbitron,Courier New';
        }

        // 2行目: 指標（回/分 = 擬似DPS指標）
        ctx.fillStyle = 'rgba(220,235,255,0.72)';
        ctx.fillText('発動回数/分', xLabel, row2);
        ctx.fillStyle = 'rgba(200,220,255,0.60)';
        ctx.fillText(fmtN(perMin0), xBefore, row2);
        ctx.fillStyle = 'rgba(70,255,150,0.95)';
        ctx.fillText(fmtN(perMin1), xAfter, row2);
        {
          const dTxt = fmtDeltaN(perMin0, perMin1);
          const pulse = 0.9 + 0.1 * Math.sin(game.frameCount * 0.12 + 1);
          ctx.fillStyle = 'rgba(120,255,190,0.98)';
          ctx.shadowColor = 'rgba(70,255,150,0.95)'; ctx.shadowBlur = 10 * pulse;
          ctx.font = 'bold 13px Orbitron,Courier New';
          ctx.fillText(dTxt, xDelta, row2);
          ctx.shadowBlur = 0;
          ctx.font = 'bold 12px Orbitron,Courier New';
        }

        // DPS強調（右上に目立つピル）
        const dpsPct = (perMin0 > 0) ? ((perMin1 / perMin0 - 1) * 100) : 0;
        const dpsTxt = `DPS ${dpsPct >= 0 ? '+' : ''}${dpsPct.toFixed(1)}%`;
        ctx.save(); {
          ctx.font = 'bold 14px Orbitron,Courier New';
          const tw = ctx.measureText(dpsTxt).width;
          const padX = 12, padY = 7;
          const px = W - 28 - (tw + padX * 2);
          const py = yTop + 38;
          ctx.fillStyle = 'rgba(20,60,40,0.55)';
          ctx.strokeStyle = 'rgba(70,255,150,0.65)'; ctx.lineWidth = 1.5;
          ctx.shadowColor = 'rgba(70,255,150,0.95)'; ctx.shadowBlur = 16;
          ctx.beginPath(); ctx.roundRect(px, py, tw + padX * 2, 22 + padY * 0.0, 12); ctx.fill(); ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(120,255,190,0.98)';
          ctx.fillText(dpsTxt, px + padX, py + 16);
        } ctx.restore();

        // ghostだけ無敵時間も明示（同じ列揃え）
        if (pet.effect === 'ghost') {
          const inv0 = (b0.durationFrames || 70) / 60;
          const inv1 = (b1.durationFrames || 70) / 60;
          const row3 = yHead + rowH * 3;
          ctx.font = 'bold 12px Orbitron,Courier New';
          ctx.fillStyle = 'rgba(220,235,255,0.72)';
          ctx.fillText('無敵時間', xLabel, row3);
          ctx.fillStyle = 'rgba(200,220,255,0.60)';
          ctx.fillText(fmtS(inv0), xBefore, row3);
          ctx.fillStyle = 'rgba(70,255,150,0.95)';
          ctx.fillText(fmtS(inv1), xAfter, row3);
          {
            const dTxt = fmtDeltaS(inv0, inv1);
            const pulse = 0.9 + 0.1 * Math.sin(game.frameCount * 0.12 + 2);
            ctx.fillStyle = 'rgba(120,255,190,0.98)';
            ctx.shadowColor = 'rgba(70,255,150,0.95)'; ctx.shadowBlur = 10 * pulse;
            ctx.font = 'bold 13px Orbitron,Courier New';
            ctx.fillText(dTxt, xDelta, row3);
            ctx.shadowBlur = 0;
            ctx.font = 'bold 12px Orbitron,Courier New';
          }
        }

        // 必要素材（アイコン＋数）
        if (cost) {
          const matOk = (inv.mat || 0) >= cost.mat;
          const scrapOk = !cost.scrap || (game.materials.scrap || 0) >= cost.scrap;
          const coreOk = !cost.core || (game.materials.core || 0) >= cost.core;
          const cryOk = !cost.crystal || (game.materials.crystal || 0) >= cost.crystal;
          // 素材タイトル
          ctx.textAlign = 'left';
          ctx.font = 'bold 12px Orbitron,Courier New';
          ctx.fillStyle = 'rgba(230,245,255,0.55)';
          const yMatTitle = (pet.effect === 'ghost') ? (yHead + rowH * 4) : (yHead + rowH * 3);
          ctx.fillText('必要素材', 28, yMatTitle);

          const chips = [
            { name: '複製素材', icon: '⧉', need: cost.mat, have: (inv.mat || 0), ok: matOk },
            cost.scrap ? { name: 'スクラップ', icon: '🔩', need: cost.scrap, have: (game.materials.scrap || 0), ok: scrapOk } : null,
            cost.core ? { name: 'コア', icon: '⚡', need: cost.core, have: (game.materials.core || 0), ok: coreOk } : null,
            cost.crystal ? { name: 'クリスタル', icon: '💠', need: cost.crystal, have: (game.materials.crystal || 0), ok: cryOk } : null,
          ].filter(Boolean);
          let x = 28;
          const yChipBase = yMatTitle + 14;
          let yChip = yChipBase;
          let anyLack = false;
          const lacks = [];
          let lastChipBottom = yChipBase;
          const maxY = by - 44; // ボタンと重ならない上限
          let hidden = 0;
          for (let i = 0; i < chips.length; i++) {
            const ch = chips[i];
            const lack = Math.max(0, (ch.need || 0) - (ch.have || 0));
            if (lack > 0) { anyLack = true; lacks.push(`${ch.icon}${ch.name} 不足${lack}`); }
            let txt = ch.ok
              ? `${ch.icon}${ch.name} ${(ch.have || 0)}/${ch.need}`
              : `${ch.icon}${ch.name} ${(ch.have || 0)}/${ch.need}（不足${lack}）`;
            // 幅計算と描画で同じフォントを使う（はみ出し防止）
            ctx.font = 'bold 11px Orbitron,Courier New';
            let w2 = Math.min(W - 56, ctx.measureText(txt).width + 30);
            if (x + w2 > W - 28) { x = 28; yChip += 28; }
            if (yChip > maxY) { hidden = chips.length - i; break; }
            ctx.fillStyle = ch.ok ? 'rgba(255,180,90,0.18)' : 'rgba(255,80,80,0.16)';
            ctx.strokeStyle = ch.ok ? 'rgba(255,180,90,0.55)' : 'rgba(255,80,80,0.55)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.roundRect(x, yChip, w2, 22, 10); ctx.fill(); ctx.stroke();
            ctx.fillStyle = ch.ok ? 'rgba(255,220,160,0.85)' : 'rgba(255,120,120,0.92)';
            ctx.textAlign = 'left';
            // 収まらない場合は省略
            const maxTextW = w2 - 24;
            if (ctx.measureText(txt).width > maxTextW) {
              const ell = '…';
              while (txt.length > 1 && ctx.measureText(txt + ell).width > maxTextW) {
                txt = txt.slice(0, -1);
              }
              txt = txt + ell;
            }
            ctx.fillText(txt, x + 12, yChip + 15);
            lastChipBottom = Math.max(lastChipBottom, yChip + 22);
            x += w2 + 10;
          }
          if (hidden > 0) {
            ctx.fillStyle = 'rgba(200,220,255,0.35)'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'left';
            ctx.fillText(`…他${hidden}種`, 28, Math.min(lastChipBottom + 14, maxY + 18));
          }

          // 行動誘導: まとめて不足を明示
          // 1種類不足のときはチップ内の「あとN」で十分なので、サマリーは複数不足時だけ表示
          if (anyLack && lacks.length >= 2) {
            const yHint = Math.min(lastChipBottom + 22, by - 14);
            const msg = `不足: ${lacks.join(' / ')}`;
            ctx.font = 'bold 10px Orbitron,Courier New';
            const mw = ctx.measureText(msg).width;
            ctx.fillStyle = 'rgba(255,120,120,0.92)';
            // 長い時は2行にする（簡易）
            if (mw <= W - 56) {
              ctx.fillText(msg, 28, yHint);
            } else {
              const mid = Math.ceil(lacks.length / 2);
              const a = `不足: ${lacks.slice(0, mid).join(' / ')}`;
              const b = `      ${lacks.slice(mid).join(' / ')}`;
              ctx.fillText(a, 28, Math.min(yHint, by - 26));
              ctx.fillText(b, 28, Math.min(yHint + 14, by - 12));
            }
          }
        }

        // Lvアップボタン（オレンジで最強）
        ctx.fillStyle = can ? 'rgba(255,140,40,0.92)' : 'rgba(120,120,140,0.30)';
        ctx.strokeStyle = can ? 'rgba(255,180,90,0.95)' : 'rgba(120,140,190,0.25)'; ctx.lineWidth = 2;
        ctx.shadowColor = can ? 'rgba(255,140,40,0.9)' : 'transparent'; ctx.shadowBlur = can ? 18 : 0;
        ctx.beginPath(); ctx.roundRect(bx, by, btnW, btnH, 14); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = can ? '#1a0a00' : 'rgba(220,230,255,0.35)'; ctx.font = 'bold 16px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText(can ? 'Lvアップ' : '素材不足', W / 2, by + 30);

        // 操作ガイド文は非表示（タップ外で閉じる挙動は維持）
        ctx.restore();
      }
    }
  }

  // ⑪ ビルドプリセット（右パネル最下部・3スロット）
  {
    const PREH = 26;
    const preY = LY + LH - PREH - 2;
    const slotW = Math.floor((LW - 12) / 3);
    const presets = Array.isArray(game.loadoutPresets) ? game.loadoutPresets : [];
    game._presetHits = [];
    for (let pi = 0; pi < 3; pi++) {
      const px2 = LX + 4 + pi * (slotW + 2);
      const has = !!(presets[pi] && presets[pi].charId !== undefined);
      game._presetHits.push({ i: pi, x: px2, y: preY, w: slotW, h: PREH });
      ctx.save();
      ctx.fillStyle = has ? 'rgba(255,200,50,0.10)' : 'rgba(20,24,50,0.60)';
      ctx.strokeStyle = has ? 'rgba(255,200,50,0.45)' : 'rgba(80,100,160,0.28)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(px2, preY, slotW, PREH, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = has ? 'rgba(255,210,80,0.85)' : 'rgba(150,170,210,0.35)';
      ctx.font = 'bold 9px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText(has ? `P${pi + 1} ✓` : `P${pi + 1}`, px2 + slotW / 2, preY + 17);
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(150,170,200,0.25)'; ctx.font = '8px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('プリセット (長押しで保存)', LX + LW / 2, preY - 3);
    ctx.textAlign = 'left';
  }

  // ⑮ グリッドカード ロングタップ詳細オーバーレイ
  if (game.loadoutLongPressOverlay) {
    const lp = game.loadoutLongPressOverlay;
    const item = lp.item;
    if (item) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H);
      const ow = 380, oh = 320, ox = W / 2 - ow / 2, oy = H / 2 - oh / 2;
      const rc = RARITY_COLORS[item.rarity] || item.color || '#aaa';
      ctx.fillStyle = 'rgba(2,4,16,0.97)'; ctx.strokeStyle = rc; ctx.lineWidth = 2;
      ctx.shadowColor = rc; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.roundRect(ox, oy, ow, oh, 14); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

      // レアリティ帯
      ctx.fillStyle = rc + '33';
      ctx.beginPath(); ctx.roundRect(ox + 1, oy + 1, ow - 2, 36, [13, 13, 0, 0]); ctx.fill();
      ctx.fillStyle = rc; ctx.font = 'bold 16px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.shadowColor = rc; ctx.shadowBlur = 8;
      ctx.fillText(`[${item.rarity}]  ${item.label}`, W / 2, oy + 22); ctx.shadowBlur = 0;

      let ly = oy + 46;
      ctx.fillStyle = 'rgba(200,220,255,0.60)'; ctx.font = '11px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText(item.desc || '', W / 2, ly + 12); ly += 26;

      if (item.type === 'equip' && typeof getEquipMainEffectText === 'function') {
        ctx.fillStyle = '#88ffcc'; ctx.font = 'bold 13px Orbitron,Courier New';
        ctx.fillText(getEquipMainEffectText(item), W / 2, ly + 14); ly += 26;
      }

      const inv = game.gachaInventory?.[item.id];
      const lv = inv ? (inv.level || 1) : 1;
      ctx.fillStyle = '#ffdd44'; ctx.font = 'bold 13px Orbitron,Courier New';
      ctx.fillText(`Lv ${lv} / 5`, W / 2, ly + 14); ly += 26;

      if (item.type === 'equip') {
        const stars = game.equipStars?.[item.id] || 0;
        const starStr = '★'.repeat(stars) + '☆'.repeat(5 - stars);
        ctx.fillStyle = stars > 0 ? '#ffdd44' : 'rgba(120,120,120,0.5)';
        if (stars > 0) { ctx.shadowColor = '#ffdd44'; ctx.shadowBlur = 10; }
        ctx.font = 'bold 20px serif'; ctx.textAlign = 'center';
        ctx.fillText(starStr, W / 2, ly + 20); ctx.shadowBlur = 0; ly += 32;
      }

      ctx.strokeStyle = 'rgba(100,120,200,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ox + 20, ly); ctx.lineTo(ox + ow - 20, ly); ctx.stroke(); ly += 14;

      ctx.fillStyle = 'rgba(200,220,255,0.30)'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'center';
      ctx.fillText('タップで閉じる', W / 2, oy + oh - 14);

      game._longPressOverlayCloseHit = { x: ox, y: oy, w: ow, h: oh };
    }
  }

  ctx.textAlign = 'left'; ctx.lineWidth = 1;
}
