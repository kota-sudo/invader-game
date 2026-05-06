import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../js/app/escape-html.js';

test('escapeHtml neutralizes angle brackets and ampersands', () => {
  assert.equal(escapeHtml('<b>x</b>'), '&lt;b&gt;x&lt;/b&gt;');
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
});
