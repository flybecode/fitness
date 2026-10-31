// Fortschrittsbilder: Originale (verkleinert) in IndexedDB, kleine Vorschaubilder im State.

const DB = 'fitness-fotos';
const STORE = 'fotos';
let dbPromise = null;

function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}

export const putPhoto = (id, blob) => tx('readwrite', (s) => s.put(blob, id));
export const getPhoto = (id) => tx('readonly', (s) => s.get(id));
export const deletePhoto = (id) => tx('readwrite', (s) => s.delete(id));

// Lädt eine Bilddatei und liefert ein verkleinertes JPEG (Blob) und ein Vorschaubild (Data-URL).
export async function prepareImage(file, maxSide = 1600, thumbSide = 240) {
  const bitmap = await createImageBitmap(file);
  const draw = (side, quality) => {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return { canvas, quality };
  };
  const big = draw(maxSide, 0.85);
  const small = draw(thumbSide, 0.7);
  const blob = await new Promise((r) => big.canvas.toBlob(r, 'image/jpeg', big.quality));
  return { blob, thumb: small.canvas.toDataURL('image/jpeg', small.quality), base64: big.canvas.toDataURL('image/jpeg', big.quality).split(',')[1] };
}
