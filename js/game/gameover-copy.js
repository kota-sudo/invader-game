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
  const st = formatStageForHud(game.startStage);
  const lines = ['ゲームオーバー', `スコア: ${game.score | 0}`];
  if (wasRecord) lines.push('★ NEW RECORD! ★');
  lines.push('', '【タップで選択 · キーボード可】');
  lines.push(`タイトルへ — SPACE`);
  lines.push(`即リトライ — STAGE ${st} 先頭 · R / ↑`);
  if (gemOk) lines.push(`コンティニュー 💎${CONTINUE_GEM_COST} — ★更新なし・同ステージ先頭 · C`);
  else lines.push(`コンティニュー 💎${CONTINUE_GEM_COST} — ジェム不足`);
  if (game.selectedBossAbility) lines.push('同ボス再挑戦 — B（画面上のボタンでも可）');
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
    retrySub: `STAGE ${formatStageForHud(game.startStage)} 先頭 · R / ↑`,
    continueMain: `コンティニュー 💎${CONTINUE_GEM_COST}`,
    continueSub: gemOk ? '★更新なし · C' : 'ジェム不足',
    bossRetryMain: '同ボス再挑戦',
    bossRetrySub: 'B',
    footer: 'タップで選択（キーボードでも操作可）',
  };
}
