import { game, actions } from './game-store.js';
import {
  SHOP_ITEMS, SHOP_MAX_LV, UPGRADE_LV_COSTS, SYNTH_RECIPES, EQUIP_POOL, getPlanet,
} from '../game-data.js';
import { saveCoins, saveGems } from './economy.js';
import { saveMaterials, saveEquipStars, saveShop, addMaterial } from './materials.js';
import { saveLoadout } from './equipment.js';
import { playSound } from './audio.js';
import { safeLocalStorageSetItem } from './storage-helpers.js';
import { triggerShopHexBurst, getShopHexNodeInfo, getShopHexMysteryHint } from './draw-shop-hex.js';

export function getUpgradeLvCost(lv) { return UPGRADE_LV_COSTS[Math.min(lv, UPGRADE_LV_COSTS.length - 1)]; }

const SHOP_PREREQS_SOLID = {
  speed: [],
  firerate: [],
  critrate: [{ id: 'firerate', lv: 2 }],
  maxhp: [],
  dashcd: [{ id: 'maxhp', lv: 2 }],
  def_regen: [{ id: 'maxhp', lv: 3 }],
  bulletspd: [{ id: 'speed', lv: 2 }],
  ene_over: [{ id: 'bulletspd', lv: 2 }],
  spd_boost: [{ id: 'speed', lv: 2 }],
  spd_phase: [{ id: 'spd_boost', lv: 1 }],
  atk_burst: [{ id: 'firerate', lv: 2 }],
  ene_chain: [{ id: 'bulletspd', lv: 2 }],
  arm1: [{ id: 'maxhp', lv: 3 }],
  arm3: [{ id: 'arm1', lv: 2 }],
  spc1: [{ id: 'speed', lv: 2 }],
  spc2: [{ id: 'spc1', lv: 2 }],
  spc3: [{ id: 'spc2', lv: 2 }],
};
const SHOP_PREREQS_GHOST = {
  speed: [],
  firerate: [],
  critrate: [{ id: 'firerate', lv: 1 }],
  maxhp: [],
  dashcd: [{ id: 'maxhp', lv: 1 }],
  def_regen: [{ id: 'maxhp', lv: 2 }],
  bulletspd: [{ id: 'speed', lv: 1 }],
  ene_over: [{ id: 'bulletspd', lv: 1 }],
  spd_boost: [{ id: 'speed', lv: 1 }],
  spd_phase: [{ id: 'spd_boost', lv: 1 }],
  atk_burst: [{ id: 'firerate', lv: 1 }],
  ene_chain: [{ id: 'bulletspd', lv: 1 }],
  arm1: [{ id: 'maxhp', lv: 2 }],
  arm3: [{ id: 'arm1', lv: 1 }],
  spc1: [{ id: 'speed', lv: 1 }],
  spc2: [{ id: 'spc1', lv: 1 }],
  spc3: [{ id: 'spc2', lv: 1 }],
};
const _MILESTONE_BRANCHES = {
  t3_overclock: ['firerate', 'critrate', 'atk_burst'],
  t3_reflect: ['maxhp', 'dashcd', 'def_regen'],
  t3_ghost: ['speed', 'spd_boost', 'spd_phase'],
  t3_nova: ['bulletspd', 'ene_over', 'ene_chain'],
  t3_chaos: ['spc1', 'spc2', 'spc3'],
};

export function isMilestoneComplete(id) {
  const branch = _MILESTONE_BRANCHES[id];
  if (!branch) return false;
  return branch.every(n => (game.shopUpgrades?.[n] || 0) >= SHOP_MAX_LV);
}
export function getShopLv(id) { return game.shopUpgrades?.[id] || 0; }
export function getShopItemById(id) { return SHOP_ITEMS.find(it => it.id === id) || null; }
export function getShopPrereqs(id, mode = 'solid') {
  const src = (mode === 'ghost') ? SHOP_PREREQS_GHOST : SHOP_PREREQS_SOLID;
  return Array.isArray(src[id]) ? src[id] : [];
}
export function isShopPrereqsMet(id, mode = 'solid') {
  const reqs = getShopPrereqs(id, mode);
  for (const r of reqs) {
    if (getShopLv(r.id) < (r.lv || 0)) return false;
  }
  return true;
}
export function getShopPrereqText(id, mode = 'solid') {
  const reqs = getShopPrereqs(id, mode);
  if (!reqs.length) return '';
  const parts = reqs.map(r => {
    const it = getShopItemById(r.id);
    const name = it ? it.label : r.id;
    return `${name}Lv${r.lv || 0}`;
  });
  return `必要: ${parts.join(' / ')}`;
}

