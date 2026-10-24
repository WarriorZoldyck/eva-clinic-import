// Trabalho pesado da tomografia em segundo plano (não trava a tela)
import { loadDicomFiles } from './dicomVolumeLoader';
import { generateBoneIsosurface } from './marchingCubes';

self.onmessage = async (e) => {
  const { id, type, payload } = e.data;
  try {
    if (type === 'load') {
      const vol = await loadDicomFiles(payload.files, (p) => self.postMessage({ id, progress: p }));
      self.postMessage({ id, result: vol }, [vol.data.buffer]);
    } else if (type === 'bone') {
      const r = generateBoneIsosurface(payload.volume, payload.threshold, payload.step || 2);
      self.postMessage({ id, result: r }, [r.positions.buffer, r.normals.buffer]);
    }
  } catch (err) {
    self.postMessage({ id, error: err?.message || String(err) });
  }
};
