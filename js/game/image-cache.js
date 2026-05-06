const _imgCache = new Map();

export function getImage(src) {
  if (_imgCache.has(src)) return _imgCache.get(src);
  const img = new Image();
  img.src = src;
  _imgCache.set(src, img);
  return img;
}
