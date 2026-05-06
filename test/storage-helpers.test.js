import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readJsonObject, readJsonArray, safeLocalStorageSetItem } from '../js/game/storage-helpers.js';

beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => void store.set(k, String(v)),
    removeItem: (k) => void store.delete(k),
    _store: store,
  };
});

test('readJsonObject returns fallback when JSON is invalid', () => {
  globalThis.localStorage.setItem('bad', '{ not json');
  assert.deepEqual(readJsonObject('bad', { a: 1 }), { a: 1 });
});

test('readJsonObject returns fallback for non-object JSON', () => {
  globalThis.localStorage.setItem('arr', '[1,2]');
  assert.deepEqual(readJsonObject('arr', { z: 0 }), { z: 0 });
});

test('readJsonArray parses array or returns fallback', () => {
  globalThis.localStorage.setItem('list', '[1,2,3]');
  assert.deepEqual(readJsonArray('list', []), [1, 2, 3]);
  globalThis.localStorage.setItem('badlist', '{}');
  assert.deepEqual(readJsonArray('badlist', [9]), [9]);
});

test('safeLocalStorageSetItem returns false when storage throws', () => {
  globalThis.localStorage = {
    setItem() {
      throw new Error('quota');
    },
    getItem() {
      return null;
    },
  };
  assert.equal(safeLocalStorageSetItem('k', 'v'), false);
});
