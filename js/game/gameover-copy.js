import { CONTINUE_GEM_COST } from './fuel.js';

/** HUD・ゲームオーバー表示共通のステージ表記（例: 3-2） */
export function formatStageForHud(stageNum) {
  const s = Math.max(1, Math.floor(stageNum || 1));
  const w = Math.floor((s - 1) / 10) + 1;
  const local = ((s - 1) % 10) + 1;
  return `${w}-${local}`;
}

/** ラン生存時間表示（更新ループは約60fps想定で frame 集計） */
export function formatRunDurationFrames(frames) {
  const f = Math.max(0, Math.floor(Number(frames) || 0));
  const sec = Math.floor(f / 60);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * #message 用。Canvas オーバーレイと同じ情報順・文言に近づける。
 * @param {object} game
 * @param {{ wasRecord: boolean }} opts
 */
export function buildGameOverAccessibilityMessage(game, { wasRecord }) {
  const gemOk = (game.gems || 0) >= CONTINUE_GEM_COST;
  const lines = ['ゲームオーバー', `スコア: ${game.score | 0}`];
  if (wasRecord) lines.push('★ NEW RECORD! ★');
  const runCoinsStart = Number.isFinite(game.runStartCoins) ? game.runStartCoins : game.coins | 0;
  const coinsEarned = Math.max(0, (game.coins | 0) - runCoinsStart);
  const bestShown = Math.max(0, game.hiScores?.[0] || 0);
  lines.push(
    `到達ステージ ${formatStageForHud(game.stage)}`,
    `撃破数 ${Math.max(0, game.runEnemyKills | 0)}体`,
    `生存時間 ${formatRunDurationFrames(game.runPlayFrames)}`,
    `獲得コイン +${coinsEarned.toLocaleString('ja-JP')}`,
    `BEST ${bestShown.toLocaleString('ja-JP')}`,
  );
  const scoreNum = game.score | 0;
  if (!wasRecord && scoreNum > 0 && bestShown > scoreNum) {
    lines.push(`ベストまであと ${(bestShown - scoreNum).toLocaleString('ja-JP')} pt`);
  }
  lines.push('', 'ボタンまたはキー: はじめから R / ↑、コンティニュー C、ステージ選択 S');
  if (!gemOk) lines.push(`コンティニューにはジェムが ${CONTINUE_GEM_COST} 個必要です`);
  if (game.selectedBossAbility) lines.push('同ボス再挑戦: B');
  lines.push('装備・メニュー画面へ: SPACE');
  return lines.join('\n');
}

/** Canvas ゲームオーバーパネル用テキスト・フラグ */
export function getGameOverOverlayCopy(game) {
  const wasRecord = !!game.gameOverWasRecord;
  const gemOk = (game.gems || 0) >= CONTINUE_GEM_COST;
  const showBossRetry = !!game.selectedBossAbility;
  const scoreVal = String(game.score | 0);
  const scoreNum = game.score | 0;
  const runCoinsStart = Number.isFinite(game.runStartCoins) ? game.runStartCoins : game.coins | 0;
  const coinsEarned = Math.max(0, (game.coins | 0) - runCoinsStart);
  const kills = Math.max(0, game.runEnemyKills | 0);
  const bestShown = Math.max(0, game.hiScores?.[0] || 0);
  let bestGapLine = null;
  if (!wasRecord && scoreNum > 0 && bestShown > scoreNum) {
    bestGapLine = `ベストまであと ${(bestShown - scoreNum).toLocaleString('ja-JP')} pt`;
  }
  return {
    wasRecord,
    gemOk,
    showBossRetry,
    /** オーバーレイではラベルと数値を分けて描画（中央を主役に） */
    scoreLabel: 'スコア',
    scoreValue: scoreVal,
    scoreText: `スコア: ${scoreVal}`,
    stageLine: `STAGE ${formatStageForHud(game.stage)}`,
    stageReachedLabel: '到達ステージ',
    stageReachedValue: formatStageForHud(game.stage),
    killsLine: `${kills}体`,
    survivalLine: formatRunDurationFrames(game.runPlayFrames),
    coinsEarnedLine: `+${coinsEarned.toLocaleString('ja-JP')}`,
    bestLine: bestShown.toLocaleString('ja-JP'),
    bestGapLine,
    retryMain: 'はじめから',
    /** ボタン描画は Canvas でクリスタルアイコン＋ ×cost（絵文字は使わない） */
    continueLabel: 'コンティニュー',
    continueGemCost: CONTINUE_GEM_COST,
    bossRetryMain: '同ボス再挑戦',
    stageSelectLabel: 'ステージ選択へ',
  };
}
