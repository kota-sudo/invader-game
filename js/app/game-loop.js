/**
 * メイン RAF ループ（main.js から依存のみ注入して切り出し）
 */
export function startGameLoop({ runUpdate, draw, updateHUD, game, getCtx, getW, getH }) {
  function loop() {
    try {
      runUpdate();
    } catch (e) {
      console.error('runUpdate', e);
    }
    if (game.frameCount % 30 === 0) {
      try {
        updateHUD();
      } catch (_) {}
    }
    try {
      draw();
    } catch (e) {
      console.error('draw', e);
      const ctx = getCtx();
      const W = getW();
      const H = getH();
      try {
        const canvas = ctx?.canvas;
        if (canvas && typeof canvas.width === 'number') {
          canvas.width = canvas.width;
        }
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(255,80,80,0.65)';
        ctx.lineWidth = 2;
        ctx.strokeRect(18, 18, Math.max(0, W - 36), Math.max(0, H - 36));
        ctx.fillStyle = 'rgba(255,130,130,0.95)';
        ctx.font = 'bold 14px Orbitron,Courier New';
        ctx.textAlign = 'left';
        const msg = String((e && e.stack) || (e && e.message) || e || 'unknown');
        const lines = msg.split('\n').slice(0, 18);
        ctx.fillText('RENDER ERROR', 34, 48);
        ctx.fillStyle = 'rgba(230,240,255,0.9)';
        ctx.font = '12px Orbitron,Courier New';
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i].slice(0, 120), 34, 72 + i * 18);
        }
        ctx.restore();
      } catch (_e) {}
      try {
        const el = document.getElementById('message');
        if (el) {
          const msg = String((e && e.stack) || (e && e.message) || e || 'unknown');
          el.textContent = `RENDER ERROR\n\n${msg}`;
          el.classList.remove('hidden');
        }
      } catch (_e) {}
    }
    requestAnimationFrame(loop);
  }

  loop();
}