export function canUpgradeShopItem(item) {
  const lv = game.shopUpgrades[item.id] || 0;
  if (lv >= SHOP_MAX_LV) return false;
  const [cost, mats, stReq] = getUpgradeLvCost(lv);
  if (game.highestStage < stReq) return false;
  if (!isShopPrereqsMet(item.id, 'solid')) return false;
  if (game.coins < cost) return false;
  for (const [k, v] of Object.entries(mats)) {
    if (k === 'gems') { if (game.gems < v) return false; }
    else if ((game.materials[k] || 0) < v) return false;
  }
  return true;
}

export function applyShopUpgrade(idx) {
  const item = SHOP_ITEMS[idx];
  if (!item) return;
  const beforeSolid = {};
  try {
    for (const it of SHOP_ITEMS) beforeSolid[it.id] = isShopPrereqsMet(it.id, 'solid') || (getShopLv(it.id) > 0);
  } catch (e) { }
  const lv = game.shopUpgrades[item.id] || 0;
  if (lv >= SHOP_MAX_LV) return;
  const [cost, mats, stReq] = getUpgradeLvCost(lv);
  if (game.highestStage < stReq) return;
  if (!isShopPrereqsMet(item.id, 'solid')) return;
  if (game.coins < cost) return;
  for (const [k, v] of Object.entries(mats)) {
    if (k === 'gems') { if (game.gems < v) return; }
    else if ((game.materials[k] || 0) < v) return;
  }
  game.coins -= cost; saveCoins();
  for (const [k, v] of Object.entries(mats)) {
    if (k === 'gems') { game.gems -= v; saveGems(); }
    else { game.materials[k] -= v; }
  }
  saveMaterials();
  game.shopUpgrades[item.id]++;
  saveShop();
  try {
    if (!Array.isArray(game.shopTreeRevealAnims)) game.shopTreeRevealAnims = [];
    const afterLv = (game.shopUpgrades[item.id] || 0);
    const lvBefore = afterLv - 1;
    if (lvBefore === 0 && afterLv >= 1) {
      const reqs0 = getShopPrereqs(item.id, 'solid');
      if (!reqs0.length) game.shopTreeRevealAnims.push({ from: 'core', to: item.id, start: game.frameCount, p: 0 });
    }
    for (const child of SHOP_ITEMS) {
      const nowSolid = isShopPrereqsMet(child.id, 'solid') || (getShopLv(child.id) > 0);
      if (!nowSolid || beforeSolid[child.id]) continue;
      const reqs = getShopPrereqs(child.id, 'solid');
      if (reqs.length) {
        for (const r of reqs) game.shopTreeRevealAnims.push({ from: r.id, to: child.id, start: game.frameCount, p: 0 });
      } else {
        game.shopTreeRevealAnims.push({ from: 'core', to: child.id, start: game.frameCount, p: 0 });
      }
    }
  } catch (e) { }
  playSound('upgrade_pick');
  actions.updateHUD();
  try { triggerShopHexBurst(item.id); } catch (e) { }
}

