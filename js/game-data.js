/**
 * Static game tables (split from main.js for smaller main bundle & easier editing).
 * Loaded as ES module; no runtime state here.
 */
// ===== 惑星テーマ =====
// MARS(1-10) VENUS(11-20) JUPITER(21-30) SATURN(31-40)
export const PLANET_DEFS=[
  {name:'MARS',    kanji:'火星', bg:'#0e0100', accent:'#ff4422', nebula:'rgba(120,30,0,0.16)',   ground:'#cc3311', pathCol:'rgba(180,40,0,0.5)',   num:1},
  {name:'VENUS',   kanji:'金星', bg:'#090800', accent:'#ddcc22', nebula:'rgba(80,70,0,0.15)',    ground:'#ccaa00', pathCol:'rgba(140,120,0,0.5)',  num:2},
  {name:'JUPITER', kanji:'木星', bg:'#0a0400', accent:'#ff8833', nebula:'rgba(100,50,0,0.15)',   ground:'#dd6622', pathCol:'rgba(180,80,0,0.5)',   num:3},
  {name:'SATURN',  kanji:'土星', bg:'#060608', accent:'#ccbbaa', nebula:'rgba(60,55,40,0.12)',   ground:'#aa9977', pathCol:'rgba(120,100,60,0.5)', num:4},
];
export function getPlanet(s){
  if(s<=10) return PLANET_DEFS[0];
  if(s<=20) return PLANET_DEFS[1];
  if(s<=30) return PLANET_DEFS[2];
  return PLANET_DEFS[3];
}

/** 火星ステージ選択マップ左パネル（サイトルートからの相対パス） */
export const MARS_STAGE_MAP_BG = './assets/stages/mars/mars-stage-map-bg.png';

/**
 * 火星エリア（ワールド内ローカル 1〜10）の戦闘背景。
 * グローバルステージ番号 1〜10 のみ火星。
 */
/** 戦闘出現テーブルは main.js の pickInvaderType（MARS 分岐）と対応 */
export const MARS_BATTLE_BACKGROUNDS = {
  1: './assets/stages/mars/mars-battle-bg-01-red-desert.png',
  2: './assets/stages/mars/mars-battle-bg-01-red-desert.png',
  3: './assets/stages/mars/mars-battle-bg-02-outpost.png',
  4: './assets/stages/mars/mars-battle-bg-02-outpost.png',
  5: './assets/stages/mars/mars-battle-bg-03-mining-base.png',
  6: './assets/stages/mars/mars-battle-bg-04-core-lab.png',
  7: './assets/stages/mars/mars-battle-bg-04-core-lab.png',
  8: './assets/stages/mars/mars-battle-bg-04-core-lab.png',
  9: './assets/stages/mars/mars-battle-bg-04-core-lab.png',
  10: './assets/stages/mars/mars-battle-bg-04-core-lab.png',
};

/** 戦闘画面用。火星以外や未定義は空文字（グラデのみ）。 */
export function getStageBattleBackground(stageNum) {
  const s = Math.max(1, Math.floor(stageNum || 1));
  if (getPlanet(s).name !== 'MARS') return '';
  const local = ((s - 1) % 10) + 1;
  return MARS_BATTLE_BACKGROUNDS[local] || '';
}

/** ステージメタ（現状は戦闘背景パスのみ。41以降はプレースホルダで拡張可） */
export const STAGE_DATA = Object.freeze(
  Array.from({ length: 40 }, (_, i) => {
    const stage = i + 1;
    return {
      stage,
      backgroundImage: getStageBattleBackground(stage),
    };
  })
);
export function getWorldInfo(s){
  const p=getPlanet(s);
  return {name:`${p.kanji}  ${p.name}`,bg:p.bg,accent:p.accent,pathCol:p.pathCol,num:p.num};
}
export function getPlanetEnemyColors(s){
  if(s<=10) return ['#cc3311','#ff5533','#aa2200']; // 火星: レッド
  if(s<=20) return ['#aacc00','#eedd22','#88aa00']; // 金星: イエロー
  if(s<=30) return ['#ff7722','#cc5500','#ffaa44']; // 木星: オレンジ
  return ['#aaccdd','#88aacc','#ddeeff'];           // 土星: アイシー
}
export function getStageNodePos(s,scrollOffset=0){
  const idx=s-1, row=Math.floor(idx/5), col=row%2===0?idx%5:4-(idx%5);
  return {x:55+col*93, y:165+row*135-scrollOffset};
}

