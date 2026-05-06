import { test } from 'node:test';
import assert from 'node:assert/strict';
import { t, setLang, currentLang, I18N_TEXT } from '../js/app/i18n.js';

test('t falls back to key when missing', () => {
  assert.equal(t('__no_such_key__'), '__no_such_key__');
});

test('t returns ja string for known key', () => {
  assert.ok(typeof I18N_TEXT.ja.appTitle === 'string');
  assert.equal(t('appTitle'), I18N_TEXT.ja.appTitle);
});

test('setLang switches pack', () => {
  const prev = currentLang;
  setLang('en');
  assert.equal(t('rotateHintJa'), I18N_TEXT.en.rotateHintJa);
  setLang('ja');
  assert.equal(t('rotateHintJa'), I18N_TEXT.ja.rotateHintJa);
  setLang(prev);
});