export function getStatPreviewText(item, lv) {
  if (lv >= SHOP_MAX_LV) return '';
  const n = lv + 1;
  switch (item.id) {
    case 'speed': return `移動速度  +${lv} → +${n}`;
    case 'firerate': return `連射速度  +${lv} → +${n}`;
    case 'maxhp': return `最大HP  +${lv * 20} → +${n * 20}`;
    case 'bulletspd': return `弾速  +${lv * 3} → +${n * 3}`;
    case 'critrate': return `CRIT率  +${lv * 5}% → +${n * 5}%`;
    case 'dashcd': return `無敵F  +${lv * 10} → +${n * 10}`;
    case 'def_regen': return `自動回復 +${lv}/5sec → +${n}/5sec HP`;
    case 'spd_boost': return `ダッシュ速度 +${lv * 10}% → +${n * 10}%`;
    case 'spd_phase': return `ダッシュ無敵 +${lv * 5}F → +${n * 5}F${n === 1 ? ' (有効化)' : ''}`;
    case 'ene_over': return `弾速 +${lv * 2} → +${n * 2}${n === 1 ? ' (貫通解放)' : ''}`;
    case 'atk_burst': { const w = 2 + Math.ceil(lv / 2), wn = 2 + Math.ceil(n / 2), iv = Math.max(90, 300 - (lv - 1) * 22), ivn = Math.max(90, 300 - (n - 1) * 22); return `${w}way ${(iv / 60).toFixed(1)}s毎 → ${wn}way ${(ivn / 60).toFixed(1)}s`; }
    case 'ene_chain': { const c = Math.ceil(lv / 2), cn = Math.ceil(n / 2), r = 70 + lv * 8, rn = 70 + n * 8; return `${c}連鎖 半径${r} → ${cn}連鎖 半径${rn}`; }
    case 'arm1': return `被弾軽減 -${lv * 2}ダメ → -${n * 2}ダメ`;
    case 'arm3': return `スパイク ${lv * 30}%反射 → ${n * 30}%`;
    case 'spc1': return `ドロップ率 +${lv * 4}% → +${n * 4}%`;
    case 'spc2': return `吸引半径 ${60 + lv * 20} → ${60 + n * 20}`;
    case 'spc3': return `コイン +${lv * 10}% → +${n * 10}%`;
    default: return '';
  }
}

export function getShopCurrentEffectOneLine(item, lv) {
  if (!item) return '';
  const v = Math.max(0, Math.min(Number(lv) || 0, SHOP_MAX_LV));
  switch (item.id) {
    case 'speed': return `移動速度 +${v}`;
    case 'firerate': return `連射速度 +${v}`;
    case 'maxhp': return `最大HP +${v * 20}`;
    case 'bulletspd': return `弾速 +${v * 3}`;
    case 'critrate': return `CRIT率 +${v * 5}%`;
    case 'dashcd': return `無敵F +${v * 10}`;
    case 'def_regen': return `HP +${v}/5sec 自動回復`;
    case 'spd_boost': return `ダッシュ速度 +${v * 10}%`;
    case 'spd_phase': return `ダッシュ無敵 +${v * 5}F`;
    case 'ene_over': return `弾速 +${v * 2}${v >= 1 ? ' (貫通中)' : ''}`;
    case 'atk_burst': { const w = 2 + Math.ceil(v / 2), iv = Math.max(90, 300 - (v - 1) * 22); return `${w}way バースト ${(iv / 60).toFixed(1)}s毎`; }
    case 'ene_chain': { const c = Math.ceil(v / 2), r = 70 + v * 8; return `${c}連鎖 半径${r}px`; }
    case 'arm1': return `被弾軽減 -${v * 2}ダメ`;
    case 'arm3': return `スパイク ${v * 30}%反射ダメ`;
    case 'spc1': return `ドロップ率 +${v * 4}%`;
    case 'spc2': return `吸引半径 ${60 + v * 20}px`;
    case 'spc3': return `コイン +${v * 10}%`;
    default: return '';
  }
}

const _SP_ROLE_COL = {
  core: '#a0d4ff', atk: '#ff4d5e', def: '#39e58f',
  spd: '#b266ff', ene: '#ffdd55', arm: '#44aaff',
  spc: '#ff8833', omega: '#e8e0ff',
};
const _SP_MAT_ICON = { scrap: '🔩', core: '⚙', crystal: '💎', composite: '🔮', gems: '💠' };

function _spRgb(hex) {
  if (!hex || hex.length < 7) return '136,136,255';
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;
}

