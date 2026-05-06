/**
 * Missions screen (extracted from draw-screens.js)
 */
import { game } from '../game/game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from '../game/constants.js';
import { MISSION_POOL, NORMAL_QUEST_POOL } from '../game-data.js';
import { buildDailyMissionSnapshot, countDailyDoneUnclaimed } from '../game/daily-hub.js';
import { evaluateMilestoneAchievements, countMilestoneClaimable } from '../game/achievements-milestones.js';

let drawDeps;
let ensureDailyMissions;
let ensureNormalQuestProfile;
let getPlanet;
let missionEffectiveProgress;

export function setMissionsScreenDrawDeps(deps) {
  drawDeps = deps;
  ({
    ensureDailyMissions,
    ensureNormalQuestProfile,
    getPlanet,
    missionEffectiveProgress,
  } = deps);
}

function missionsScreenTab() {
  const t = game.missionsTab;
  if (t === 'track' || t === 'milestones') return t;
  return 'daily';
}

export function drawMissionsScreen() {
  const ctx = drawDeps.ctx;
  try { ensureDailyMissions(); ensureNormalQuestProfile(); } catch (e) { console.error(e); }
  if (!(game.missionClaimedSet instanceof Set)) game.missionClaimedSet = new Set();
  if (!(game.questClaimedIds instanceof Set)) game.questClaimedIds = new Set();
  if (!Number.isFinite(game.missionsScrollY)) game.missionsScrollY = 0;

  const tab = missionsScreenTab();
  const MX = 16, CW = W - MX * 2;
  const pAccent = getPlanet(game.highestStage).accent;
  const HEADER_H = 46;
  const TAB_H = 34;
  const CONTENT_TOP = HEADER_H + TAB_H;
  const FOOTER_Y = 546;
  const VIEW_H = FOOTER_Y - CONTENT_TOP;
  const dbx = MX + 6, dbw = CW - 12;

  game._missionsTabHits = [];
  game._dailyClaimHits = [];
  game._milestoneClaimHits = [];
  game._missionClaimHits = [];

  // 背景
  ctx.fillStyle = '#030609'; ctx.fillRect(0, 0, W, H);

  const DAILY_CARD_H = 76;
  const QUEST_ROW_H = 54;
  const PAD = 12;
  const activeSlotCount = Array.isArray(game.activeMissions) ? game.activeMissions.length : 0;
  const dailySectionH = 32 + activeSlotCount * DAILY_CARD_H;
  const _qClaimed0 = game.questClaimedIds instanceof Set ? game.questClaimedIds : new Set();
  const _visibleQuests = NORMAL_QUEST_POOL.filter(q => !_qClaimed0.has(q.id));
  const questSectionH = 32 + _visibleQuests.length * QUEST_ROW_H + PAD;
  const trackContentH = PAD + dailySectionH + 14 + questSectionH;

  let totalContentH = trackContentH;
  if (tab === 'daily') {
    const snap = buildDailyMissionSnapshot(game);
    const n = snap.rows.length;
    totalContentH = PAD + 32 + n * DAILY_CARD_H + PAD;
  } else if (tab === 'milestones') {
    const n = evaluateMilestoneAchievements(game).length;
    totalContentH = PAD + 28 + n * 60 + PAD;
  }

  const maxScroll = tab === 'track' ? Math.max(0, totalContentH - VIEW_H) : 0;
  game.missionsScrollY = Math.min(maxScroll, Math.max(0, game.missionsScrollY));

  // ── スクロール領域クリップ ──
  ctx.save();
  ctx.beginPath(); ctx.rect(0, CONTENT_TOP, W, VIEW_H); ctx.clip();
  const oy = CONTENT_TOP - game.missionsScrollY;

  const pulse3 = 0.85 + Math.sin(game.frameCount * 0.09) * 0.15;

  if (tab === 'daily') {
    const snap = buildDailyMissionSnapshot(game);
    const dy = oy + PAD;
    ctx.fillStyle = 'rgba(255,200,80,0.12)';
    ctx.beginPath(); ctx.roundRect(dbx, dy, dbw, 28, 4); ctx.fill();
    ctx.fillStyle = '#ffcc66'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.shadowColor = '#ffaa33'; ctx.shadowBlur = 6;
    ctx.fillText('デイリー（本日の3件）', dbx + 10, dy + 19); ctx.shadowBlur = 0;
    ctx.fillStyle = '#8899aa'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText('達成後タップで受取', dbx + dbw - 8, dy + 19);

    for (let mi = 0; mi < snap.rows.length; mi++) {
      const row = snap.rows[mi];
      const ry = dy + 32 + mi * DAILY_CARD_H;
      const cardH = DAILY_CARD_H - 4;
      const completed = row.done;
      const claimed = row.claimed;

      ctx.fillStyle = claimed ? 'rgba(30,35,45,0.92)' : completed ? 'rgba(0,40,15,0.97)' : 'rgba(8,14,30,0.95)';
      ctx.strokeStyle = claimed ? 'rgba(80,90,110,0.5)' : completed ? `rgba(0,220,80,${0.5 + pulse3 * 0.3})` : 'rgba(60,90,150,0.6)';
      ctx.lineWidth = completed && !claimed ? 2 : 1.5;
      if (completed && !claimed) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 8 * pulse3; }
      ctx.beginPath(); ctx.roundRect(dbx, ry, dbw, cardH, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

      const icx = dbx + 26, icy = ry + cardH / 2;
      ctx.fillStyle = claimed ? 'rgba(50,55,70,0.9)' : completed ? 'rgba(0,180,60,0.9)' : 'rgba(8,18,42,0.9)';
      ctx.strokeStyle = claimed ? '#556070' : completed ? '#00ee55' : '#3a5070'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(icx, icy, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = claimed ? '#778899' : completed ? '#fff' : '#4d6080'; ctx.font = 'bold 15px Courier New'; ctx.textAlign = 'center';
      ctx.fillText(claimed ? '✉' : completed ? '✓' : '○', icx, icy + 5.5);

      const tx = dbx + 50;
      ctx.fillStyle = claimed ? '#8899aa' : completed ? '#66ee99' : '#e0eeff'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText((claimed ? '受取済: ' : '') + row.label, tx, ry + 20);

      const r = row.reward || {};
      const rStr = `● ${r.coins || 0}${r.gems ? `  💎 ${r.gems}` : ''}${r.dust ? `  ✦ ${r.dust}` : ''}  ⛽ 1`;
      ctx.fillStyle = '#bbaa55'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText(rStr, tx, ry + 36);

      if (completed && !claimed) {
        const bw3 = 80, bh3 = 18, bx3 = dbx + dbw - bw3 - 6, by3 = ry + cardH - bh3 - 6;
        ctx.fillStyle = `rgba(0,${Math.round(120 + 60 * pulse3)},40,0.9)`; ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 1.5;
        ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 8 * pulse3;
        ctx.beginPath(); ctx.roundRect(bx3, by3, bw3, bh3, 5); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText('受取', bx3 + bw3 / 2, by3 + bh3 / 2 + 4);
        game._dailyClaimHits.push({ index: row.index, x: bx3, y: by3, w: bw3, h: bh3 });
      } else if (!claimed) {
        const pr = row.progress;
        const ratio2 = pr && pr.max > 0 ? Math.min(1, (pr.cur || 0) / pr.max) : 0;
        const bx2 = tx, bw2 = Math.max(0, (dbx + dbw - 90) - tx);
        ctx.fillStyle = '#050810'; ctx.beginPath(); ctx.roundRect(bx2, ry + 46, bw2, 7, 3); ctx.fill();
        if (ratio2 > 0) {
          const bg2 = ctx.createLinearGradient(bx2, 0, bx2 + bw2, 0);
          bg2.addColorStop(0, '#aa6600'); bg2.addColorStop(1, '#ffcc44');
          ctx.fillStyle = bg2; ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.roundRect(bx2, ry + 46, bw2 * ratio2, 7, 3); ctx.fill(); ctx.shadowBlur = 0;
        }
        ctx.fillStyle = '#7799bb'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'right';
        ctx.fillText(pr && pr.max > 0 ? `${pr.cur} / ${pr.max}` : '0 / ?', dbx + dbw - 8, ry + 58);
      }
    }
  } else if (tab === 'milestones') {
    const rows = evaluateMilestoneAchievements(game);
    let my = oy + PAD;
    ctx.fillStyle = 'rgba(180,100,255,0.1)';
    ctx.beginPath(); ctx.roundRect(dbx, my, dbw, 26, 4); ctx.fill();
    ctx.fillStyle = '#ddaaff'; ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.shadowColor = '#aa66ff'; ctx.shadowBlur = 5;
    ctx.fillText('段階型実績', dbx + 10, my + 18); ctx.shadowBlur = 0;
    my += 34;

    const rowH = 58;
    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];
      const qry = my + ri * rowH;
      const innerH = rowH - 6;

      ctx.fillStyle = 'rgba(10,12,28,0.94)';
      ctx.strokeStyle = row.canClaim ? 'rgba(180,120,255,0.75)' : 'rgba(55,65,100,0.5)';
      ctx.lineWidth = row.canClaim ? 1.8 : 1.2;
      ctx.beginPath(); ctx.roundRect(dbx, qry, dbw, innerH, 7); ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#dde8ff'; ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText(row.label, dbx + 10, qry + 16);
      ctx.fillStyle = '#7788aa'; ctx.font = '9px Orbitron,Courier New';
      const desc = (row.description || '').slice(0, 42);
      ctx.fillText(desc, dbx + 10, qry + 30);

      let sub = '';
      if (row.nextTierIndex != null && row.tiers && row.tiers[row.nextTierIndex]) {
        const th = row.tiers[row.nextTierIndex].threshold;
        sub = `進捗 ${row.value} / 次 ${th}`;
      } else {
        sub = `進捗 ${row.value}（全段階受取済）`;
      }
      ctx.fillStyle = '#99aacc'; ctx.font = 'bold 9px Orbitron,Courier New';
      ctx.fillText(sub, dbx + 10, qry + 44);

      if (row.canClaim && row.nextReward) {
        const bw3 = 72, bh3 = 22, bx3 = dbx + dbw - bw3 - 8, by3 = qry + (innerH - bh3) / 2;
        ctx.fillStyle = 'rgba(90,40,140,0.95)'; ctx.strokeStyle = '#cc88ff'; ctx.lineWidth = 1.5;
        ctx.shadowColor = '#aa66ff'; ctx.shadowBlur = row.canClaim ? 6 * pulse3 : 0;
        ctx.beginPath(); ctx.roundRect(bx3, by3, bw3, bh3, 5); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText('受取', bx3 + bw3 / 2, by3 + bh3 / 2 + 4);
        const nr = row.nextReward;
        ctx.fillStyle = '#ddbbff'; ctx.font = '8px Orbitron,Courier New';
        ctx.fillText(`●${nr.coins || 0}${nr.gems ? ` 💎${nr.gems}` : ''}${nr.dust ? ` ✦${nr.dust}` : ''}`, bx3 + bw3 / 2, by3 - 2);
        ctx.textAlign = 'left';
        game._milestoneClaimHits.push({ id: row.id, x: bx3, y: by3, w: bw3, h: bh3 });
      }
    }
  } else {
    // ─── track: アクティブ任務 + ノーマルクエスト ───────────────────
    const dy = oy + PAD;
    const slots = Array.isArray(game.activeMissions) ? game.activeMissions : [];

    ctx.fillStyle = 'rgba(255,140,50,0.1)';
    ctx.beginPath(); ctx.roundRect(dbx, dy, dbw, 28, 4); ctx.fill();
    ctx.fillStyle = '#ffaa55'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.shadowColor = '#ff9933'; ctx.shadowBlur = 6;
    ctx.fillText('MISSION', dbx + 10, dy + 19); ctx.shadowBlur = 0;
    ctx.fillStyle = '#778899'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText('達成したらタップで受取', dbx + dbw - 8, dy + 19);

    if (!Array.isArray(game.missionClaimAnim)) game.missionClaimAnim = [];

    for (let mi = 0; mi < slots.length; mi++) {
      const slot = slots[mi];
      const mDef = MISSION_POOL.find(m => m.id === slot.missionId);
      if (!mDef) continue;
      const ep = missionEffectiveProgress(slot);
      let completed = false; try { completed = mDef.check(ep); } catch (e2) { }
      let pr = null; try { pr = mDef.progress(ep); } catch (e2) { }

      const ry = dy + 32 + mi * DAILY_CARD_H;
      const cardH = DAILY_CARD_H - 4;

      ctx.fillStyle = completed ? 'rgba(0,40,15,0.97)' : 'rgba(8,14,30,0.95)';
      ctx.strokeStyle = completed ? `rgba(0,220,80,${0.5 + pulse3 * 0.3})` : 'rgba(60,90,150,0.6)';
      ctx.lineWidth = completed ? 2 : 1.5;
      if (completed) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 8 * pulse3; }
      ctx.beginPath(); ctx.roundRect(dbx, ry, dbw, cardH, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

      const icx = dbx + 26, icy = ry + cardH / 2;
      ctx.fillStyle = completed ? 'rgba(0,180,60,0.9)' : 'rgba(8,18,42,0.9)';
      ctx.strokeStyle = completed ? '#00ee55' : '#3a5070'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(icx, icy, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = completed ? '#fff' : '#4d6080'; ctx.font = 'bold 15px Courier New'; ctx.textAlign = 'center';
      ctx.fillText(completed ? '✓' : '○', icx, icy + 5.5);

      const tx = dbx + 50;
      ctx.fillStyle = completed ? '#66ee99' : '#e0eeff'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.shadowColor = completed ? '#00ff88' : 'transparent'; ctx.shadowBlur = completed ? 5 : 0;
      ctx.fillText(mDef.label, tx, ry + 20); ctx.shadowBlur = 0;

      const r = mDef.reward;
      const rStr = `● ${r.coins}${r.gems ? `  💎 ${r.gems}` : ''}${r.dust ? `  ✦ ${r.dust}` : ''}  ⛽ 1`;
      ctx.fillStyle = '#bbaa55'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.fillText(rStr, tx, ry + 36);

      if (completed) {
        const bw3 = 80, bh3 = 18, bx3 = dbx + dbw - bw3 - 6, by3 = ry + cardH - bh3 - 6;
        ctx.fillStyle = `rgba(0,${Math.round(120 + 60 * pulse3)},40,0.9)`; ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 1.5;
        ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 8 * pulse3;
        ctx.beginPath(); ctx.roundRect(bx3, by3, bw3, bh3, 5); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'center';
        ctx.fillText('受取', bx3 + bw3 / 2, by3 + bh3 / 2 + 4);
        game._missionClaimHits.push({ missionId: slot.missionId, x: bx3, y: by3, w: bw3, h: bh3 });
      } else {
        const ratio2 = pr && pr.max > 0 ? Math.min(1, (pr.cur || 0) / pr.max) : 0;
        const bx2 = tx, bw2 = Math.max(0, (dbx + dbw - 90) - tx);
        ctx.fillStyle = '#050810'; ctx.beginPath(); ctx.roundRect(bx2, ry + 46, bw2, 7, 3); ctx.fill();
        if (ratio2 > 0) {
          const bg2 = ctx.createLinearGradient(bx2, 0, bx2 + bw2, 0);
          bg2.addColorStop(0, '#aa4400'); bg2.addColorStop(1, '#ff9933');
          ctx.fillStyle = bg2; ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.roundRect(bx2, ry + 46, bw2 * ratio2, 7, 3); ctx.fill(); ctx.shadowBlur = 0;
        }
        ctx.fillStyle = '#7799bb'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'right';
        ctx.fillText(pr && pr.max > 0 ? `${pr.cur} / ${pr.max}` : '0 / ?', dbx + dbw - 8, ry + 58);
      }
    }

    const qy = dy + dailySectionH + 14;
    const qClaimed = game.questClaimedIds instanceof Set ? game.questClaimedIds : new Set();
    const lifeDone = NORMAL_QUEST_POOL.filter(q => qClaimed.has(q.id)).length;

    ctx.fillStyle = 'rgba(40,110,255,0.1)';
    ctx.beginPath(); ctx.roundRect(dbx, qy, dbw, 28, 4); ctx.fill();
    ctx.fillStyle = '#55aaff'; ctx.font = 'bold 13px Orbitron,Courier New'; ctx.textAlign = 'left';
    ctx.shadowColor = '#3388ff'; ctx.shadowBlur = 6;
    ctx.fillText('QUEST', dbx + 10, qy + 19); ctx.shadowBlur = 0;
    ctx.fillStyle = '#6699cc'; ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText(`${lifeDone} / ${NORMAL_QUEST_POOL.length}`, dbx + dbw - 10, qy + 19);

    for (let qi = 0; qi < _visibleQuests.length; qi++) {
      const q = _visibleQuests[qi];
      let pr; try { pr = q.progress(game.questLifetime, game); } catch (e) { pr = null; }
      let completed = false; try { completed = q.check(game.questLifetime, game); } catch (e) { }
      const qry = qy + 32 + qi * QUEST_ROW_H;
      const rowH = QUEST_ROW_H - 4;

      ctx.fillStyle = completed ? 'rgba(0,26,60,0.55)' : 'rgba(6,10,22,0.92)';
      ctx.strokeStyle = completed ? 'rgba(50,140,255,0.55)' : 'rgba(35,55,90,0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(dbx, qry, dbw, rowH, 6); ctx.fill(); ctx.stroke();

      const dotp = completed ? '#44aaff' : '#253550';
      ctx.fillStyle = dotp;
      ctx.shadowColor = completed ? dotp : 'transparent'; ctx.shadowBlur = completed ? 7 : 0;
      ctx.beginPath(); ctx.arc(dbx + 14, qry + rowH / 2, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;

      ctx.fillStyle = completed ? '#88ccff' : '#aabccc';
      ctx.font = 'bold 12px Orbitron,Courier New'; ctx.textAlign = 'left';
      ctx.shadowColor = completed ? '#66aaff' : 'transparent'; ctx.shadowBlur = completed ? 4 : 0;
      ctx.fillText(q.label, dbx + 28, qry + 17); ctx.shadowBlur = 0;

      ctx.fillStyle = '#998855'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'right';
      ctx.fillText(`● ${q.reward.coins}${q.reward.gems ? `  💎 ${q.reward.gems}` : ''}${q.reward.dust ? `  ✦ ${q.reward.dust}` : ''}`, dbx + dbw - 8, qry + 17);

      if (pr && pr.max > 0) {
        const ratio2 = Math.min(1, (pr.cur || 0) / pr.max);
        const bx = dbx + 28, bw2 = Math.floor((dbw - 140) * 0.65);
        ctx.fillStyle = '#040812'; ctx.beginPath(); ctx.roundRect(bx, qry + 27, bw2, 5, 2); ctx.fill();
        ctx.fillStyle = completed ? '#2277cc' : '#163060';
        ctx.shadowColor = completed ? '#4499ff' : 'transparent'; ctx.shadowBlur = completed ? 4 : 0;
        ctx.beginPath(); ctx.roundRect(bx, qry + 27, bw2 * ratio2, 5, 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = completed ? '#88bbee' : '#5577aa'; ctx.font = 'bold 10px Orbitron,Courier New'; ctx.textAlign = 'left';
        ctx.fillText(`${pr.cur} / ${pr.max}`, bx + bw2 + 8, qry + 33);
      } else {
        ctx.fillStyle = '#334455'; ctx.font = '10px Orbitron,Courier New'; ctx.textAlign = 'left';
        ctx.fillText('進行中', dbx + 28, qry + 37);
      }
    }
  }

  ctx.restore();

  // ── スクロールバー (track のみ) ──
  if (tab === 'track' && maxScroll > 0) {
    const sbX = W - 6, sbW = 3;
    const sbTrackH = VIEW_H - 10;
    const sbThumbH = Math.max(20, sbTrackH * (VIEW_H / totalContentH));
    const sbThumbY = CONTENT_TOP + 5 + (sbTrackH - sbThumbH) * (game.missionsScrollY / maxScroll);
    ctx.fillStyle = 'rgba(20,35,60,0.6)';
    ctx.beginPath(); ctx.roundRect(sbX, CONTENT_TOP + 5, sbW, sbTrackH, 2); ctx.fill();
    ctx.fillStyle = 'rgba(90,160,240,0.75)';
    ctx.beginPath(); ctx.roundRect(sbX, sbThumbY, sbW, sbThumbH, 2); ctx.fill();
  }

  // ── ヘッダー + タブ（固定） ──
  ctx.fillStyle = 'rgba(4,8,20,1)'; ctx.fillRect(0, 0, W, CONTENT_TOP);
  ctx.strokeStyle = 'rgba(50,80,140,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, HEADER_H); ctx.lineTo(W, HEADER_H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, CONTENT_TOP); ctx.lineTo(W, CONTENT_TOP); ctx.stroke();

  ctx.fillStyle = '#cce8ff'; ctx.font = 'bold 16px Orbitron,Courier New'; ctx.textAlign = 'left';
  ctx.shadowColor = pAccent; ctx.shadowBlur = 8;
  ctx.fillText('MISSIONS', MX, 30); ctx.shadowBlur = 0;
  if (tab === 'track' && maxScroll > 0) {
    ctx.fillStyle = '#334455'; ctx.font = '9px Orbitron,Courier New'; ctx.textAlign = 'right';
    ctx.fillText('↑↓ スクロール', W - MX, 30);
  }

  const tabDefs = [
    { key: 'daily', label: 'デイリー' },
    { key: 'track', label: '任務' },
    { key: 'milestones', label: '実績' },
  ];
  const gap = 4;
  const tabW = (CW - gap * (tabDefs.length - 1)) / tabDefs.length;
  let tx0 = MX;
  const tabY = HEADER_H + 4;
  const tabRowH = TAB_H - 8;
  const nDaily = countDailyDoneUnclaimed(game);
  const nMs = countMilestoneClaimable(game);
  const badges = { daily: nDaily, track: 0, milestones: nMs };

  for (let ti = 0; ti < tabDefs.length; ti++) {
    const td = tabDefs[ti];
    const sel = tab === td.key;
    const x = tx0 + ti * (tabW + gap);
    ctx.fillStyle = sel ? 'rgba(60,100,180,0.55)' : 'rgba(20,30,55,0.85)';
    ctx.strokeStyle = sel ? pAccent : 'rgba(70,90,130,0.45)';
    ctx.lineWidth = sel ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(x, tabY, tabW, tabRowH, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = sel ? '#ffffff' : '#99aacc'; ctx.font = 'bold 11px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText(td.label, x + tabW / 2, tabY + tabRowH / 2 + 4);
    const bd = badges[td.key] || 0;
    if (bd > 0) {
      const rx = x + tabW - 10, ry2 = tabY + 6, rr = 8;
      ctx.fillStyle = '#ff4466'; ctx.beginPath(); ctx.arc(rx, ry2, rr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Orbitron,Courier New';
      ctx.fillText(String(Math.min(9, bd)), rx, ry2 + 3);
    }
    game._missionsTabHits.push({ tab: td.key, x, y: tabY, w: tabW, h: tabRowH });
  }

  // 受取トースト
  if (game.missionClaimToast && game.missionClaimToast.timer > 0) {
    const toast = game.missionClaimToast;
    toast.timer--;
    const t = toast.timer;
    const fadeIn = Math.min(1, t / 10);
    const fadeOut = Math.min(1, (90 - t) / 8);
    const a = Math.min(fadeIn, fadeOut);
    const slideOff = t < 10 ? ((10 - t) / 10) * 30 : 0;
    ctx.save();
    ctx.globalAlpha = a;
    const tw = 300, th = 56, tx2 = (W - tw) / 2, ty2 = CONTENT_TOP + 14 + slideOff;
    ctx.fillStyle = 'rgba(0,30,15,0.97)';
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2;
    ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.roundRect(tx2, ty2, tw, th, 10); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#00ff88'; ctx.font = 'bold 14px Orbitron,Courier New'; ctx.textAlign = 'center';
    ctx.fillText('✓  受取完了！', W / 2, ty2 + 22);
    const rStr = `+${toast.coins}●${toast.gems ? `  +${toast.gems}💎` : ''}${toast.dust ? `  +${toast.dust}✦` : ''}`;
    ctx.fillStyle = '#aaffcc'; ctx.font = '11px Orbitron,Courier New';
    ctx.fillText(rStr, W / 2, ty2 + 42);
    ctx.restore();
  }
}
