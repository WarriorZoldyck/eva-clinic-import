// Cliente do worker da tomografia. Cada tarefa abre um worker próprio e o encerra ao final.
function run(type, payload, onProgress, transfer = []) {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL('./cbct.worker.js', import.meta.url), { type: 'module' });
    w.onmessage = (e) => {
      const m = e.data;
      if (m.progress) { onProgress?.(m.progress); return; }
      w.terminate();
      if (m.error) reject(new Error(m.error));
      else resolve(m.result);
    };
    w.onerror = (err) => { w.terminate(); reject(new Error(err.message || 'Falha no processamento da tomografia.')); };
    w.postMessage({ id: 1, type, payload }, transfer);
  });
}

export const loadDicomInWorker = (files, onProgress) => run('load', { files: Array.from(files) }, onProgress);

// Envia uma cópia do volume (o original continua na tela para os cortes 2D)
export const boneInWorker = (volume, threshold, step = 2) => {
  const data = volume.data.slice();
  return run('bone', { volume: { dims: volume.dims, spacing: volume.spacing, data }, threshold, step }, null, [data.buffer]);
};
