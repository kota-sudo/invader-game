export function getRequiredElement(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing required DOM element: #${id}`);
  return el;
}

export function getGameDomElements() {
  const canvas = getRequiredElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to acquire 2D canvas context');
  getRequiredElement('lives');
  return {
    canvas,
    ctx,
    stageEl: getRequiredElement('stage'),
    messageEl: getRequiredElement('message'),
    W: canvas.width,
    H: canvas.height,
  };
}
