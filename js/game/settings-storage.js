import { readJsonObject, safeLocalStorageSetItem } from './storage-helpers.js';

const DEFAULTS = { bgm: true, vibration: true, quality: 'high', language: 'ja', titleScanlines: true };

export function loadSettings(game) {
  const s = readJsonObject('invader_settings', {});
  game.settings = Object.assign({ ...DEFAULTS }, s);
}

export function saveSettings(game) {
  safeLocalStorageSetItem('invader_settings', JSON.stringify(game.settings));
}
