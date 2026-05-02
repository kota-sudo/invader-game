/**
 * Keyboard state + global / canvas input wiring (split from main.js).
 */
export const keys = Object.create(null);

const ARROW_SPACE = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

/**
 * @param {{ onKeyDown: (code: string, ev: KeyboardEvent) => void, onKeyUp: (code: string, ev: KeyboardEvent) => void }} h
 */
export function bindDocumentKeys(h) {
  document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    h.onKeyDown(e.code, e);
    if (ARROW_SPACE.has(e.code)) e.preventDefault();
  });
  document.addEventListener('keyup', (e) => {
    h.onKeyUp(e.code, e);
    keys[e.code] = false;
  });
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ onMouseMove: (e: MouseEvent) => void, onClick: (e: MouseEvent) => void }} h
 */
export function bindCanvasPointer(canvas, h) {
  canvas.addEventListener('mousemove', h.onMouseMove);
  canvas.addEventListener('click', h.onClick);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ onTouchStart: (e: TouchEvent) => void, onTouchMove: (e: TouchEvent) => void, onTouchEnd: (e: TouchEvent) => void }} h
 */
export function bindCanvasTouch(canvas, h) {
  const opts = { passive: false };
  canvas.addEventListener('touchstart',  e => { e.preventDefault(); h.onTouchStart(e); }, opts);
  canvas.addEventListener('touchmove',   e => { e.preventDefault(); h.onTouchMove(e);  }, opts);
  canvas.addEventListener('touchend',    e => { e.preventDefault(); h.onTouchEnd(e);   }, opts);
  canvas.addEventListener('touchcancel', e => { e.preventDefault(); h.onTouchEnd(e);   }, opts);
}
