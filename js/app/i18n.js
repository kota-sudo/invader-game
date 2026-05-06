/**
 * 将来の多言語対応用の最小レイヤ（文言はまだ全面差し替えしない）。
 * 新規 UI では `import { t } from '../app/i18n.js'` のように利用する。
 */

/** @typedef {'ja' | 'en'} Lang */

/** 現在の表示言語 */
export let currentLang = 'ja';

/**
 * キー → 文言。ロケールごとのフラット辞書。
 * キー命名: `screen.section.element` など任意だが一意にすること。
 */
export const I18N_TEXT = {
  ja: {
    appTitle: 'INVADER CORE — GALAXY WAR',
    rotateHintJa: '横向きにしてください',
    rotateHintEn: 'Please rotate your device',
  },
  en: {
    appTitle: 'INVADER CORE — GALAXY WAR',
    rotateHintJa: 'Please use landscape mode',
    rotateHintEn: 'Please rotate your device',
  },
};

export function setLang(lang) {
  if (lang === 'ja' || lang === 'en') currentLang = lang;
}

/**
 * @param {string} key `I18N_TEXT[currentLang]` にあるキー
 * @returns {string}
 */
export function t(key) {
  const pack = I18N_TEXT[currentLang] || I18N_TEXT.ja;
  const out = pack[key];
  if (typeof out === 'string') return out;
  const fb = I18N_TEXT.ja[key];
  return typeof fb === 'string' ? fb : key;
}