export function updateShopPanel(id) {
  const panel = document.getElementById('shop-panel');
  if (!panel) return;
  const btn = document.getElementById('sp-btn');

  if (!id) {
    panel.classList.remove('open');
    if (btn) btn.onclick = null;
    return;
  }

  const nodeInfo = getShopHexNodeInfo(id);
  if (!nodeInfo) return;

  const { role, label, icon, tier, mystery, milestone, isShopItem, comingSoon, planned, desc } = nodeInfo;
  const col = _SP_ROLE_COL[role] || '#88ccff';
  const rgb = _spRgb(col);

  const item = SHOP_ITEMS.find(it => it.id === id);
  const lv = game.shopUpgrades?.[id] || 0;
  const maxLv = SHOP_MAX_LV;
  const showMystery = mystery && lv === 0;

  const iconEl = document.getElementById('sp-icon');
  if (iconEl) {
    iconEl.textContent = (showMystery && !comingSoon) ? '?' : icon;
    iconEl.style.cssText = `background:rgba(${rgb},0.12);border-color:${col};color:${col};`;
  }
  const nameEl = document.getElementById('sp-name');
  if (nameEl) {
    nameEl.textContent = (showMystery && (label === '???' || !comingSoon)) ? '???' : label;
    nameEl.style.color = col;
  }
  const tagEl = document.getElementById('sp-tag');
  if (tagEl) {
    const tl = comingSoon ? 'COMING SOON' : (planned && !isShopItem && !showMystery) ? 'PLANNED' : tier === 0 ? 'CORE' : milestone ? 'MILESTONE' : tier === 4 ? 'ULTIMATE' : `TIER ${tier}`;
    const tagCol = comingSoon ? 'rgba(255,170,80,0.80)' : (planned && !isShopItem && !showMystery) ? 'rgba(120,190,255,0.80)' : col;
    tagEl.textContent = tl; tagEl.style.color = tagCol; tagEl.style.borderColor = tagCol;
  }

  const dotsEl = document.getElementById('sp-lvdots');
  const lvTextEl = document.getElementById('sp-lvtext');
  if (dotsEl) {
    dotsEl.innerHTML = '';
    if (isShopItem) {
      for (let i = 0; i < maxLv; i++) {
        const dot = document.createElement('div');
        dot.className = 'sp-lvdot' + (i < lv ? ' on' : '');
        if (i < lv) dot.style.cssText = `background:${col};box-shadow:0 0 5px ${col};`;
        dotsEl.appendChild(dot);
      }
    }
  }
  if (lvTextEl) lvTextEl.textContent = !isShopItem ? (planned ? '近日実装予定' : '') : lv >= maxLv ? 'MAX' : lv === 0 ? '未解放' : `Lv ${lv} / ${maxLv}`;

  const effEl = document.getElementById('sp-effect');
  if (effEl) {
    if (comingSoon) {
      effEl.textContent = '次のアップデートで実装予定のブランチです。';
      effEl.style.color = 'rgba(255,170,80,0.60)';
    } else if (showMystery) {
      const hint = getShopHexMysteryHint(id);
      effEl.textContent = hint || 'この先に何があるかは、解放した者だけが知る。';
      effEl.style.color = showMystery && planned ? 'rgba(180,210,255,0.65)' : 'rgba(100,120,160,0.50)';
    } else if (planned && !isShopItem && desc) {
      effEl.textContent = desc;
      effEl.style.color = 'rgba(180,210,255,0.75)';
    } else if (isShopItem && item) {
      if (lv === 0) {
        effEl.textContent = item.desc || '-';
      } else if (lv >= maxLv) {
        effEl.textContent = getShopCurrentEffectOneLine(item, lv) + '  [MAX]';
      } else {
        effEl.textContent = getStatPreviewText(item, lv);
      }
      effEl.style.color = 'rgba(188,212,255,0.78)';
    } else {
      effEl.textContent = '';
    }
  }

  const reqInfoEl = document.getElementById('sp-req');
  if (reqInfoEl) {
    reqInfoEl.style.display = 'none';
    if (isShopItem && lv < maxLv && !isShopPrereqsMet(id)) {
      const pt = getShopPrereqText(id);
      if (pt) {
        reqInfoEl.textContent = `⚠ ${pt}`;
        reqInfoEl.style.display = 'block';
      }
    }
  }

  const costRow = document.getElementById('sp-costrow');
  if (costRow) {
    costRow.innerHTML = '';
    if (isShopItem && lv < maxLv && !showMystery) {
      const [coinCost, mats] = getUpgradeLvCost(lv);
      const coinOk = game.coins >= coinCost;
      const cs = document.createElement('span');
      cs.className = 'sp-citem ' + (coinOk ? 'ok' : 'ng');
      cs.textContent = `🪙 ${coinCost.toLocaleString()}${coinOk ? '' : ` (あと${(coinCost - game.coins).toLocaleString()})`}`;
      costRow.appendChild(cs);
      for (const [k, v] of Object.entries(mats)) {
        const have = k === 'gems' ? (game.gems || 0) : (game.materials?.[k] || 0);
        const ok2 = have >= v;
        const ms = document.createElement('span');
        ms.className = 'sp-mitem ' + (ok2 ? 'ok' : 'ng');
        ms.textContent = `${_SP_MAT_ICON[k] || k}×${v}${ok2 ? '' : ` (あと${v - have})`}`;
        costRow.appendChild(ms);
      }
    } else if (isShopItem && lv >= maxLv) {
      const sp = document.createElement('span');
      sp.className = 'sp-citem ok'; sp.textContent = '解放済み'; costRow.appendChild(sp);
    }
  }

  if (btn) {
    btn.className = '';
    btn.onclick = null;
    if (comingSoon) {
      btn.textContent = '— COMING SOON —';
      btn.className = 'maxed';
    } else if (planned && !isShopItem) {
      btn.textContent = '— 近日実装予定 —';
      btn.className = 'maxed';
    } else if (!isShopItem || id === 'core') {
      btn.textContent = id === 'core' ? '— CORE —' : '強化不可';
      btn.className = 'maxed';
    } else if (lv >= maxLv) {
      btn.textContent = '✦  MAX  LEVEL';
      btn.className = 'maxed';
    } else if (!isShopPrereqsMet(id)) {
      btn.textContent = `🔒  ${getShopPrereqText(id)}`;
      btn.className = 'off';
    } else {
      const [coinCost] = getUpgradeLvCost(lv);
      const [, , stReq] = getUpgradeLvCost(lv);
      if (game.highestStage < stReq) {
        btn.textContent = `🔒 ステージ${stReq}クリアが必要 (現在: ${game.highestStage})`;
        btn.className = 'off';
      } else if (!canUpgradeShopItem(item)) {
        btn.textContent = game.coins < coinCost ? '🪙 コイン不足' : '素材が足りない';
        btn.className = 'off';
      } else {
        const itemIdx = SHOP_ITEMS.indexOf(item);
        btn.textContent = lv === 0
          ? `解放する  —  🪙 ${coinCost.toLocaleString()}`
          : `▲ 強化する  Lv${lv + 1}へ  —  🪙 ${coinCost.toLocaleString()}`;
        btn.onclick = () => { applyShopUpgrade(itemIdx); updateShopPanel(id); };
      }
    }
  }

  panel.classList.add('open');
}

