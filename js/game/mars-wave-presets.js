/**
 * 火星ワールド（グローバル 1〜10）のウェーブ編成プリセット。
 * キーは formatStageId と同じ `world-local`（例 1-5）。
 */
import { getPlanet } from '../game-data.js';

export const MARS_STAGE_WAVE_PRESETS = {
  '1-1': [{ NORMAL: 3 }, { NORMAL: 4 }, { NORMAL: 5 }],

  '1-2': [{ NORMAL: 4 }, { NORMAL: 3, FAST: 2 }, { NORMAL: 4, FAST: 2 }],

  '1-3': [{ NORMAL: 4 }, { NORMAL: 3, TANK: 1 }, { NORMAL: 4, TANK: 2 }],

  '1-4': [
    { NORMAL: 5 },
    { NORMAL: 4, FAST: 2 },
    { NORMAL: 4, TANK: 2 },
    { NORMAL: 4, FAST: 2, TANK: 2 },
  ],

  '1-5': [{ NORMAL: 4, FAST: 2 }, { MID_BOSS: 1 }],

  '1-6': [{ NORMAL: 5 }, { NORMAL: 3, SPIDER: 3 }, { NORMAL: 4, SPIDER: 4 }],

  '1-7': [{ FAST: 4 }, { FAST: 3, UFO: 2 }, { FAST: 4, UFO: 3 }],

  '1-8': [
    { NORMAL: 5 },
    { NORMAL: 4, BOMBER: 2 },
    { NORMAL: 4, FAST: 2, BOMBER: 2 },
    { NORMAL: 5, BOMBER: 3 },
  ],

  '1-9': [
    { NORMAL: 5, FAST: 3 },
    { TANK: 2, SPIDER: 4 },
    { UFO: 3, BOMBER: 2 },
    { NORMAL: 5, FAST: 3, TANK: 2, BOMBER: 2 },
  ],

  '1-10': [{ NORMAL: 5, FAST: 3 }, { TANK: 2, BOMBER: 2 }, { BOSS: 1 }],
};

/** @param {number} stageNum */
export function getMarsWavePresetStageKey(stageNum) {
  const s = Math.max(1, Math.floor(stageNum || 1));
  if (getPlanet(s).name !== 'MARS') return null;
  const world = Math.floor((s - 1) / 10) + 1;
  const local = ((s - 1) % 10) + 1;
  return `${world}-${local}`;
}

/** @param {number} stageNum @returns {object[] | null} */
export function getMarsWavePreset(stageNum) {
  const key = getMarsWavePresetStageKey(stageNum);
  if (!key) return null;
  const preset = MARS_STAGE_WAVE_PRESETS[key];
  return preset && preset.length ? preset : null;
}

/**
 * 最終ウェーブ撃破後に既存フローでメインボスを自動生成するか。
 * - 最終行が BOSS のときは startWave 側で既に spawnBoss 済み
 * - 最終行が MID_BOSS のみのときは killMiniBoss でステージクリア（自動ボスなし）
 */
export function marsPresetShouldAutoSpawnBossAfterWaves(stageNum) {
  const preset = getMarsWavePreset(stageNum);
  if (!preset?.length) return true;
  const last = preset[preset.length - 1];
  const entries = Object.entries(last).filter(([, v]) => v > 0);
  if (entries.some(([k]) => k === 'BOSS')) return false;
  if (entries.length === 1 && entries[0][0] === 'MID_BOSS') return false;
  return true;
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** MID_BOSS / BOSS を除き invader スポーン用タイプ配列を生成（順序はランダム） */
export function expandMarsWaveSpawnTypes(spec) {
  const out = [];
  const push = (key, invType) => {
    const n = spec[key];
    if (!n || n <= 0) return;
    for (let i = 0; i < n; i++) out.push(invType);
  };
  push('NORMAL', 'normal');
  push('FAST', 'fast');
  push('TANK', 'tank');
  push('SPIDER', 'spider');
  push('UFO', 'ufo_drone');
  push('BOMBER', 'bomber');
  shuffleInPlace(out);
  return out;
}

/** MID_BOSS / BOSS を除いたウェーブ内の通常敵数 */
export function countMarsWaveRegularEnemies(spec) {
  let n = 0;
  for (const [k, v] of Object.entries(spec)) {
    if (k === 'MID_BOSS' || k === 'BOSS') continue;
    n += Math.max(0, Math.floor(Number(v) || 0));
  }
  return n;
}

export function marsWaveHasMidBoss(spec) {
  return (spec.MID_BOSS || 0) > 0;
}

export function marsWaveHasBoss(spec) {
  return (spec.BOSS || 0) > 0;
}
