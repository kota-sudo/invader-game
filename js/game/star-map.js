import { game, actions } from './game-store.js';
import { CANVAS_W as W, CANVAS_H as H } from './constants.js';

export function initStars() {
  game.stars = [];
  for (let i = 0; i < 200; i++) game.stars.push({
    x: Math.random() * W, y: Math.random() * H,
    size: Math.random() < 0.6 ? 1 : Math.random() < 0.8 ? 1.5 : 2,
    speed: 0.08 + Math.random() * 0.4, twinkle: Math.random() * Math.PI * 2, layer: Math.floor(Math.random() * 3),
  });
}

export function genMapRoutes() {
  const pool = game.stage <= 2 ? ['normal', 'survival'] : ['normal', 'survival', 'boss_rush'];
  const a = pool[Math.floor(Math.random() * pool.length)];
  let b; do { b = pool[Math.floor(Math.random() * pool.length)]; } while (b === a);
  game.mapRoutes = [a, b];
}

export function chooseRoute(idx) {
  if (idx >= game.mapRoutes.length) return;
  let t = game.mapRoutes[idx];
  if (t === 'escort') t = 'normal';
  game.stageType = t;
  actions.nextStage();
}