export function tryCompose(n = 1) {
  const maxN = Math.min(Math.floor((game.materials.scrap || 0) / 5), Math.floor((game.materials.core || 0) / 3));
  const times = n === 'max' ? maxN : Math.min(Number(n), maxN);
  if (times <= 0) return;
  game.materials.scrap -= 5 * times; game.materials.core -= 3 * times;
  game.materials.composite = (game.materials.composite || 0) + times;
  saveMaterials(); playSound('powerup');
  game.lifeGainDisplay = { text: `🔷 コンポジット×${times} 合成完了!`, timer: 120, color: '#ffaa44' };
}

export function tryCustomSynth(recipeId, times = 1) {
  const recipe = SYNTH_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return;
  const maxN = Object.entries(recipe.input).reduce(
    (mn, [k, v]) => Math.min(mn, Math.floor((game.materials[k] || 0) / v)), Infinity);
  const n = times === 'max' ? maxN : Math.min(Number(times), maxN);
  if (n <= 0) return;
  for (const [k, v] of Object.entries(recipe.input)) game.materials[k] = (game.materials[k] || 0) - v * n;
  game.materials[recipe.output.type] = (game.materials[recipe.output.type] || 0) + recipe.output.n * n;
  saveMaterials(); playSound('powerup');
  const icon = { scrap: '🔩', core: '⚡', crystal: '💎', composite: '🔷', fusionStone: '🔮', starCrystal: '💫' }[recipe.output.type] || '◆';
  game.lifeGainDisplay = { text: `${icon} ${recipe.label} ×${n} 完了!`, timer: 120, color: '#aaddff' };
}

