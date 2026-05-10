export function createMessageController(messageEl) {
  return {
    /** @param {string|null} text @param {{ a11yOnly?: boolean }} [opts] */
    showMessage(text, opts = {}) {
      messageEl.classList.remove('message-a11y-only');
      if (text === null) {
        messageEl.classList.add('hidden');
        return;
      }
      messageEl.textContent = text;
      messageEl.classList.remove('hidden');
      if (opts.a11yOnly) messageEl.classList.add('message-a11y-only');
    },
  };
}
