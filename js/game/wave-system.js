import { game, actions } from './game-store.js';
import { CANVAS_W as W } from './constants.js';
import { playSound } from './audio.js';
import {
  getMarsWavePreset,
  marsPresetShouldAutoSpawnBossAfterWaves,
  expandMarsWaveSpawnTypes,
  countMarsWaveRegularEnemies,
  marsWaveHasMidBoss,
  marsWaveHasBoss,
} from './mars-wave-presets.js';
import { spawnInvader, spawnInvaderOfType, spawnMiniBoss } from './enemy-spawning.js';

function useMarsWavePresetNow() {
  return (
    (game.stageType === 'normal' || game.stageType === 'endless') &&
    !!getMarsWavePreset(game.stage)
  );
}

export function getWaveCount() {
  if (useMarsWavePresetNow()) {
    const p = getMarsWavePreset(game.stage);
    if (p) return p.length;
  }
  return Math.min(4, 2 + Math.floor(game.stage / 5));
}

export function getWaveSize(wn) { return Math.max(4, 3 + Math.floor(game.stage / 2) + (wn - 1) * 2); }

export function shouldSpawnBossAfterWavesClear() {
  if (!useMarsWavePresetNow()) return true;
  return marsPresetShouldAutoSpawnBossAfterWaves(game.stage);
}

export function startWave(n) {
  game.waveNum = n;
  game.waveState = 'active';
  game.waveKills = 0;
  game.waveBannerTimer = 90;
  game.invaders = [];
  game.invaderBullets = [];
  game.sessionProgress.maxWave = Math.max(game.sessionProgress.maxWave, n);
  game.questLifetime.maxWaveEver = Math.max(game.questLifetime.maxWaveEver || 0, n);
  actions.persistDailyMissionState();

  game.marsWaveAwaitMiniBossClear = false;

  const preset = useMarsWavePresetNow() ? getMarsWavePreset(game.stage) : null;
  const spec = preset && preset[n - 1];

  if (preset && spec) {
    game.waveTargetKills = countMarsWaveRegularEnemies(spec);

    if (marsWaveHasBoss(spec)) {
      actions.spawnBoss();
      game.bossPhase = true;
      playSound('event_start');
      return;
    }

    game.marsWaveAwaitMiniBossClear = marsWaveHasMidBoss(spec);

    const midN = Math.max(0, Math.floor(spec.MID_BOSS || 0));
    if (midN > 0) {
      const mbHp = Math.round(12 + game.stage * 5);
      for (let i = 0; i < midN; i++) {
        const spread = (i - (midN - 1) / 2) * 85;
        spawnMiniBoss(W / 2 - 35 + spread, 72 + i * 5, mbHp);
      }
    }

    const types = expandMarsWaveSpawnTypes(spec);
    for (const t of types) spawnInvaderOfType(t);

    playSound('event_start');
    return;
  }

  game.waveTargetKills = getWaveSize(n);
  const count = game.waveTargetKills;
  for (let i = 0; i < count; i++) spawnInvader();
  playSound('event_start');
}
