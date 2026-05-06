/**
 * Equipment silhouette icons (local coords; caller translate+scale).
 */
import { hexToRgb } from '../game/color-utils.js';

export function drawEquipShape(ctx, equip, color, rarity = null) {
  const s = 18;
  const id = (equip && equip.id) || '';
  const label = (equip && equip.label) || '';
  const slot = (equip && equip.slot) || '';
  const rgb = (() => { try { return hexToRgb(color); } catch (e) { return null; } })();
  const rgba = (a) => rgb ? `rgba(${rgb},${a})` : color;
  const rar = String(rarity || equip?.rarity || 'N');
  const fx = (() => {
    if (rar === 'LR') return { rimA: 0.70, rimB: 18, strokeA: 0.26 };
    if (rar === 'SSR') return { rimA: 0.55, rimB: 14, strokeA: 0.22 };
    if (rar === 'SR') return { rimA: 0.40, rimB: 10, strokeA: 0.18 };
    if (rar === 'R') return { rimA: 0.28, rimB: 8, strokeA: 0.14 };
    return { rimA: 0.20, rimB: 6, strokeA: 0.12 };
  })();
  const isShield = (id.includes('shield') || id.includes('def_shield') || id.includes('def_nano') || label.includes('シールド'));
  const isArmor = (slot === 'def' && (label.includes('アーマー') || label.includes('プレート') || id.includes('armor') || id.includes('plating')));
  const isBlade = (slot === 'atk' && (label.includes('ブレード') || label.includes('エッジ') || id.includes('blade') || id.includes('edge')));
  const isCore = (slot === 'atk' && (label.includes('コア') || id.includes('core')));
  const isEngine = (slot === 'sp' && (label.includes('エンジン') || label.includes('バーナー') || id.includes('engine') || id.includes('booster')));
  const isScope = (slot === 'sp' && (label.includes('スコープ') || id.includes('scope')));
  const isAmp = (slot === 'sp' && (label.includes('アンプ') || id.includes('amp')));
  // Base gradient fill for “less flat” look
  const baseFill = () => {
    const g = ctx.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, rgba(0.95));
    g.addColorStop(0.55, rgba(0.55));
    g.addColorStop(1, rgba(0.95));
    return g;
  };
  ctx.fillStyle = baseFill();
  if (isShield) {
    // Shield silhouette
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.72, -s * 0.55);
    ctx.quadraticCurveTo(s * 0.78, s * 0.25, 0, s);
    ctx.quadraticCurveTo(-s * 0.78, s * 0.25, -s * 0.72, -s * 0.55);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA})`; ctx.lineWidth = 1.1; ctx.stroke();
    // Inner highlight
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.78);
    ctx.lineTo(s * 0.52, -s * 0.42);
    ctx.quadraticCurveTo(s * 0.52, s * 0.15, 0, s * 0.72);
    ctx.quadraticCurveTo(-s * 0.52, s * 0.15, -s * 0.52, -s * 0.42);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    // Center ridge
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.72); ctx.lineTo(0, s * 0.62); ctx.stroke();
  } else if (isArmor) {
    // Armor / plating: chest plate + bolts
    ctx.beginPath();
    ctx.moveTo(-s * 0.75, -s * 0.85);
    ctx.lineTo(s * 0.75, -s * 0.85);
    ctx.lineTo(s * 0.55, s * 0.65);
    ctx.quadraticCurveTo(0, s * 1.05, -s * 0.55, s * 0.65);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA * 0.9})`; ctx.lineWidth = 1.05; ctx.stroke();
    // Inner bevel
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-s * 0.52, -s * 0.65);
    ctx.lineTo(s * 0.52, -s * 0.65);
    ctx.lineTo(s * 0.38, s * 0.45);
    ctx.quadraticCurveTo(0, s * 0.78, -s * 0.38, s * 0.45);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    // Bolts
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (const bx of [-s * 0.42, s * 0.42]) {
      ctx.beginPath(); ctx.arc(bx, -s * 0.62, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bx, s * 0.18, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  } else if (isBlade) {
    // Blade: sword-ish
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.16, -s * 0.35);
    ctx.lineTo(s * 0.08, s * 0.55);
    ctx.lineTo(0, s * 0.85);
    ctx.lineTo(-s * 0.08, s * 0.55);
    ctx.lineTo(-s * 0.16, -s * 0.35);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA * 0.85})`; ctx.lineWidth = 1.0; ctx.stroke();
    // Edge highlight
    ctx.globalAlpha = 0.28; ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.92);
    ctx.lineTo(s * 0.08, -s * 0.35);
    ctx.lineTo(0, s * 0.70);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    // Guard
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.beginPath(); ctx.roundRect(-s * 0.32, s * 0.45, s * 0.64, s * 0.12, 2); ctx.fill();
  } else if (isCore) {
    // Core: hex reactor with glow ring
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i - Math.PI / 2;
      const x = Math.cos(a) * s * 0.72, y = Math.sin(a) * s * 0.72;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA * 0.75})`; ctx.lineWidth = 1.0; ctx.stroke();
    // Ring
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill();
  } else if (isScope) {
    // Scope: reticle
    ctx.beginPath(); ctx.arc(0, 0, s * 0.72, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA * 0.85})`; ctx.lineWidth = 1.0; ctx.stroke();
    ctx.globalAlpha = 0.28; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.50, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-s * 0.75, 0); ctx.lineTo(s * 0.75, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -s * 0.75); ctx.lineTo(0, s * 0.75); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.stroke();
  } else if (isAmp) {
    // Amp: signal bars
    const bars = [
      { x: -s * 0.55, h: s * 0.45 },
      { x: -s * 0.20, h: s * 0.65 },
      { x: s * 0.15, h: s * 0.85 },
      { x: s * 0.50, h: s * 0.55 },
    ];
    for (const b of bars) {
      ctx.beginPath(); ctx.roundRect(b.x, -b.h / 2, s * 0.18, b.h, 3); ctx.fill();
    }
    ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA * 0.8})`; ctx.lineWidth = 1.0;
    ctx.beginPath(); ctx.roundRect(-s * 0.72, -s * 0.72, s * 1.44, s * 1.44, 6); ctx.stroke();
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(-s * 0.68, -s * 0.68, s * 1.36, s * 1.36, 6); ctx.fill();
    ctx.globalAlpha = 1;
  } else if (isEngine) {
    // Engine: nozzle + flame
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, -s * 0.55);
    ctx.lineTo(s * 0.25, -s * 0.55);
    ctx.lineTo(s * 0.70, 0);
    ctx.lineTo(s * 0.25, s * 0.55);
    ctx.lineTo(-s * 0.55, s * 0.55);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA * 0.9})`; ctx.lineWidth = 1.0; ctx.stroke();
    // Inner
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(-s * 0.45, -s * 0.38, s * 0.70, s * 0.76, 5); ctx.fill();
    ctx.globalAlpha = 1;
    // Flame
    ctx.fillStyle = 'rgba(255,140,40,0.95)';
    ctx.beginPath();
    ctx.moveTo(s * 0.75, 0);
    ctx.lineTo(s * 1.05, -s * 0.22);
    ctx.lineTo(s * 0.95, 0);
    ctx.lineTo(s * 1.05, s * 0.22);
    ctx.closePath(); ctx.fill();
  } else {
    // Default equip gem
    ctx.beginPath(); ctx.moveTo(0, -s * 0.9); ctx.lineTo(s * 0.7, 0); ctx.lineTo(0, s * 0.9); ctx.lineTo(-s * 0.7, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${fx.strokeA * 0.85})`; ctx.lineWidth = 1.0; ctx.stroke();
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(0, -s * 0.9); ctx.lineTo(s * 0.7, 0); ctx.lineTo(0, -s * 0.25); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Outer glow rim（レアほど強く）
  ctx.save();
  ctx.globalAlpha = 0.35 + fx.rimA * 0.25;
  ctx.shadowColor = rgba(fx.rimA);
  ctx.shadowBlur = fx.rimB;
  ctx.strokeStyle = rgba(0.55);
  ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.arc(0, 0, s * 0.92, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

}