const _FUSION_STAR_COSTS = [200, 500, 1000, 2000, 4000];
const _FUSION_STONE_COSTS = [1, 2, 3, 4, 5];

export function tryEquipFusion(itemId) {
  if (!itemId) return;
  const curStars = game.equipStars?.[itemId] || 0;
  if (curStars >= 5) return;
  const stoneCost = _FUSION_STONE_COSTS[curStars];
  const coinCost = _FUSION_STAR_COSTS[curStars];
  if ((game.materials?.fusionStone || 0) < stoneCost) return;
  if ((game.coins || 0) < coinCost) return;
  game.materials.fusionStone -= stoneCost;
  game.coins -= coinCost;
  game.equipStars = game.equipStars || {};
  game.equipStars[itemId] = curStars + 1;
  saveEquipStars(); saveMaterials();
  const item = [...EQUIP_POOL].find(e => e.id === itemId);
  game.lifeGainDisplay = { text: `✨ ${item?.label || itemId} ★${curStars + 1} 融合完了!`, timer: 150, color: '#ffdd44' };
  playSound('powerup');
}

export function saveLoadoutPreset(slot) {
  if (slot < 0 || slot > 2) return;
  const presets = Array.isArray(game.loadoutPresets) ? [...game.loadoutPresets] : [];
  while (presets.length < 3) presets.push(null);
  presets[slot] = {
    charId: game.playerLoadout.charId || null,
    equip: (game.playerLoadout.equip || [null,null,null]).slice(),
    pets: (game.playerLoadout.pets || [null,null,null]).slice(),
    weaponId: game.playerLoadout.weaponId || null,
  };
  game.loadoutPresets = presets;
  safeLocalStorageSetItem('invader_loadout_presets', JSON.stringify(presets));
  game.lifeGainDisplay = { text: `📋 プリセット P${slot+1} を保存`, timer: 120, color: '#ffdd44' };
  playSound('powerup');
}

export function applyLoadoutPreset(slot) {
  const presets = Array.isArray(game.loadoutPresets) ? game.loadoutPresets : [];
  const p = presets[slot];
  if (!p) {
    saveLoadoutPreset(slot);
    return;
  }
  game.playerLoadout.charId = p.charId;
  game.playerLoadout.equip = Array.isArray(p.equip) ? p.equip.slice() : [null,null,null];
  game.playerLoadout.pets = Array.isArray(p.pets) ? p.pets.slice() : [null,null,null];
  game.playerLoadout.weaponId = p.weaponId;
  saveLoadout();
  game.lifeGainDisplay = { text: `📋 プリセット P${slot+1} を適用`, timer: 120, color: '#88ffcc' };
  playSound('powerup');
}

export function dropMaterial() {
  const p = getPlanet(game.stage).name;
  const r = Math.random();
  if (p === 'MARS') {
    if (r < 0.45) addMaterial('scrap');
  } else if (p === 'VENUS' || p === 'JUPITER') {
    if (r < 0.25) addMaterial('scrap');
    if (r >= 0.25 && r < 0.55) addMaterial('core');
  } else {
    if (r < 0.30) addMaterial('crystal');
    if (r >= 0.30 && r < 0.50) addMaterial('core', Math.random() < 0.4 ? 2 : 1);
  }
}
