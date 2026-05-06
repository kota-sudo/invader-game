/**
 * Pet silhouette icons for loadout / gacha / previews (local coords, caller translate+scale).
 */
import { hexToRgb } from '../game/color-utils.js';

export function drawPetShape(ctx, effect, color, rarity = 'N') {
  const s = 18;
  const rgb = (() => { try { return hexToRgb(color); } catch (e) { return null; } })();
  const rgba = (a) => rgb ? `rgba(${rgb},${a})` : color;
  const rar = String(rarity || 'N');
  const fx = (() => {
    if (rar === 'LR') return { rimA: 0.70, rimB: 16, strokeA: 0.26 };
    if (rar === 'SSR') return { rimA: 0.55, rimB: 12, strokeA: 0.22 };
    if (rar === 'SR') return { rimA: 0.40, rimB: 9, strokeA: 0.18 };
    if (rar === 'R') return { rimA: 0.28, rimB: 7, strokeA: 0.14 };
    return { rimA: 0.20, rimB: 6, strokeA: 0.12 };
  })();
  // Base gradient for all pets (avoid flat look)
  const baseFill = () => {
    const g = ctx.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, rgba(0.95));
    g.addColorStop(0.55, rgba(0.58));
    g.addColorStop(1, rgba(0.95));
    return g;
  };

  // Keep last drawn path for common outline/rim (except dragon which is custom)
  let didCommon = false;

  switch (effect) {
    case 'dragon':
      // ドラゴンっぽいシルエット（角/翼/胴/しっぽ）
      ctx.save();
      // Body (gradient)
      {
        const g = ctx.createLinearGradient(-s, -s, s, s);
        g.addColorStop(0, rgba(0.95));
        g.addColorStop(0.55, rgba(0.60));
        g.addColorStop(1, rgba(0.95));
        ctx.fillStyle = g;
      }
      ctx.beginPath();
      ctx.moveTo(-s * 0.25, -s * 0.05);
      ctx.quadraticCurveTo(0, -s * 0.55, s * 0.35, -s * 0.18); // head/neck
      ctx.quadraticCurveTo(s * 0.55, 0, s * 0.2, s * 0.22);     // chest
      ctx.quadraticCurveTo(0, s * 0.45, -s * 0.28, s * 0.22);   // belly
      ctx.quadraticCurveTo(-s * 0.62, s * 0.05, -s * 0.25, -s * 0.05); // back
      ctx.closePath(); ctx.fill();
      // Outline（レアほど少し強め）
      ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA})`; ctx.lineWidth = 1.1;
      ctx.stroke();
      // Horns
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(255,240,220,0.85)';
      ctx.beginPath();
      ctx.moveTo(s * 0.28, -s * 0.25); ctx.lineTo(s * 0.44, -s * 0.58); ctx.lineTo(s * 0.18, -s * 0.33);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.18, -s * 0.20); ctx.lineTo(s * 0.28, -s * 0.52); ctx.lineTo(s * 0.06, -s * 0.28);
      ctx.closePath(); ctx.fill();
      // Wings
      ctx.globalAlpha = 0.75;
      {
        const wg = ctx.createLinearGradient(-s, -s * 0.8, -s * 0.2, s * 0.4);
        wg.addColorStop(0, rgba(0.9));
        wg.addColorStop(1, 'rgba(0,0,0,0.18)');
        ctx.fillStyle = wg;
      }
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, -s * 0.02);
      ctx.lineTo(-s * 0.95, -s * 0.55);
      ctx.lineTo(-s * 0.55, s * 0.05);
      ctx.closePath(); ctx.fill();
      {
        const wg2 = ctx.createLinearGradient(s * 0.15, -s * 0.6, s, s * 0.2);
        wg2.addColorStop(0, rgba(0.9));
        wg2.addColorStop(1, 'rgba(0,0,0,0.18)');
        ctx.fillStyle = wg2;
      }
      ctx.beginPath();
      ctx.moveTo(s * 0.10, -s * 0.02);
      ctx.lineTo(s * 0.85, -s * 0.38);
      ctx.lineTo(s * 0.42, s * 0.04);
      ctx.closePath(); ctx.fill();
      // Tail flame
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = 'rgba(255,140,40,0.95)';
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, s * 0.10);
      ctx.lineTo(-s * 0.95, s * 0.28);
      ctx.lineTo(-s * 0.62, s * 0.30);
      ctx.closePath(); ctx.fill();
      // Eye
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(s * 0.28, -s * 0.18, 2.2, 0, Math.PI * 2); ctx.fill();
      // Specular highlight
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(s * 0.05, -s * 0.28, s * 0.25, s * 0.14, -0.35, 0, Math.PI * 2); ctx.fill();
      // Rarity rim glow（回転スパークルは不使用）
      ctx.globalAlpha = 1;
      ctx.shadowColor = rgba(fx.rimA);
      ctx.shadowBlur = fx.rimB;
      ctx.strokeStyle = rgba(0.45);
      ctx.lineWidth = 1.0;
      ctx.beginPath(); ctx.ellipse(0, 0, s * 1.05, s * 0.86, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
      break;
    case 'hawk':
      ctx.fillStyle = baseFill();
      ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.5, -s * 0.7); ctx.lineTo(-s * 0.25, 0); ctx.lineTo(-s * 0.5, s * 0.7); ctx.closePath(); ctx.fill();
      didCommon = true;
      ctx.globalAlpha = 0.38; ctx.fillStyle = '#99ccff';
      ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.15); ctx.lineTo(-s, -s * 0.7); ctx.lineTo(-s * 0.3, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-s * 0.1, s * 0.15); ctx.lineTo(-s, s * 0.7); ctx.lineTo(-s * 0.3, 0); ctx.closePath(); ctx.fill();
      break;
    case 'heal':
      ctx.fillStyle = baseFill();
      ctx.beginPath(); ctx.ellipse(0, s * 0.1, s * 0.75, s, 0, 0, Math.PI * 2); ctx.fill();
      didCommon = true;
      ctx.globalAlpha = 0.45; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(-s * 0.22, -s * 0.3, s * 0.2, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'fairy':
      ctx.fillStyle = baseFill();
      for (let p = 0; p < 4; p++) {
        const a = p * Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s); ctx.lineTo(Math.cos(a + Math.PI / 4) * s * 0.35, Math.sin(a + Math.PI / 4) * s * 0.35); ctx.closePath(); ctx.fill();
      }
      didCommon = true;
      break;
    case 'phoenix':
      ctx.save(); ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = baseFill();
      ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.5, -s * 0.85); ctx.lineTo(-s * 0.3, 0); ctx.lineTo(-s * 0.5, s * 0.85); ctx.closePath(); ctx.fill();
      didCommon = true;
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffdd00';
      ctx.beginPath(); ctx.arc(s * 0.3, 0, s * 0.32, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      break;
    case 'turtle':
      ctx.fillStyle = baseFill();
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.85, s * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      didCommon = true;
      ctx.globalAlpha = 0.5; ctx.strokeStyle = '#006600'; ctx.lineWidth = 1.5;
      for (let h = 0; h < 6; h++) { const a = h * Math.PI / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * s * 0.75, Math.sin(a) * s * 0.6); ctx.stroke(); }
      ctx.lineWidth = 1; ctx.globalAlpha = 0.9; ctx.fillStyle = '#88cc88';
      ctx.beginPath(); ctx.ellipse(-s * 0.35, -s * 0.5, s * 0.15, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 0.35, -s * 0.5, s * 0.15, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'bomber':
      ctx.fillStyle = baseFill();
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.55, s * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      didCommon = true;
      ctx.globalAlpha = 0.55; ctx.fillStyle = '#111';
      ctx.fillRect(-s * 0.5, -s * 0.15, s * 0.32, s * 0.3); ctx.fillRect(-s * 0.08, -s * 0.15, s * 0.32, s * 0.3);
      ctx.globalAlpha = 0.85; ctx.fillStyle = 'rgba(255,255,80,0.9)';
      ctx.beginPath(); ctx.ellipse(0, -s * 0.52, s * 0.35, s * 0.22, -0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, s * 0.52, s * 0.35, s * 0.22, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#ff4400';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2); ctx.fill();
      break;
    case 'ghost':
      ctx.fillStyle = baseFill();
      ctx.globalAlpha *= 0.78;
      ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 0.65, Math.PI, 0);
      ctx.lineTo(s * 0.65, s * 0.55);
      ctx.quadraticCurveTo(s * 0.42, s * 0.3, s * 0.22, s * 0.55);
      ctx.quadraticCurveTo(0, s * 0.3, -s * 0.22, s * 0.55);
      ctx.quadraticCurveTo(-s * 0.42, s * 0.3, -s * 0.65, s * 0.55);
      ctx.lineTo(-s * 0.65, s * 0.55); ctx.closePath(); ctx.fill();
      didCommon = true;
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(-s * 0.22, -s * 0.15, s * 0.13, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 0.22, -s * 0.15, s * 0.13, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'exp':
      ctx.fillStyle = baseFill();
      ctx.beginPath(); ctx.roundRect(-s * 0.7, -s * 0.7, s * 1.4, s * 1.4, 3); ctx.fill();
      didCommon = true;
      ctx.globalAlpha = 0.8; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-s * 0.28, -s * 0.22, s * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(s * 0.28, -s * 0.22, s * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -s * 0.7); ctx.lineTo(0, -s * 1.1); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, -s * 1.1, s * 0.16, 0, Math.PI * 2); ctx.fill();
      break;
    default:// coin/cat
      ctx.fillStyle = baseFill();
      ctx.beginPath(); ctx.ellipse(0, s * 0.1, s * 0.75, s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.6); ctx.lineTo(-s * 0.8, -s * 1.1); ctx.lineTo(-s * 0.15, -s * 0.7); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(s * 0.5, -s * 0.6); ctx.lineTo(s * 0.8, -s * 1.1); ctx.lineTo(s * 0.15, -s * 0.7); ctx.closePath(); ctx.fill();
      didCommon = true;
      ctx.globalAlpha = 0.85; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(-s * 0.28, -s * 0.1, s * 0.13, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 0.28, -s * 0.1, s * 0.13, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      break;
  }
  // Common rarity outline + rim（回転スパークルは不使用）
  if (effect !== 'dragon') {
    ctx.globalAlpha = 1;
    if (didCommon) {
      ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA})`; ctx.lineWidth = 1.05;
      ctx.stroke();
    }
    ctx.save();
    ctx.globalAlpha = 0.30 + fx.rimA * 0.25;
    ctx.shadowColor = rgba(fx.rimA);
    ctx.shadowBlur = fx.rimB;
    ctx.strokeStyle = rgba(0.45);
    ctx.lineWidth = 1.0;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 1.02, s * 0.92, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
