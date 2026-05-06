export function createMessageController(messageEl) {
  return {
    showMessage(text) {
      if (text === null) messageEl.classList.add('hidden');
      else {
        messageEl.textContent = text;
        messageEl.classList.remove('hidden');
      }
    },
  };
}
