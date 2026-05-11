/**
 * IAP クレジット画面の入力（数字のみ・桁数制限）
 */

export function digitFromKeyCode(code) {
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^Numpad[0-9]$/.test(code)) return code.slice(6);
  return null;
}

/** @param {{ card: string, exp: string, cvv: string }} form */
export function formatCardDisplay(form) {
  const d = (form.card || '').replace(/\D/g, '').slice(0, 16);
  const parts = [];
  for (let i = 0; i < d.length; i += 4) parts.push(d.slice(i, i + 4));
  return parts.join(' ') || ' ';
}

/** @param {{ card: string, exp: string, cvv: string }} form */
export function formatExpDisplay(form) {
  const d = (form.exp || '').replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)} / ${d.slice(2)}`;
}

/**
 * @param {'card'|'exp'|'cvv'} field
 * @param {string} ch single digit
 */
export function appendCcDigit(form, field, ch) {
  if (!/^\d$/.test(ch)) return;
  if (field === 'card') {
    const n = (form.card + ch).replace(/\D/g, '').slice(0, 16);
    form.card = n;
    return;
  }
  if (field === 'exp') {
    form.exp = (form.exp + ch).replace(/\D/g, '').slice(0, 4);
    return;
  }
  form.cvv = (form.cvv + ch).replace(/\D/g, '').slice(0, 4);
}

/** @param {'card'|'exp'|'cvv'} field */
export function backspaceCc(form, field) {
  const k = field;
  if (k === 'card') form.card = (form.card || '').slice(0, -1);
  else if (k === 'exp') form.exp = (form.exp || '').slice(0, -1);
  else form.cvv = (form.cvv || '').slice(0, -1);
}

export function cycleCcFocus(cur) {
  if (cur === 'card') return 'exp';
  if (cur === 'exp') return 'cvv';
  return 'card';
}

/** @param {{ card: string, exp: string, cvv: string }} form */
export function validateCcForm(form) {
  const card = (form.card || '').replace(/\D/g, '');
  const exp = (form.exp || '').replace(/\D/g, '');
  const cvv = (form.cvv || '').replace(/\D/g, '');
  if (card.length < 12) return 'カード番号を12桁以上入力してください';
  if (exp.length !== 4) return '有効期限を4桁（MMYY）で入力してください';
  if (cvv.length < 3) return 'セキュリティコードを3桁以上入力してください';
  return null;
}
