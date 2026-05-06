export function installCanvasPolyfills() {
  if (typeof CanvasRenderingContext2D !== 'undefined' && typeof CanvasRenderingContext2D.prototype.roundRect !== 'function') {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      const rr = Math.min(Math.max(0, +r || 0), Math.abs(w) / 2, Math.abs(h) / 2);
      this.moveTo(x + rr, y);
      this.lineTo(x + w - rr, y);
      this.quadraticCurveTo(x + w, y, x + w, y + rr);
      this.lineTo(x + w, y + h - rr);
      this.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      this.lineTo(x + rr, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - rr);
      this.lineTo(x, y + rr);
      this.quadraticCurveTo(x, y, x + rr, y);
      this.closePath();
      return this;
    };
  }
}
