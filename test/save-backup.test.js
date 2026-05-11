import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAndApplyInvaderSaveJsonText, buildInvaderSaveExportObject } from '../js/game/save-backup.js';

test('parseAndApplyInvaderSaveJsonText rejects bad JSON', () => {
  assert.equal(parseAndApplyInvaderSaveJsonText('{').ok, false);
});

test('parseAndApplyInvaderSaveJsonText applies invader keys', () => {
  const store = new Map([
    ['invader_coins', '1'],
    ['invader_other', 'x'],
  ]);
  const ls = {
    getItem(k) {
      return store.has(k) ? store.get(k) : null;
    },
    setItem(k, v) {
      store.set(k, String(v));
    },
    removeItem(k) {
      store.delete(k);
    },
    get length() {
      return store.size;
    },
    key(i) {
      return [...store.keys()][i] ?? null;
    },
  };
  const prev = globalThis.localStorage;
  globalThis.localStorage = ls;
  try {
    const r = parseAndApplyInvaderSaveJsonText(
      JSON.stringify({
        v: 1,
        keys: { invader_coins: '999', invader_profile_level: '2' },
      }),
    );
    assert.equal(r.ok, true);
    assert.equal(store.get('invader_coins'), '999');
    assert.equal(store.get('invader_profile_level'), '2');
  } finally {
    globalThis.localStorage = prev;
  }
});

test('buildInvaderSaveExportObject uses localStorage snapshot', () => {
  const store = new Map([['invader_coins', '5']]);
  const ls = {
    getItem(k) {
      return store.has(k) ? store.get(k) : null;
    },
    setItem() {},
    removeItem() {},
    get length() {
      return store.size;
    },
    key(i) {
      return [...store.keys()][i] ?? null;
    },
  };
  const prev = globalThis.localStorage;
  globalThis.localStorage = ls;
  try {
    const o = buildInvaderSaveExportObject();
    assert.equal(o.v, 1);
    assert.equal(o.keys.invader_coins, '5');
  } finally {
    globalThis.localStorage = prev;
  }
});
