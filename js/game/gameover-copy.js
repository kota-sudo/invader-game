import { CONTINUE_GEM_COST } from './fuel.js';

/** HUD・ゲームオーバー表示共通のステージ表記（例: 3-2） */
export function formatStageForHud(stageNum) {
  const s = Math.max(1, Math.floor(stageNum || 1));
  const w = Math.floor((s - 1) / 10) + 1;
  const local = ((s - 1) % 10) + 1;
  return `${w}-${local}`;
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
  lines.push('', 'ボタンまたはキー: リトライ R / ↑、コンティニュー C');
  if (!gemOk) lines.push(`コンティニューはジェム 💎${CONTINUE_GEM_COST} が必要です`);
  if (game.selectedBossAbility) lines.push('同ボス再挑戦: B');
  lines.push('（出撃準備へ戻る: SPACE）');
  return lines.join('\n');
}

/** Canvas ゲームオーバーパネル用テキスト・フラグ */
export function getGameOverOverlayCopy(game) {
  const wasRecord = !!game.gameOverWasRecord;
  const gemOk = (game.gems || 0) >= CONTINUE_GEM_COST;
  const showBossRetry = !!game.selectedBossAbility;
  return {
    wasRecord,
    gemOk,
    showBossRetry,
    scoreText: `スコア: ${game.score | 0}`,
    stageLine: `STAGE ${formatStageForHud(game.stage)}`,
    continueMain: `コンティニュー 💎${CONTINUE_GEM_COST}`,
    bossRetryMain: '同ボス再挑戦',
    footer: 'タップで選択',
  };
}
