/**
 * タイトル画面の TAP ゾーン座標（draw-ui / pointer で共有）
 */
import { CANVAS_W as W, CANVAS_H as H } from './constants.js';
import { game } from './game-store.js';

export function titleVisualDeck() {
  return !!game.titleBgImageActive;
}

const TAP_Y_NUDGE = 20;

/** TAP テキスト基準 Y（中央やや下） */
export function getTitlePromptY() {
  const deck = titleVisualDeck();
  return Math.round(H * (deck ? 0.56 : 0.54)) + TAP_Y_NUDGE;
}

/** 手描き背景時の胸コア付近 Y */
export function getTitleCoreGuideY() {
  return H * 0.34;
}

/** TAP ラベル付近ホバー（発光強化用） */
export function isTitleTapLabelHovered(mx, my) {
  const cx = W / 2;
  const py = getTitlePromptY();
  const rx = Math.min(230, W * 0.36);
  const ry = 46;
  const dx = (mx - cx) / rx;
  const dy = (my - py) / ry;
  return dx * dx + dy * dy <= 1;
}