export const ENEMY_PREVIEW_COLORS={normal:'#88ff88',fast:'#00ffff',tank:'#ffffff',sniper:'#ff8800',bomber:'#ff44ff',ufo_drone:'#44ccff',spider:'#aaff44',crystal:'#88aaff',heavy:'#ffccaa'};
export const ENEMY_PREVIEW_LABELS={normal:'NORMAL',fast:'FAST',tank:'TANK',sniper:'SNIPER',bomber:'BOMBER',ufo_drone:'UFO',spider:'SPIDER',crystal:'CRYSTAL',heavy:'HEAVY'};
/** ステージ選択の「主な敵」用。実装の全スポーン網羅ではなく代表タイプのみ（UI 側で件数も制限） */
export function getStageEnemyTypes(s){
  const p=getPlanet(s).name;
  if(p==='MARS'){
    const base=['normal','fast'];
    if(s>=3) base.push('spider','ufo_drone');
    if(s>=6) base.push('bomber');
    base.push('tank');
    return [...new Set(base)].slice(0,5);
  }
  if(p==='VENUS'){
    const base=['normal','fast','sniper','bomber'];
    if(s>=12) base.push('crystal');
    base.push('ufo_drone');
    return [...new Set(base)].slice(0,5);
  }
  if(p==='JUPITER'){
    const base=['normal','tank','sniper'];
    if(s>=22) base.push('heavy');
    base.push('bomber');
    return [...new Set(base)].slice(0,5);
  }
  // SATURN
  return [...new Set(['sniper','fast','tank','crystal','heavy','ufo_drone'])].slice(0,5);
}
export function drawEnemyPreviewIcon(ctx,type,s){
  const h=s*0.8;
  switch(type){
    case 'fast':
      ctx.beginPath(); ctx.moveTo(0,-h); ctx.lineTo(h*0.5,h*0.5); ctx.lineTo(0,h*0.2); ctx.lineTo(-h*0.5,h*0.5); ctx.closePath(); ctx.fill(); break;
    case 'tank':
      ctx.fillRect(-h*0.55,-h*0.5,h*1.1,h); ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(-h*0.3,-h*0.7,h*0.6,h*0.25); break;
    case 'sniper':
      ctx.fillRect(-h*0.25,-h*0.9,h*0.5,h*1.1);
      ctx.fillRect(-h*0.6,-h*0.1,h*1.2,h*0.28); break;
    case 'bomber':
      ctx.beginPath(); ctx.arc(0,0,h*0.55,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(0,-h*0.08,h*0.22,0,Math.PI*2); ctx.fill(); break;
    case 'ufo_drone':
      ctx.beginPath(); ctx.ellipse(0,0,h*0.7,h*0.28,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(0,-h*0.18,h*0.32,h*0.22,0,0,Math.PI*2); ctx.fill(); break;
    case 'spider':
      for(let leg=0;leg<4;leg++){
        const a=(leg/4)*Math.PI*2; ctx.strokeStyle=ctx.fillStyle; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*h*0.7,Math.sin(a)*h*0.7); ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(0,0,h*0.4,h*0.28,0,0,Math.PI*2); ctx.fill(); break;
    case 'crystal':
      ctx.beginPath();
      for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/6; ctx.lineTo(Math.cos(a)*h*0.6,Math.sin(a)*h*0.6);}
      ctx.closePath(); ctx.fill(); break;
    case 'heavy':
      ctx.fillRect(-h*0.7,-h*0.55,h*1.4,h*1.1);
      ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(-h*0.45,-h*0.8,h*0.9,h*0.28);
      ctx.fillRect(-h*0.85,-h*0.1,h*0.22,h*0.45); ctx.fillRect(h*0.63,-h*0.1,h*0.22,h*0.45); break;
    default: // normal
      ctx.beginPath(); ctx.moveTo(0,-h); ctx.lineTo(h*0.6,h*0.6); ctx.lineTo(-h*0.6,h*0.6); ctx.closePath(); ctx.fill();
  }
}
export const BGM_PHRASES=[
  // フレーズA: ゆったり宇宙メロ
  [[0,300],[261,250],[294,200],[0,150],[329,300],[0,200],[392,400],[0,300],
   [349,250],[329,200],[0,150],[294,300],[0,250],[261,500],[0,400]],
  // フレーズB: 少し緊張感
  [[0,200],[440,200],[0,100],[440,180],[494,220],[0,200],[523,350],[0,300],
   [494,200],[440,180],[0,150],[392,300],[0,200],[349,250],[329,200],[0,400]],
];
export const BGM_BASS=[
  [[130,600],[0,300],[146,600],[0,300],[130,600],[0,300],[110,900],[0,300]],
  [[110,600],[0,300],[130,600],[0,300],[146,600],[0,300],[130,900],[0,300]],
];
// ===== 武器 =====
export const WEAPONS=['normal','laser','homing','explosive'];
export const WEAPON_LABEL={normal:'NORMAL',laser:'LASER',homing:'HOMING',explosive:'BOMB'};
export const WEAPON_COLOR={normal:'#fff',laser:'#0ff',homing:'#f80',explosive:'#f0f'};

// ===== アップグレード =====
export const UPGRADE_POOL=[
  {id:'speed',     label:'移動速度UP',    desc:'機体がすばやくなる',           color:'#0f0'},
  {id:'firerate',  label:'連射速度UP',    desc:'弾をもっと速く撃てる',         color:'#ff0'},
  {id:'life',      label:'ライフ+1',      desc:'最大ライフが増える',           color:'#f44'},
  {id:'laser',     label:'レーザー×15',   desc:'貫通レーザー弾薬を入手',       color:'#0ff'},
  {id:'homing',    label:'ホーミング×8',  desc:'追尾ミサイル弾薬を入手',       color:'#f80'},
  {id:'explosive', label:'爆発弾×8',      desc:'範囲爆発弾薬を入手',          color:'#f0f'},
  {id:'damage',    label:'攻撃力UP',      desc:'ボスへのダメージが増える',      color:'#fa0'},
  {id:'spread',    label:'拡散弾',        desc:'通常弾が3方向に広がる',        color:'#8ff'},
  {id:'invincible',label:'鋼鉄の心',      desc:'被弾後の無敵時間が延長',       color:'#aaf'},
  {id:'bulletspd', label:'弾速UP',        desc:'弾が速くなる',                color:'#fff'},
  {id:'shieldUp',  label:'シールド',      desc:'次の攻撃を1回無効化するバリア', color:'#4af'},
];
// ===== ガチャ定義 =====
export const GACHA_POOL=[
  {id:'skin_galaxy',   rarity:'SSR',type:'skin',    label:'GALAXY SKIN',    desc:'銀河をまとった特殊スキン',    color:'#ffdd00'},
  {id:'skin_void',     rarity:'SSR',type:'skin',    label:'VOID SKIN',      desc:'虚空に溶け込む漆黒スキン',   color:'#ffdd00'},
  {id:'title_conq',    rarity:'SSR',type:'title',   label:'称号: 銀河の覇者',desc:'ゲーム内で称号を表示',       color:'#ffdd00'},
  {id:'shape_blade',   rarity:'SR', type:'shape',   label:'BLADE 機体',     desc:'刃のような鋭い新機体形状',   color:'#cc88ff'},
  {id:'trail_neon',    rarity:'SR', type:'trail',   label:'NEON トレイル',  desc:'ネオンのダッシュ軌跡',       color:'#cc88ff'},
  {id:'trail_fire',    rarity:'SR', type:'trail',   label:'FIRE トレイル',  desc:'炎のダッシュ軌跡エフェクト', color:'#cc88ff'},
  {id:'bullet_plasma', rarity:'SR', type:'bullet',  label:'PLASMA SHOT',    desc:'弾がプラズマ弾に変わる',     color:'#cc88ff'},
  {id:'color_rainbow', rarity:'R',  type:'color',   label:'RAINBOW カラー', desc:'虹色に輝く機体',             color:'#44aaff'},
  {id:'color_gold',    rarity:'R',  type:'color',   label:'GOLD カラー',    desc:'黄金に輝く機体',             color:'#44aaff'},
  {id:'passive_coin',  rarity:'R',  type:'passive', label:'コインブースト',  desc:'コイン獲得量+25%',           color:'#44aaff'},
  {id:'passive_shield',rarity:'R',  type:'passive', label:'開始シールド',    desc:'ゲーム開始時にシールド付与', color:'#44aaff'},
  {id:'color_white',   rarity:'N',  type:'color',   label:'WHITE カラー',   desc:'純白の機体カラー',           color:'#aaaaaa'},
  {id:'color_silver',  rarity:'N',  type:'color',   label:'SILVER カラー',  desc:'銀色に輝く機体カラー',       color:'#aaaaaa'},
  {id:'passive_ammo',  rarity:'N',  type:'passive', label:'初期弾薬UP',      desc:'開始時レーザー×5所持',       color:'#aaaaaa'},
  {id:'passive_exp',   rarity:'N',  type:'passive', label:'EXP ブースト',    desc:'EXP獲得量+20%',             color:'#aaaaaa'},
];
export const RARITY_COLORS={LR:'#ff2266',SSR:'#ffdd00',SR:'#cc88ff',R:'#44aaff',N:'#aaaaaa'};
export const LR_RAINBOW=['#ff2266','#ff8800','#ffee00','#00ff88','#00ccff','#aa44ff','#ff2266'];
export function getLRColor(t){ const i=Math.floor(t%6),f=(t%1); const a=LR_RAINBOW[i],b=LR_RAINBOW[i+1]; const ah=parseInt(a.slice(1,3),16),bh=parseInt(b.slice(1,3),16); const ag=parseInt(a.slice(3,5),16),bg=parseInt(b.slice(3,5),16); const ab_=parseInt(a.slice(5,7),16),bb=parseInt(b.slice(5,7),16); return `rgb(${Math.round(ah+(bh-ah)*f)},${Math.round(ag+(bg-ag)*f)},${Math.round(ab_+(bb-ab_)*f)})`; }

/** #rrggbb に 2 桁のαを付ける／rgb() は rgba に変換（canvas 用） */
export function appendColorAlpha(color, alphaHex){
  const n=parseInt(String(alphaHex),16);
  const a=Number.isFinite(n)?Math.max(0,Math.min(1,n/255)):1;
  if(!color) return `rgba(0,0,0,${a})`;
  if(color.startsWith('rgba(')) return color;
  if(color.startsWith('rgb(')) return color.replace(/^rgb\(/,'rgba(').replace(/\)$/,`,${a})`);
  if(color.startsWith('#')&&color.length===7) return color+(Number.isFinite(n)?n:0).toString(16).padStart(2,'0').slice(-2);
  return color;
}

// ===== キャラクタープール =====
export const CHAR_POOL=[
  {id:'char_dragon_lord',rarity:'LR', type:'char',label:'竜王',        desc:'ATK+60% CRIT+20% HP180 龍の魂',color:'#ff2266',hp:180,atk:1.6,def:0, crit:20,spd:0},
  {id:'char_reaper',     rarity:'LR', type:'char',label:'死神',        desc:'ATK+30% CRIT+35% SPD+4 HP120',color:'#ff2266',hp:120,atk:1.3,def:0, crit:35,spd:4},
  {id:'char_nova',    rarity:'SSR',type:'char',label:'ノヴァ',      desc:'ATK+40% CRIT+15% HP150', color:'#ffdd00',hp:150,atk:1.4,def:0, crit:15,spd:0},
  {id:'char_phantom', rarity:'SSR',type:'char',label:'ファントム',  desc:'SPD+3 CRIT+20% HP130',   color:'#ffdd00',hp:130,atk:1.0,def:0, crit:20,spd:3},
  {id:'char_iron',    rarity:'SR', type:'char',label:'鉄狼',        desc:'DEF+25% ATK+10% HP140',  color:'#cc88ff',hp:140,atk:1.1,def:25,crit:5, spd:0},
  {id:'char_flame',   rarity:'SR', type:'char',label:'インフェルノ',desc:'ATK+30% SPD+2 HP120',    color:'#cc88ff',hp:120,atk:1.3,def:0, crit:8, spd:2},
  {id:'char_swift',   rarity:'R',  type:'char',label:'サンダー',    desc:'SPD+2 CRIT+10% HP110',   color:'#44aaff',hp:110,atk:1.0,def:0, crit:10,spd:2},
  {id:'char_guard',   rarity:'R',  type:'char',label:'バルワーク',  desc:'DEF+15% HP130',          color:'#44aaff',hp:130,atk:1.0,def:15,crit:0, spd:0},
  {id:'char_basic',   rarity:'N',  type:'char',label:'ルーキー',    desc:'バランス型スターター',      color:'#aaaaaa',hp:100,atk:1.0,def:0, crit:5, spd:0},
];

// ===== 装備プール =====
export const EQUIP_POOL=[
  {id:'eq_atk_omega',  rarity:'LR', type:'equip',slot:'atk',label:'オメガエッジ',          desc:'ATK+60% CRIT+20% 伝説の刃',color:'#ff2266',atk:1.60,def:0, crit:20,spd:0,hp:0},
  {id:'eq_def_fortress',rarity:'LR', type:'equip',slot:'def',label:'フォートレスウォール',  desc:'DEF+45% HP+50 難攻不落',  color:'#ff2266',atk:1,   def:45,crit:0, spd:0,hp:50},
  {id:'eq_atk_blade', rarity:'SSR',type:'equip',slot:'atk',label:'プラズマブレード',       desc:'ATK+35% CRIT+10%', color:'#ffdd00',atk:1.35,def:0, crit:10,spd:0,hp:0},
  {id:'eq_atk_cannon',rarity:'SR', type:'equip',slot:'atk',label:'ヘヴィキャノン',         desc:'ATK+20% CRIT+8%',  color:'#cc88ff',atk:1.20,def:0, crit:8, spd:0,hp:0},
  {id:'eq_atk_boost', rarity:'R',  type:'equip',slot:'atk',label:'パワーコア',             desc:'ATK+12%',          color:'#44aaff',atk:1.12,def:0, crit:0, spd:0,hp:0},
  {id:'eq_def_armor',  rarity:'SSR',type:'equip',slot:'def',label:'タイタンアーマー',       desc:'DEF+35% HP+30',    color:'#ffdd00',atk:1,   def:35,crit:0, spd:0,hp:30},
  {id:'eq_def_shield', rarity:'SR', type:'equip',slot:'def',label:'エナジーシールド',       desc:'DEF+20% HP+20',    color:'#cc88ff',atk:1,   def:20,crit:0, spd:0,hp:20},
  {id:'eq_def_plating',rarity:'R',  type:'equip',slot:'def',label:'ハルプレート',          desc:'DEF+12%',          color:'#44aaff',atk:1,   def:12,crit:0, spd:0,hp:0},
  {id:'eq_sp_engine',  rarity:'SSR',type:'equip',slot:'sp', label:'ワープエンジン',        desc:'SPD+3 CRIT+12%',   color:'#ffdd00',atk:1,   def:0, crit:12,spd:3,hp:0},
  {id:'eq_sp_scope',   rarity:'SR', type:'equip',slot:'sp', label:'ターゲティングスコープ',desc:'CRIT+15% ATK+8%',  color:'#cc88ff',atk:1.08,def:0, crit:15,spd:0,hp:0},
  {id:'eq_sp_booster', rarity:'R',  type:'equip',slot:'sp', label:'アフターバーナー',      desc:'SPD+2',            color:'#44aaff',atk:1,   def:0, crit:0, spd:2,hp:0},
  {id:'eq_atk_edge',  rarity:'R',  type:'equip',slot:'atk',label:'エナジーエッジ',        desc:'ATK+10% SPD+1',   color:'#44aaff',atk:1.10,def:0, crit:0, spd:1,hp:0},
  {id:'eq_def_nano',  rarity:'SR', type:'equip',slot:'def',label:'ナノシールド',          desc:'DEF+18% CRIT+5%', color:'#cc88ff',atk:1.0, def:18,crit:5, spd:0,hp:10},
  {id:'eq_sp_amp',    rarity:'R',  type:'equip',slot:'sp', label:'シグナルアンプ',        desc:'CRIT+8% ATK+5%',  color:'#44aaff',atk:1.05,def:0, crit:8, spd:0,hp:0},
];

// ===== ペットプール =====
export const PET_POOL=[
  {id:'pet_fenrir',  rarity:'LR', type:'pet',label:'フェンリル',     desc:'3秒毎に8方向全弾幕',     color:'#ff2266',effect:'fenrir'},
  {id:'pet_valkyrie',rarity:'LR', type:'pet',label:'ヴァルキリー',   desc:'撃墜時1度だけHP60で復活', color:'#ff2266',effect:'valkyrie'},
  {id:'pet_phoenix',rarity:'SSR',type:'pet',label:'フェニックス',    desc:'HP30%以下で一時無敵',   color:'#ffdd00',effect:'phoenix'},
  {id:'pet_dragon', rarity:'SSR',type:'pet',label:'ドラゴン',        desc:'3秒毎に火球を発射',     color:'#ff8800',effect:'dragon'},
  {id:'pet_fairy',  rarity:'SR', type:'pet',label:'フェアリー',      desc:'コイン獲得+20%',        color:'#cc88ff',effect:'fairy'},
  {id:'pet_hawk',   rarity:'SR', type:'pet',label:'ホーク',          desc:'3秒毎にホーミング発射', color:'#88aaff',effect:'hawk'},
  {id:'pet_slime',  rarity:'R',  type:'pet',label:'スライム',        desc:'被弾時15HP回復',        color:'#44ff88',effect:'heal'},
  {id:'pet_bot',    rarity:'R',  type:'pet',label:'サポートボット',  desc:'EXP獲得+15%',          color:'#44aaff',effect:'exp'},
  {id:'pet_cat',    rarity:'N',  type:'pet',label:'スペースキャット',desc:'コイン自動吸引',        color:'#aaaaaa',effect:'coin'},
  {id:'pet_turtle', rarity:'R',  type:'pet',label:'タートル',        desc:'被ダメージ-15%',        color:'#44bb44',effect:'turtle'},
  {id:'pet_bomber', rarity:'SR', type:'pet',label:'ボンバービー',    desc:'8秒毎に爆弾投下',       color:'#ffaa00',effect:'bomber'},
  {id:'pet_ghost',  rarity:'SSR',type:'pet',label:'ゴースト',        desc:'10秒毎に無敵1秒',       color:'#aaaaff',effect:'ghost'},
];

// ===== ガチャ武器プール =====
export const WEAPON_GACHA_POOL=[
  {id:'wp_annihilator',rarity:'LR', type:'weapon',label:'アナイアレイター', desc:'絶滅レーザー砲 ×30 全貫通',  color:'#ff2266',weapon:'laser',    ammo:30},
  {id:'wp_void_cannon',rarity:'LR', type:'weapon',label:'ヴォイドキャノン', desc:'虚空収束爆弾 ×10 超広範囲',  color:'#ff2266',weapon:'explosive',ammo:10},
  {id:'wp_railgun', rarity:'SSR',type:'weapon',label:'レールガン',        desc:'超高速貫通弾 ×20',   color:'#ffdd00',weapon:'laser',  ammo:20},
  {id:'wp_missile', rarity:'SR', type:'weapon',label:'オートミサイル',    desc:'全方位ホーミング×15', color:'#cc88ff',weapon:'homing', ammo:15},
  {id:'wp_napalm',  rarity:'SR', type:'weapon',label:'ナパーム',          desc:'着弾爆発弾 ×12',     color:'#ff8800',weapon:'explosive',ammo:12},
  {id:'wp_spread',  rarity:'R',  type:'weapon',label:'スプレッドガン',    desc:'拡散レーザー ×10',   color:'#44aaff',weapon:'laser',  ammo:10},
  {id:'wp_pulse',   rarity:'R',  type:'weapon',label:'パルスキャノン',    desc:'高速連射弾 ×25',      color:'#ff8833',weapon:'laser',  ammo:25},
  {id:'wp_gravity', rarity:'SSR',type:'weapon',label:'グラビティボム',    desc:'重力爆弾 ×8',         color:'#00ffcc',weapon:'explosive',ammo:8},
  {id:'wp_scatter', rarity:'SR', type:'weapon',label:'スキャッターガン',  desc:'散弾ホーミング ×18',  color:'#aaaaff',weapon:'homing', ammo:18},
];

// ===== プレミアムガチャ専用プール（SSR/SR特化）=====
export const PREMIUM_POOL=[
  // LR (all pools)
  ...CHAR_POOL.filter(c=>c.rarity==='LR'),
  ...EQUIP_POOL.filter(e=>e.rarity==='LR'),
  ...PET_POOL.filter(p=>p.rarity==='LR'),
  ...WEAPON_GACHA_POOL.filter(w=>w.rarity==='LR'),
  {id:'passive_berserker',rarity:'LR',type:'passive',label:'BERSERKER MODE',desc:'HP50%以下でATK×1.5発動',color:'#ff2266'},
  // SSR chars
  ...CHAR_POOL.filter(c=>c.rarity==='SSR'),
  // SSR equips
  ...EQUIP_POOL.filter(e=>e.rarity==='SSR'),
  // SSR pets
  ...PET_POOL.filter(p=>p.rarity==='SSR'),
  // SSR weapons
  ...WEAPON_GACHA_POOL.filter(w=>w.rarity==='SSR'),
  // SR chars
  ...CHAR_POOL.filter(c=>c.rarity==='SR'),
  // SR equips
  ...EQUIP_POOL.filter(e=>e.rarity==='SR'),
  // SR pets
  ...PET_POOL.filter(p=>p.rarity==='SR'),
  // SR weapons
  ...WEAPON_GACHA_POOL.filter(w=>w.rarity==='SR'),
  // new passives (premium only)
  {id:'passive_counter',rarity:'SR', type:'passive',label:'COUNTER FIRE',  desc:'被弾時に反撃弾3発発射',    color:'#cc88ff'},
  {id:'passive_regen',  rarity:'SR', type:'passive',label:'HP REGEN',      desc:'5秒毎にHP+3自動回復',      color:'#cc88ff'},
  {id:'passive_shield_burst',rarity:'SSR',type:'passive',label:'SHIELD BURST',desc:'シールド発動時に爆発弾放射',color:'#ffdd00'},
];

// ピックアップローテーション（週替わり）
export const PICKUP_ROTATION=['char_nova','char_phantom','wp_gravity','pet_ghost','eq_atk_blade','eq_def_armor','pet_phoenix','eq_sp_engine'];
export const currentPickupId=PICKUP_ROTATION[Math.floor(Date.now()/(1000*60*60*24*7))%PICKUP_ROTATION.length];

export const ALL_GACHA_POOL=[...GACHA_POOL,...CHAR_POOL,...EQUIP_POOL,...PET_POOL,...WEAPON_GACHA_POOL,
  {id:'passive_counter',rarity:'SR', type:'passive',label:'COUNTER FIRE',  desc:'被弾時に反撃弾3発発射',    color:'#cc88ff'},
  {id:'passive_regen',  rarity:'SR', type:'passive',label:'HP REGEN',      desc:'5秒毎にHP+3自動回復',      color:'#cc88ff'},
  {id:'passive_shield_burst',rarity:'SSR',type:'passive',label:'SHIELD BURST',desc:'シールド発動時に爆発弾放射',color:'#ffdd00'},
  {id:'passive_berserker',rarity:'LR',type:'passive',label:'BERSERKER MODE',desc:'HP50%以下でATK×1.5発動',color:'#ff2266'},
];
export const EXP_TABLE=[0,100,250,450,700,1000,1400,1900,2500,3200];
export const LEVEL_BONUSES=[
  {stat:'firerate', label:'連射速度UP'},
  {stat:'speed',    label:'移動速度UP'},
  {stat:'damage',   label:'攻撃力UP'},
  {stat:'life',     label:'LIFE +1'},
  {stat:'bulletspd',label:'弾速UP'},
  {stat:'spread',   label:'拡散弾解放'},
  {stat:'firerate', label:'連射速度UP'},
  {stat:'speed',    label:'移動速度UP'},
  {stat:'damage',   label:'攻撃力UP'},
];
export const EVENT_LIST=[
  {id:'meteor',  label:'☄ 隕石群接近！',    color:'#f84'},
  {id:'rush',    label:'⚡ エネミーラッシュ！',color:'#f44'},
  {id:'supply',  label:'★ 補給タイム！',     color:'#0f0'},
  {id:'emp',     label:'⚡ EMP発動！',        color:'#0ff'},
];
export const SHIP_SHAPES=[
  {id:'fighter',label:'FIGHTER',desc:'バランス型・標準機体'},
  {id:'agile',  label:'AGILE',  desc:'細身・高速タイプ'},
  {id:'heavy',  label:'HEAVY',  desc:'重装甲・広い機体'},
];
export const SHIP_COLORS=[
  {hex:'#00ff88',label:'CYAN'},
  {hex:'#ff4444',label:'RED'},
  {hex:'#44aaff',label:'BLUE'},
  {hex:'#bb44ff',label:'PURPLE'},
  {hex:'#ff8800',label:'ORANGE'},
  {hex:'#ffff44',label:'YELLOW'},
];
export const SHIP_TRAITS=[
  {id:'balanced',label:'BALANCED',desc:'すべて標準。オールラウンダー',        color:'#0f0'},
  {id:'speedy',  label:'SPEEDY',  desc:'初期速度+2 / 連射速度+1',             color:'#0cf'},
  {id:'tank',    label:'TANK',    desc:'初期ライフ+2 / 無敵時間延長',          color:'#f44'},
  {id:'gunner',  label:'GUNNER',  desc:'攻撃力+1 / 弾速+3 / 連射+1',          color:'#ff0'},
];
export const SHIP_WEAPONS=[
  {id:'normal',    label:'NORMAL',    desc:'通常弾・無限',        weapon:null,        ammo:0},
  {id:'laser',     label:'LASER',     desc:'貫通レーザー ×10',    weapon:'laser',     ammo:10},
  {id:'homing',    label:'HOMING',    desc:'追尾ミサイル ×8',     weapon:'homing',    ammo:8},
  {id:'explosive', label:'EXPLOSIVE', desc:'爆発弾 ×6',            weapon:'explosive', ammo:6},
];

// ===== 実績 =====
export const ACHIEVEMENT_DEFS=[
  {id:'nodamage', label:'無敵の壁',     desc:'ステージをノーダメクリア',   icon:'🛡'},
  {id:'combo10',  label:'コンボ王',     desc:'10コンボ達成',              icon:'🔥'},
  {id:'stage5',   label:'宇宙の旅人',   desc:'ステージ5到達',             icon:'🚀'},
  {id:'stage10',  label:'星の征服者',   desc:'ステージ10到達',            icon:'⭐'},
  {id:'boss5',    label:'ボスハンター', desc:'ボスを5体撃破',             icon:'💀'},
  {id:'ultimate', label:'必殺の達人',   desc:'必殺技を使用',              icon:'⚡'},
];
export const BOSS_NAMES={burst:'BURST COMMANDER',split:'SPLIT TYRANT',teleport:'PHANTOM WRAITH',shield:'IRON GUARDIAN',dasher:'SPEED DEMON',barrage:'STORM TYRANT'};
export const MISSION_POOL=[
  {id:'kill30',  label:'敵30体撃破',        check:p=>p.kills>=30,  reward:{coins:300,dust:0,gems:0}, progress:p=>({cur:Math.min(p.kills,30),max:30})},
  {id:'kill80',  label:'敵80体撃破',        check:p=>p.kills>=80,  reward:{coins:800,dust:0,gems:2}, progress:p=>({cur:Math.min(p.kills,80),max:80})},
  {id:'kill150', label:'敵150体撃破',       check:p=>p.kills>=150, reward:{coins:1500,dust:20,gems:4}, progress:p=>({cur:Math.min(p.kills,150),max:150})},
  {id:'combo5',  label:'5コンボ達成',       check:p=>p.maxCombo>=5, reward:{coins:200,dust:5,gems:0}, progress:p=>({cur:Math.min(p.maxCombo,5),max:5})},
  {id:'combo10', label:'10コンボ達成',      check:p=>p.maxCombo>=10,reward:{coins:500,dust:15,gems:3}, progress:p=>({cur:Math.min(p.maxCombo,10),max:10})},
  {id:'combo20', label:'20コンボ達成',      check:p=>p.maxCombo>=20,reward:{coins:1400,dust:30,gems:6}, progress:p=>({cur:Math.min(p.maxCombo,20),max:20})},
  {id:'nodmg',   label:'ステージノーダメクリア',check:p=>p.noDmgStages>=1,reward:{coins:400,dust:10,gems:2}, progress:p=>({cur:Math.min(p.noDmgStages,1),max:1})},
  {id:'boss1',   label:'ボスを撃破',        check:p=>p.bossKills>=1,reward:{coins:600,dust:20,gems:5}, progress:p=>({cur:Math.min(p.bossKills,1),max:1})},
  {id:'boss2',   label:'ボスを2体撃破',     check:p=>p.bossKills>=2,reward:{coins:1300,dust:35,gems:8}, progress:p=>({cur:Math.min(p.bossKills,2),max:2})},
  {id:'clear3',  label:'3ステージクリア',   check:p=>p.stageClears>=3,reward:{coins:1000,dust:30,gems:5}, progress:p=>({cur:Math.min(p.stageClears,3),max:3})},
  {id:'clear5',  label:'5ステージクリア',   check:p=>p.stageClears>=5,reward:{coins:1800,dust:45,gems:9}, progress:p=>({cur:Math.min(p.stageClears,5),max:5})},
  {id:'ultimate',label:'必殺技を使用',      check:p=>p.ultimateUses>=1,reward:{coins:200,dust:5,gems:0}, progress:p=>({cur:Math.min(p.ultimateUses,1),max:1})},
  {id:'ultimate3',label:'必殺技を3回使用',  check:p=>p.ultimateUses>=3,reward:{coins:900,dust:20,gems:3}, progress:p=>({cur:Math.min(p.ultimateUses,3),max:3})},
  {id:'wave3',   label:'ウェーブ3を突破',   check:p=>p.maxWave>=3, reward:{coins:350,dust:8,gems:2}, progress:p=>({cur:Math.min(p.maxWave,3),max:3})},
  {id:'wave6',   label:'ウェーブ6を突破',   check:p=>p.maxWave>=6, reward:{coins:1200,dust:28,gems:5}, progress:p=>({cur:Math.min(p.maxWave,6),max:6})},
];
/** 通常クエスト（永続・達成で消えて次の目標が表示）。check(progress, game) */
export const NORMAL_QUEST_POOL=[
  {id:'nq_k500', label:'通算500体撃破', reward:{coins:1200,dust:20,gems:1},
    check:(s,_g)=>s.totalKills>=500, progress:(s,_g)=>({cur:Math.min(s.totalKills,500),max:500})},
  {id:'nq_k2000', label:'通算2000体撃破', reward:{coins:4000,dust:60,gems:5},
    check:(s,_g)=>s.totalKills>=2000, progress:(s,_g)=>({cur:Math.min(s.totalKills,2000),max:2000})},
  {id:'nq_k5000', label:'通算5000体撃破', reward:{coins:9500,dust:140,gems:14},
    check:(s,_g)=>s.totalKills>=5000, progress:(s,_g)=>({cur:Math.min(s.totalKills,5000),max:5000})},
  {id:'nq_boss5', label:'通算ボス5体撃破', reward:{coins:2000,dust:35,gems:3},
    check:(s,_g)=>s.totalBossKills>=5, progress:(s,_g)=>({cur:Math.min(s.totalBossKills,5),max:5})},
  {id:'nq_boss20', label:'通算ボス20体撃破', reward:{coins:8000,dust:100,gems:10},
    check:(s,_g)=>s.totalBossKills>=20, progress:(s,_g)=>({cur:Math.min(s.totalBossKills,20),max:20})},
  {id:'nq_hs12', label:'最高到達STAGE12', reward:{coins:2500,dust:40,gems:4},
    check:(_s,g)=>g.highestStage>=12, progress:(_s,g)=>({cur:Math.min(g.highestStage,12),max:12})},
  {id:'nq_hs25', label:'最高到達STAGE25', reward:{coins:9000,dust:120,gems:12},
    check:(_s,g)=>g.highestStage>=25, progress:(_s,g)=>({cur:Math.min(g.highestStage,25),max:25})},
  {id:'nq_hs40', label:'最高到達STAGE40', reward:{coins:18000,dust:220,gems:22},
    check:(_s,g)=>g.highestStage>=40, progress:(_s,g)=>({cur:Math.min(g.highestStage,40),max:40})},
  {id:'nq_clear15', label:'通算15ステージクリア', reward:{coins:3500,dust:50,gems:4},
    check:(s,_g)=>s.totalStageClears>=15, progress:(s,_g)=>({cur:Math.min(s.totalStageClears,15),max:15})},
  {id:'nq_clear50', label:'通算50ステージクリア', reward:{coins:11000,dust:170,gems:15},
    check:(s,_g)=>s.totalStageClears>=50, progress:(s,_g)=>({cur:Math.min(s.totalStageClears,50),max:50})},
  {id:'nq_ulti20', label:'必殺技 通算20回', reward:{coins:1800,dust:30,gems:2},
    check:(s,_g)=>s.totalUltimates>=20, progress:(s,_g)=>({cur:Math.min(s.totalUltimates,20),max:20})},
  {id:'nq_ulti80', label:'必殺技 通算80回', reward:{coins:9000,dust:120,gems:11},
    check:(s,_g)=>s.totalUltimates>=80, progress:(s,_g)=>({cur:Math.min(s.totalUltimates,80),max:80})},
  {id:'nq_combo15', label:'15コンボ以上を記録', reward:{coins:1500,dust:25,gems:2},
    check:(s,_g)=>s.maxComboEver>=15, progress:(s,_g)=>({cur:Math.min(s.maxComboEver,15),max:15})},
  {id:'nq_combo25', label:'25コンボ以上を記録', reward:{coins:7000,dust:100,gems:8},
    check:(s,_g)=>s.maxComboEver>=25, progress:(s,_g)=>({cur:Math.min(s.maxComboEver,25),max:25})},
  {id:'nq_nodmg3', label:'ノーダメクリア 通算3回', reward:{coins:2200,dust:35,gems:3},
    check:(s,_g)=>s.totalNoDmgClears>=3, progress:(s,_g)=>({cur:Math.min(s.totalNoDmgClears,3),max:3})},
  {id:'nq_nodmg10', label:'ノーダメクリア 通算10回', reward:{coins:9800,dust:150,gems:12},
    check:(s,_g)=>s.totalNoDmgClears>=10, progress:(s,_g)=>({cur:Math.min(s.totalNoDmgClears,10),max:10})},
];
export const MAT_LABEL={scrap:'🔩スクラップ',core:'⚡コア',crystal:'💎結晶',composite:'🔷コンポジット',fusionStone:'🔮融合石',starCrystal:'💫星結晶'};
export const MAT_COLOR={scrap:'#aaa',core:'#44ccff',crystal:'#cc88ff',composite:'#ffaa44',fusionStone:'#bb88ff',starCrystal:'#ffffaa'};
export const MAT_ICON={scrap:'🔩',core:'⚡',crystal:'💎',composite:'🔷',fusionStone:'🔮',starCrystal:'💫'};

export const SYNTH_RECIPES=[
  {id:'scrap_core',   label:'エネルギー抽出',   icon:'⚡', input:{scrap:8},              output:{type:'core',        n:2}},
  {id:'core_comp',    label:'コンポジット合成', icon:'🔷', input:{scrap:5,core:3},        output:{type:'composite',   n:1}},
  {id:'core_crystal', label:'量子結晶化',        icon:'💎', input:{core:8},               output:{type:'crystal',     n:1}},
  {id:'comp_fstone',  label:'融合石精製',        icon:'🔮', input:{composite:3},          output:{type:'fusionStone', n:1}},
  {id:'cry_fstone',   label:'高純度融合石',      icon:'🔮', input:{crystal:2,composite:1},output:{type:'fusionStone', n:2}},
  {id:'star_crystal', label:'星結晶生成',        icon:'💫', input:{fusionStone:3,crystal:3},output:{type:'starCrystal',n:1}},
];

// Lv毎のコスト定義 [coins, {mat:n,...}, stageReq]
export const UPGRADE_LV_COSTS=[
  [300,  {},               0],   // Lv0→1
  [600,  {scrap:2},        3],   // Lv1→2
  [1200, {scrap:5},        5],   // Lv2→3
  [2000, {core:2},         8],   // Lv3→4
  [3500, {core:5},         11],  // Lv4→5
  [5500, {scrap:3,core:3}, 15],  // Lv5→6
  [8000, {crystal:2},      21],  // Lv6→7
  [12000,{crystal:5},      28],  // Lv7→8
  [18000,{crystal:10,composite:1},35], // Lv8→9
  [25000,{crystal:10,composite:2,gems:3},40], // Lv9→10 (MAX)
];
/** 各強化段階（UPGRADE_LV_COSTS と同じ index = 現在 Lv から次へ）に必要なプロフィール Lv */
export const UPGRADE_PROFILE_LV_REQ = [1, 1, 2, 3, 4, 6, 8, 11, 14, 18];
export const SHOP_MAX_LV=10;

export const SHOP_ITEMS=[
  {id:'speed',    label:'エンジン強化',  desc:'移動速度+1 (最大+10)', stat:'speed'},
  {id:'firerate', label:'速射強化',      desc:'連射速度+1 (最大+10)', stat:'firerate'},
  {id:'maxhp',    label:'装甲強化',      desc:'最大HP+20 (最大+200)', stat:'maxhp'},
  {id:'bulletspd',label:'弾速強化',      desc:'弾速+3 (最大+30)',     stat:'bulletspd'},
  {id:'critrate', label:'照準AI',        desc:'CRIT率+5% (最大+50%)', stat:'critrate'},
  {id:'dashcd',   label:'スラスターCD',  desc:'ダッシュCD短縮 (最大Lv10)', stat:'dashcd'},
  {id:'def_regen',  label:'自動修復',      desc:'5秒毎にHP+1/Lv自動回復 (最大+10/5sec)',  stat:'def_regen'},
  {id:'spd_boost',  label:'加速ブースト',  desc:'ダッシュ速度+10%/Lv (最大+100%)',        stat:'spd_boost'},
  {id:'spd_phase',  label:'フェーズD',     desc:'ダッシュ無敵+5F/Lv (最大+50F)',          stat:'spd_phase'},
  {id:'ene_over',   label:'オーバーロード',desc:'弾速+2/Lv + Lv1以上で貫通弾',            stat:'ene_over'},
  {id:'atk_burst',  label:'バースト弾',    desc:'数秒毎に自動全方位バースト射撃 (最大7-way)', stat:'atk_burst'},
  {id:'ene_chain',  label:'チェーンボルト',desc:'撃墜時に周囲の敵へ電撃連鎖ダメージ',       stat:'ene_chain'},
  {id:'arm1',       label:'衝撃吸収',      desc:'被弾ダメージ固定軽減 -2/Lv (最大-20)',     stat:'arm1'},
  {id:'arm3',       label:'スパイク',      desc:'被弾時に近接敵へ反射ダメージ (Lv×30%)',    stat:'arm3'},
  {id:'spc1',       label:'スキャナー',    desc:'素材ドロップ率+4%/Lv (最大+40%)',          stat:'spc1'},
  {id:'spc2',       label:'重力磁場',      desc:'コイン・素材を自動吸引 半径+20/Lv (最大+200)', stat:'spc2'},
  {id:'spc3',       label:'ラッキー',      desc:'コイン獲得+10%/Lv + 大型コインチャンス',   stat:'spc3'},
];
export const STAGE_TYPE_LABELS={normal:'通常ステージ',boss_rush:'ボス連戦',survival:'サバイバル'};
export const STAGE_TYPE_DESCS={normal:'敵を倒してボスに挑む',boss_rush:'ボスが連続2回登場！',survival:'30秒間生き残れ！'};
export const STAGE_TYPE_COLORS={normal:'#0f0',boss_rush:'#f44',survival:'#0ff'};
